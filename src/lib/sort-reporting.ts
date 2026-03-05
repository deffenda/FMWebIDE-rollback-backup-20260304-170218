import type { FMRecord } from "./layout-model.ts";
import { calculateSummarySet, type SummarySpec } from "./summary-engine.ts";

export type TableSortDirection = "asc" | "desc";
export type TableSortMode = "standard" | "valueList";
export type TableSortEntry = {
  field: string;
  direction: TableSortDirection;
  mode: TableSortMode;
  valueList?: string[];
};
export type TableSummaryOperation = "count" | "sum" | "avg" | "min" | "max";
export type TableDisplayRow =
  | {
      kind: "record";
      key: string;
      record: FMRecord;
      originalIndex: number;
    }
  | {
      kind: "group";
      key: string;
      label: string;
      variant: "leading" | "trailing";
    }
  | {
      kind: "summary";
      key: string;
      label: string;
      values: Record<string, string>;
      variant: "leading" | "trailing" | "grand-leading" | "grand-trailing";
    };

type SortRow = {
  record: FMRecord;
  originalIndex: number;
  key: string;
};

export type BuildTableDisplayRowsOptions = {
  records: FMRecord[];
  fieldNames: string[];
  sort: TableSortEntry[];
  leadingGrandSummary: boolean;
  trailingGrandSummary: boolean;
  leadingGroupField: string | null;
  trailingGroupField: string | null;
  leadingSubtotals: Record<string, TableSummaryOperation[]>;
  trailingSubtotals: Record<string, TableSummaryOperation[]>;
  resolveValue?: (record: FMRecord, fieldName: string) => unknown;
};

function resolveRecordValue(record: FMRecord, fieldName: string): unknown {
  const direct = record[fieldName];
  if (direct !== undefined) {
    return direct;
  }
  const trimmed = fieldName.trim();
  if (!trimmed.includes("::")) {
    return "";
  }
  const unqualified = trimmed.split("::").pop() ?? trimmed;
  return record[unqualified] ?? "";
}

function comparableValue(value: unknown): { kind: "empty" | "number" | "text"; numberValue?: number; textValue?: string } {
  if (value == null || value === "") {
    return { kind: "empty" };
  }

  if (typeof value === "number") {
    return { kind: "number", numberValue: value };
  }

  if (typeof value === "boolean") {
    return { kind: "number", numberValue: value ? 1 : 0 };
  }

  const textValue = String(value).trim();
  if (!textValue) {
    return { kind: "empty" };
  }

  const numeric = Number(textValue.replace(/,/g, ""));
  if (Number.isFinite(numeric)) {
    return { kind: "number", numberValue: numeric };
  }

  return { kind: "text", textValue: textValue.toLowerCase() };
}

function compareComparableValues(
  left: ReturnType<typeof comparableValue>,
  right: ReturnType<typeof comparableValue>
): number {
  if (left.kind === "empty" && right.kind === "empty") {
    return 0;
  }
  if (left.kind === "empty") {
    return 1;
  }
  if (right.kind === "empty") {
    return -1;
  }

  if (left.kind === "number" && right.kind === "number") {
    return (left.numberValue ?? 0) - (right.numberValue ?? 0);
  }

  if (left.kind === "text" && right.kind === "text") {
    return (left.textValue ?? "").localeCompare(right.textValue ?? "", undefined, {
      numeric: true,
      sensitivity: "base"
    });
  }

  if (left.kind === "number") {
    return -1;
  }
  return 1;
}

function subtotalLabel(operation: TableSummaryOperation): string {
  if (operation === "count") {
    return "Count";
  }
  if (operation === "sum") {
    return "Sum";
  }
  if (operation === "avg") {
    return "Average";
  }
  if (operation === "min") {
    return "Min";
  }
  return "Max";
}

function makeSummaryValues(
  recordSet: FMRecord[],
  subtotalConfig: Record<string, TableSummaryOperation[]>,
  fieldNames: string[],
  resolver: (record: FMRecord, fieldName: string) => unknown,
  fallbackFirstFieldCount: boolean
): Record<string, string> {
  const values: Record<string, string> = {};
  const specs: SummarySpec[] = fieldNames
    .map((fieldName) => ({
      field: fieldName,
      operations: subtotalConfig[fieldName] ?? []
    }))
    .filter((entry) => entry.operations.length > 0);
  const summary = calculateSummarySet(
    {
      records: recordSet,
      resolveValue: resolver
    },
    specs
  );
  for (const fieldName of fieldNames) {
    const ops = subtotalConfig[fieldName] ?? [];
    if (ops.length === 0) {
      continue;
    }
    const chunks: string[] = [];
    for (const op of ops) {
      const rawValue = summary[fieldName]?.[op as keyof typeof summary[string]];
      if (rawValue == null) {
        chunks.push(`${subtotalLabel(op)}: -`);
      } else if (op === "avg") {
        chunks.push(`${subtotalLabel(op)}: ${Number(rawValue).toFixed(2)}`);
      } else {
        chunks.push(`${subtotalLabel(op)}: ${rawValue}`);
      }
    }
    values[fieldName] = chunks.join(" | ");
  }

  if (fallbackFirstFieldCount && fieldNames.length > 0 && Object.keys(values).length === 0) {
    values[fieldNames[0]] = `Count: ${recordSet.length}`;
  }

  return values;
}

export function sortRecordRows(
  records: FMRecord[],
  sortSpec: TableSortEntry[],
  resolveValue?: (record: FMRecord, fieldName: string) => unknown
): SortRow[] {
  const resolver = resolveValue ?? resolveRecordValue;
  const rows = records.map((record, originalIndex) => ({
    record,
    originalIndex,
    key: record.recordId ?? `row-${originalIndex}`
  }));

  if (sortSpec.length === 0) {
    return rows;
  }

  const next = [...rows];
  next.sort((leftRow, rightRow) => {
    for (const sortEntry of sortSpec) {
      const leftValue = resolver(leftRow.record, sortEntry.field);
      const rightValue = resolver(rightRow.record, sortEntry.field);
      let comparison = 0;

      if (sortEntry.mode === "valueList" && sortEntry.valueList && sortEntry.valueList.length > 0) {
        const order = new Map<string, number>();
        for (const [indexInList, entry] of sortEntry.valueList.entries()) {
          order.set(entry.toLowerCase(), indexInList);
        }
        const leftIndex = order.get(String(leftValue ?? "").trim().toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
        const rightIndex = order.get(String(rightValue ?? "").trim().toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
        comparison = leftIndex - rightIndex;
        if (comparison === 0) {
          comparison = compareComparableValues(comparableValue(leftValue), comparableValue(rightValue));
        }
      } else {
        comparison = compareComparableValues(comparableValue(leftValue), comparableValue(rightValue));
      }

      if (comparison !== 0) {
        return sortEntry.direction === "asc" ? comparison : -comparison;
      }
    }

    return leftRow.originalIndex - rightRow.originalIndex;
  });

  return next;
}

export function buildTableDisplayRows(options: BuildTableDisplayRowsOptions): TableDisplayRow[] {
  const resolver = options.resolveValue ?? resolveRecordValue;
  const sortedRecordRows = sortRecordRows(options.records, options.sort, resolver);
  const sortedRecords = sortedRecordRows.map((entry) => entry.record);
  const rows: TableDisplayRow[] = [];

  if (options.leadingGrandSummary && sortedRecords.length > 0) {
    rows.push({
      kind: "summary",
      key: "summary-grand-leading",
      label: "Leading Grand Summary",
      values: makeSummaryValues(
        sortedRecords,
        options.leadingSubtotals,
        options.fieldNames,
        resolver,
        true
      ),
      variant: "grand-leading"
    });
  }

  const effectiveGroupField = options.leadingGroupField || options.trailingGroupField;
  if (effectiveGroupField) {
    const grouped = new Map<string, SortRow[]>();
    for (const entry of sortedRecordRows) {
      const token = String(resolver(entry.record, effectiveGroupField) ?? "").trim() || "(blank)";
      if (!grouped.has(token)) {
        grouped.set(token, []);
      }
      grouped.get(token)?.push(entry);
    }

    let groupSequence = 0;
    for (const [groupValue, groupEntries] of grouped.entries()) {
      const groupRecords = groupEntries.map((entry) => entry.record);
      const groupLabel = `${effectiveGroupField}: ${groupValue}`;

      if (options.leadingGroupField === effectiveGroupField) {
        rows.push({
          kind: "group",
          key: `group-leading-${groupSequence}-${groupValue}`,
          label: groupLabel,
          variant: "leading"
        });
      }

      const hasLeadingSubtotalConfig = Object.values(options.leadingSubtotals).some((ops) => ops.length > 0);
      if (hasLeadingSubtotalConfig) {
        rows.push({
          kind: "summary",
          key: `summary-leading-${groupSequence}-${groupValue}`,
          label: `Leading Subtotal (${groupValue})`,
          values: makeSummaryValues(
            groupRecords,
            options.leadingSubtotals,
            options.fieldNames,
            resolver,
            false
          ),
          variant: "leading"
        });
      }

      for (const entry of groupEntries) {
        rows.push({
          kind: "record",
          key: `record-${entry.key}`,
          record: entry.record,
          originalIndex: entry.originalIndex
        });
      }

      const hasTrailingSubtotalConfig = Object.values(options.trailingSubtotals).some((ops) => ops.length > 0);
      if (hasTrailingSubtotalConfig) {
        rows.push({
          kind: "summary",
          key: `summary-trailing-${groupSequence}-${groupValue}`,
          label: `Trailing Subtotal (${groupValue})`,
          values: makeSummaryValues(
            groupRecords,
            options.trailingSubtotals,
            options.fieldNames,
            resolver,
            false
          ),
          variant: "trailing"
        });
      }

      if (options.trailingGroupField === effectiveGroupField) {
        rows.push({
          kind: "group",
          key: `group-trailing-${groupSequence}-${groupValue}`,
          label: groupLabel,
          variant: "trailing"
        });
      }
      groupSequence += 1;
    }
  } else {
    for (const entry of sortedRecordRows) {
      rows.push({
        kind: "record",
        key: `record-${entry.key}`,
        record: entry.record,
        originalIndex: entry.originalIndex
      });
    }
  }

  if (options.trailingGrandSummary && sortedRecords.length > 0) {
    rows.push({
      kind: "summary",
      key: "summary-grand-trailing",
      label: "Trailing Grand Summary",
      values: makeSummaryValues(
        sortedRecords,
        options.trailingSubtotals,
        options.fieldNames,
        resolver,
        true
      ),
      variant: "grand-trailing"
    });
  }

  return rows;
}

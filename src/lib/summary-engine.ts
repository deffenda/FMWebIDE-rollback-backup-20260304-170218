import type { FMRecord } from "./layout-model.ts";

export type SummaryOperation = "count" | "sum" | "avg" | "min" | "max";

export type SummarySpec = {
  field: string;
  operations: SummaryOperation[];
};

export type SummaryContext = {
  records: FMRecord[];
  resolveValue?: (record: FMRecord, fieldName: string) => unknown;
};

export type SummaryResult = Record<string, Record<SummaryOperation, number | null>>;

function resolveRecordValue(record: FMRecord, fieldName: string): unknown {
  const direct = record[fieldName];
  if (direct !== undefined) {
    return direct;
  }
  const normalized = fieldName.trim();
  if (!normalized.includes("::")) {
    return "";
  }
  const unqualified = normalized.split("::").pop() ?? normalized;
  return record[unqualified] ?? "";
}

function toNumeric(value: unknown): number | null {
  if (value == null || value === "") {
    return null;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function presentValueCount(
  records: FMRecord[],
  fieldName: string,
  resolver: (record: FMRecord, fieldName: string) => unknown
): number {
  let count = 0;
  for (const record of records) {
    const value = resolver(record, fieldName);
    if (value != null && value !== "") {
      count += 1;
    }
  }
  return count;
}

function numericValues(
  records: FMRecord[],
  fieldName: string,
  resolver: (record: FMRecord, fieldName: string) => unknown
): number[] {
  const values: number[] = [];
  for (const record of records) {
    const parsed = toNumeric(resolver(record, fieldName));
    if (parsed != null) {
      values.push(parsed);
    }
  }
  return values;
}

export function calculateSummaryOperation(
  context: SummaryContext,
  fieldName: string,
  operation: SummaryOperation
): number | null {
  const resolver = context.resolveValue ?? resolveRecordValue;
  if (operation === "count") {
    return presentValueCount(context.records, fieldName, resolver);
  }
  const values = numericValues(context.records, fieldName, resolver);
  if (values.length === 0) {
    return null;
  }
  if (operation === "sum") {
    return values.reduce((sum, value) => sum + value, 0);
  }
  if (operation === "avg") {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
  if (operation === "min") {
    return Math.min(...values);
  }
  return Math.max(...values);
}

export function calculateSummarySet(context: SummaryContext, specs: SummarySpec[]): SummaryResult {
  const result: SummaryResult = {};
  for (const spec of specs) {
    const field = spec.field.trim();
    if (!field) {
      continue;
    }
    const operations = new Set(spec.operations);
    const fieldResult: Record<SummaryOperation, number | null> = {
      count: null,
      sum: null,
      avg: null,
      min: null,
      max: null
    };
    for (const operation of operations) {
      fieldResult[operation] = calculateSummaryOperation(context, field, operation);
    }
    result[field] = fieldResult;
  }
  return result;
}

export function calculateGroupedSummarySet(
  context: SummaryContext,
  groupField: string,
  specs: SummarySpec[]
): Record<string, SummaryResult> {
  const resolver = context.resolveValue ?? resolveRecordValue;
  const grouped = new Map<string, FMRecord[]>();
  for (const record of context.records) {
    const key = String(resolver(record, groupField) ?? "").trim() || "(blank)";
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)?.push(record);
  }

  const result: Record<string, SummaryResult> = {};
  for (const [groupValue, groupRecords] of grouped.entries()) {
    result[groupValue] = calculateSummarySet(
      {
        records: groupRecords,
        resolveValue: resolver
      },
      specs
    );
  }
  return result;
}

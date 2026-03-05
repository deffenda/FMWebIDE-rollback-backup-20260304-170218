export type PortalSortOrder = "ascending" | "descending" | "custom";

export type PortalSortRule = {
  field: string;
  order: PortalSortOrder;
  valueList?: string;
};

type RawPortalSortRule =
  | {
      field?: unknown;
      order?: unknown;
      valueList?: unknown;
    }
  | null
  | undefined;

export type PortalRowRange = {
  from: number;
  to: number;
  count: number;
};

type PortalRowRangeSource = {
  repetitionsFrom?: unknown;
  repetitionsTo?: unknown;
};

function parsePositiveInteger(value: unknown, fallback: number): number {
  const numeric = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }
  return Math.round(numeric);
}

// FileMaker portal "Number of rows" maps to repetitionsFrom..repetitionsTo.
// The range determines visible portal rows in both layout and browse contexts.
export function resolvePortalRowRange(source: PortalRowRangeSource | null | undefined): PortalRowRange {
  const from = parsePositiveInteger(source?.repetitionsFrom, 1);
  const to = Math.max(from, parsePositiveInteger(source?.repetitionsTo, from));
  return {
    from,
    to,
    count: Math.max(1, to - from + 1)
  };
}

export function unqualifiedFieldName(fieldName: string): string {
  const parts = fieldName.split("::");
  return parts[parts.length - 1]?.trim() ?? fieldName.trim();
}

export function normalizePortalSortRules(rules: RawPortalSortRule[] | undefined): PortalSortRule[] {
  if (!Array.isArray(rules)) {
    return [];
  }
  const normalized: PortalSortRule[] = [];
  const seenFields = new Set<string>();
  for (const rawRule of rules) {
    if (!rawRule || typeof rawRule !== "object") {
      continue;
    }
    const field = String(rawRule.field ?? "").trim();
    if (!field) {
      continue;
    }
    const fieldKey = field.toLowerCase();
    if (seenFields.has(fieldKey)) {
      continue;
    }
    seenFields.add(fieldKey);
    const order: PortalSortOrder =
      rawRule.order === "descending" || rawRule.order === "custom" ? rawRule.order : "ascending";
    const valueList = String(rawRule.valueList ?? "").trim();
    normalized.push({
      field,
      order,
      valueList: valueList || undefined
    });
  }
  return normalized;
}

export function resolvePortalSortFieldValue(
  record: Record<string, unknown> | null | undefined,
  fieldName: string
): unknown {
  if (!record) {
    return "";
  }
  const normalizedField = fieldName.trim();
  if (!normalizedField) {
    return "";
  }
  if (record[normalizedField] != null) {
    return record[normalizedField];
  }
  const unqualified = unqualifiedFieldName(normalizedField);
  if (record[unqualified] != null) {
    return record[unqualified];
  }
  const normalizedFieldLower = normalizedField.toLowerCase();
  const unqualifiedLower = unqualified.toLowerCase();
  for (const [key, value] of Object.entries(record)) {
    if (value == null) {
      continue;
    }
    const keyLower = key.trim().toLowerCase();
    if (keyLower === normalizedFieldLower || keyLower === unqualifiedLower) {
      return value;
    }
    if (unqualifiedFieldName(key).toLowerCase() === unqualifiedLower) {
      return value;
    }
  }
  return "";
}

export function comparePortalSortValues(a: unknown, b: unknown): number {
  const aText = String(a ?? "").trim();
  const bText = String(b ?? "").trim();

  if (!aText && !bText) {
    return 0;
  }

  const aNumber = Number(aText.replace(/,/g, ""));
  const bNumber = Number(bText.replace(/,/g, ""));
  if (aText !== "" && bText !== "" && Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
    if (aNumber < bNumber) {
      return -1;
    }
    if (aNumber > bNumber) {
      return 1;
    }
    return 0;
  }

  const aDate = Date.parse(aText);
  const bDate = Date.parse(bText);
  if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) {
    if (aDate < bDate) {
      return -1;
    }
    if (aDate > bDate) {
      return 1;
    }
    return 0;
  }

  return aText.localeCompare(bText, undefined, { numeric: true, sensitivity: "base" });
}

export function sortPortalRowsForPreview(
  rows: Array<Record<string, unknown>>,
  rules: PortalSortRule[],
  valueListByName: Map<string, readonly string[]>
): Array<Record<string, unknown>> {
  const normalizedRules = normalizePortalSortRules(rules);
  if (normalizedRules.length === 0 || rows.length <= 1) {
    return rows;
  }

  const customRankByRule = new Map<number, Map<string, number>>();
  normalizedRules.forEach((rule, index) => {
    if (rule.order !== "custom") {
      return;
    }
    const valueListName = (rule.valueList ?? "").trim();
    if (!valueListName) {
      return;
    }
    const values = valueListByName.get(valueListName) ?? [];
    if (values.length === 0) {
      return;
    }
    const rankMap = new Map<string, number>();
    values.forEach((value, valueIndex) => {
      const key = value.trim().toLowerCase();
      if (!rankMap.has(key)) {
        rankMap.set(key, valueIndex);
      }
    });
    customRankByRule.set(index, rankMap);
  });

  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      for (let ruleIndex = 0; ruleIndex < normalizedRules.length; ruleIndex += 1) {
        const rule = normalizedRules[ruleIndex];
        const leftValue = resolvePortalSortFieldValue(a.row, rule.field);
        const rightValue = resolvePortalSortFieldValue(b.row, rule.field);

        let comparison = 0;
        if (rule.order === "custom") {
          const rankMap = customRankByRule.get(ruleIndex);
          if (rankMap && rankMap.size > 0) {
            const leftRank = rankMap.get(String(leftValue ?? "").trim().toLowerCase());
            const rightRank = rankMap.get(String(rightValue ?? "").trim().toLowerCase());
            const fallbackRank = rankMap.size + 1_000;
            const safeLeft = leftRank ?? fallbackRank;
            const safeRight = rightRank ?? fallbackRank;
            if (safeLeft !== safeRight) {
              comparison = safeLeft - safeRight;
            } else {
              comparison = comparePortalSortValues(leftValue, rightValue);
            }
          } else {
            comparison = comparePortalSortValues(leftValue, rightValue);
          }
        } else {
          comparison = comparePortalSortValues(leftValue, rightValue);
          if (rule.order === "descending") {
            comparison *= -1;
          }
        }

        if (comparison !== 0) {
          return comparison;
        }
      }
      return a.index - b.index;
    })
    .map((entry) => entry.row);
}

export function resolvePortalActiveRowToken(
  rows: Array<Record<string, unknown>>,
  options?: {
    initialRow?: number;
    existingToken?: string;
  }
): string {
  if (!rows.length) {
    return "";
  }
  const existingToken = String(options?.existingToken ?? "").trim();
  if (existingToken) {
    const hasMatchingRow = rows.some((row, index) => {
      const recordIdToken = String(row.recordId ?? "").trim();
      return recordIdToken === existingToken || `index-${index}` === existingToken;
    });
    if (hasMatchingRow) {
      return existingToken;
    }
  }
  const requestedInitial = Math.round(Number(options?.initialRow ?? 1) || 1);
  const safeInitialIndex = Math.max(0, Math.min(rows.length - 1, requestedInitial - 1));
  return String(rows[safeInitialIndex]?.recordId ?? "").trim() || `index-${safeInitialIndex}`;
}

function normalizePortalRowFieldNames(rowFields: string[]): string[] {
  const normalized: string[] = [];
  const seen = new Set<string>();
  for (const fieldName of rowFields) {
    const trimmed = fieldName.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalized.push(trimmed);
  }
  return normalized;
}

function availableFieldOrderMap(availableFieldNames: string[]): Map<string, number> {
  const orderMap = new Map<string, number>();
  availableFieldNames.forEach((fieldName, index) => {
    const normalized = fieldName.trim().toLowerCase();
    if (!normalized || orderMap.has(normalized)) {
      return;
    }
    orderMap.set(normalized, index);
  });
  return orderMap;
}

export function addPortalRowFields(
  currentRowFields: string[],
  fieldsToAdd: string[],
  availableFieldNames: string[]
): string[] {
  const next = normalizePortalRowFieldNames(currentRowFields);
  const existing = new Set(next.map((fieldName) => fieldName.toLowerCase()));
  const availableOrder = availableFieldOrderMap(availableFieldNames);
  const additions = normalizePortalRowFieldNames(fieldsToAdd).sort((left, right) => {
    const leftOrder = availableOrder.get(left.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = availableOrder.get(right.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return left.localeCompare(right, undefined, { sensitivity: "base", numeric: true });
  });
  for (const fieldName of additions) {
    const key = fieldName.toLowerCase();
    if (existing.has(key)) {
      continue;
    }
    existing.add(key);
    next.push(fieldName);
  }
  return next;
}

export function removePortalRowFields(currentRowFields: string[], fieldsToRemove: string[]): string[] {
  const removeSet = new Set(normalizePortalRowFieldNames(fieldsToRemove).map((fieldName) => fieldName.toLowerCase()));
  if (removeSet.size === 0) {
    return normalizePortalRowFieldNames(currentRowFields);
  }
  return normalizePortalRowFieldNames(currentRowFields).filter((fieldName) => !removeSet.has(fieldName.toLowerCase()));
}

export function movePortalRowFields(
  currentRowFields: string[],
  selectedFields: string[],
  direction: "up" | "down"
): string[] {
  const rows = normalizePortalRowFieldNames(currentRowFields);
  if (rows.length <= 1) {
    return rows;
  }
  const selected = new Set(normalizePortalRowFieldNames(selectedFields).map((fieldName) => fieldName.toLowerCase()));
  if (selected.size === 0) {
    return rows;
  }

  const next = [...rows];
  if (direction === "up") {
    for (let index = 1; index < next.length; index += 1) {
      const currentSelected = selected.has(next[index].toLowerCase());
      const previousSelected = selected.has(next[index - 1].toLowerCase());
      if (currentSelected && !previousSelected) {
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
      }
    }
    return next;
  }

  for (let index = next.length - 2; index >= 0; index -= 1) {
    const currentSelected = selected.has(next[index].toLowerCase());
    const nextSelected = selected.has(next[index + 1].toLowerCase());
    if (currentSelected && !nextSelected) {
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
    }
  }
  return next;
}

export function coercePortalBoolean(value: unknown, defaultValue: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const token = value.trim().toLowerCase();
    if (!token) {
      return defaultValue;
    }
    if (token === "true" || token === "1" || token === "yes" || token === "on") {
      return true;
    }
    if (token === "false" || token === "0" || token === "no" || token === "off") {
      return false;
    }
    return defaultValue;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  return defaultValue;
}

export type PortalSetupDraft = {
  tableOccurrence: string;
  fallbackTableOccurrence?: string;
  sortRecords: boolean;
  filterRecords: boolean;
  allowDelete: boolean;
  allowVerticalScrolling: boolean;
  scrollBar: "always" | "whenScrolling" | "never";
  resetScrollOnExit: boolean;
  initialRowInput: string;
  rowsInput: string;
  useAlternateRowState: boolean;
  useActiveRowState: boolean;
  rowFields: string[];
  sortRules: PortalSortRule[];
  sortReorderBySummary: boolean;
  sortSummaryField: string;
  sortOverrideLanguage: boolean;
  sortLanguage: string;
  availableFieldNames: string[];
};

export type SanitizedPortalSetup = {
  tableOccurrence: string;
  props: {
    portalSortRecords: boolean;
    portalFilterRecords: boolean;
    portalAllowDelete: boolean;
    portalAllowVerticalScrolling: boolean;
    portalScrollBar: "always" | "whenScrolling" | "never";
    portalResetScrollOnExit: boolean;
    portalInitialRow: number;
    repetitionsFrom: number;
    repetitionsTo: number;
    portalUseAlternateRowState: boolean;
    portalUseActiveRowState: boolean;
    portalRowFields: string[];
    portalSortRules: PortalSortRule[];
    portalSortReorderBySummary: boolean;
    portalSortSummaryField: string;
    portalSortOverrideLanguage: boolean;
    portalSortLanguage: string;
  };
};

export function sanitizePortalSetupDraft(draft: PortalSetupDraft): SanitizedPortalSetup {
  const rows = Number.parseInt(draft.rowsInput, 10);
  const initialRow = Number.parseInt(draft.initialRowInput, 10);
  const safeRows = Number.isFinite(rows) && rows > 0 ? rows : 6;
  const safeInitialRow = Number.isFinite(initialRow) && initialRow > 0 ? initialRow : 1;
  const normalizedTableOccurrence =
    draft.tableOccurrence.trim() || (draft.fallbackTableOccurrence ?? "").trim();

  const normalizedRowFields = [...new Set(draft.rowFields.map((entry) => entry.trim()).filter((entry) => entry.length > 0))];
  const availableFieldSet = new Set(
    draft.availableFieldNames
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0)
  );

  // Preserve explicit row-field choices even when live field catalogs are incomplete
  // (for example related TO metadata gaps). Dropping unknown fields causes silent
  // loss from portal definitions after save.
  const filteredRowFields = normalizedRowFields;

  const filteredSortRules = normalizePortalSortRules(draft.sortRules).filter((rule) => {
    if (availableFieldSet.size === 0) {
      return true;
    }
    return availableFieldSet.has(rule.field.toLowerCase());
  });

  const allowVerticalScrolling = draft.allowVerticalScrolling;
  const portalScrollBar = allowVerticalScrolling ? draft.scrollBar : "never";
  const portalResetScrollOnExit = allowVerticalScrolling ? draft.resetScrollOnExit : false;

  return {
    tableOccurrence: normalizedTableOccurrence,
    props: {
      portalSortRecords: draft.sortRecords,
      portalFilterRecords: draft.filterRecords,
      portalAllowDelete: draft.allowDelete,
      portalAllowVerticalScrolling: allowVerticalScrolling,
      portalScrollBar,
      portalResetScrollOnExit,
      portalInitialRow: safeInitialRow,
      repetitionsFrom: 1,
      repetitionsTo: safeRows,
      portalUseAlternateRowState: draft.useAlternateRowState,
      portalUseActiveRowState: draft.useActiveRowState,
      portalRowFields: filteredRowFields,
      portalSortRules: filteredSortRules,
      portalSortReorderBySummary: draft.sortReorderBySummary,
      portalSortSummaryField: draft.sortSummaryField.trim(),
      portalSortOverrideLanguage: draft.sortOverrideLanguage,
      portalSortLanguage: draft.sortLanguage.trim() || "English"
    }
  };
}

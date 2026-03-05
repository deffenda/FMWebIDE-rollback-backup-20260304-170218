import type { FMRecord } from "./layout-model.ts";

export type FindCriteriaMap = Record<string, string>;

export type FindRequestState = {
  id: string;
  criteria: FindCriteriaMap;
  omit: boolean;
};

export type FindExecutionMode = "replace" | "constrain" | "extend";

export type FileMakerFindSortRule = {
  fieldName: string;
  sortOrder: "ascend" | "descend";
};

export type FileMakerFindPayload = {
  query: Array<Record<string, unknown>>;
  limit?: number;
  offset?: number;
  sort?: FileMakerFindSortRule[];
};

export type ApplyFindRequestsResult = {
  normalizedRequests: FindRequestState[];
  includeRequests: FindRequestState[];
  omitRequests: FindRequestState[];
  records: FMRecord[];
};

function nextRequestId(): string {
  return `find-request-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createFindRequest(initial?: Partial<FindRequestState>): FindRequestState {
  return {
    id: initial?.id?.trim() || nextRequestId(),
    criteria: initial?.criteria ?? {},
    omit: initial?.omit === true
  };
}

export function normalizeFindCriteriaMap(criteria: FindCriteriaMap): FindCriteriaMap {
  return Object.fromEntries(
    Object.entries(criteria)
      .map(([field, value]) => [field.trim(), String(value ?? "").trim()])
      .filter(([field, value]) => field.length > 0 && value.length > 0)
  );
}

export function normalizeFindRequests(requests: FindRequestState[]): FindRequestState[] {
  return requests.map((request) => ({
    ...request,
    id: request.id?.trim() || nextRequestId(),
    criteria: normalizeFindCriteriaMap(request.criteria),
    omit: Boolean(request.omit)
  }));
}

export function summarizeFindRequests(requests: FindRequestState[]): string {
  const summaries: string[] = [];
  for (const request of requests) {
    const criteria = normalizeFindCriteriaMap(request.criteria);
    const pairs = Object.entries(criteria);
    if (pairs.length === 0) {
      if (request.omit) {
        summaries.push("Omit <empty>");
      }
      continue;
    }
    const criteriaSummary = pairs
      .map(([fieldName, value]) => `${fieldName}: ${value}`)
      .join(", ");
    summaries.push(request.omit ? `Omit (${criteriaSummary})` : `Include (${criteriaSummary})`);
  }
  if (summaries.length === 0) {
    return "<No criteria>";
  }
  return summaries.join(" OR ");
}

function compareComparableValues(
  left: { kind: "empty" | "number" | "text"; numberValue?: number; textValue?: string },
  right: { kind: "empty" | "number" | "text"; numberValue?: number; textValue?: string }
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

function parseFindDateToken(value: string): number | null {
  const token = value.trim();
  if (!token) {
    return null;
  }
  const parsed = Date.parse(token);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  const date = new Date(parsed);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function compareFindValues(left: string, right: string): number {
  const leftDate = parseFindDateToken(left);
  const rightDate = parseFindDateToken(right);
  if (leftDate != null && rightDate != null) {
    return leftDate - rightDate;
  }
  return compareComparableValues(comparableValue(left), comparableValue(right));
}

function normalizeFindCriterionValue(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "1" : "";
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry ?? "").trim())
      .filter((entry) => entry.length > 0)
      .join("\n");
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const directValue = record.value ?? record.displayValue ?? "";
    return String(directValue ?? "");
  }
  return String(value);
}

function mergeFieldValue(record: FMRecord, fieldName: string): unknown {
  const direct = record[fieldName];
  if (direct !== undefined && direct !== null) {
    return direct;
  }
  const trimmed = fieldName.trim();
  if (!trimmed.includes("::")) {
    return "";
  }
  const unqualified = trimmed.split("::").pop() ?? trimmed;
  return record[unqualified] ?? "";
}

function escapeRegexToken(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildWildcardFindPattern(term: string): RegExp {
  let pattern = "^";
  for (let index = 0; index < term.length; index += 1) {
    const token = term[index] ?? "";
    if (token === "\\") {
      const nextToken = term[index + 1];
      if (nextToken) {
        pattern += escapeRegexToken(nextToken);
        index += 1;
      } else {
        pattern += "\\\\";
      }
      continue;
    }
    if (token === "*") {
      pattern += ".*";
      continue;
    }
    if (token === "@") {
      pattern += ".";
      continue;
    }
    if (token === "#") {
      pattern += "\\d";
      continue;
    }
    pattern += escapeRegexToken(token);
  }
  pattern += "$";
  return new RegExp(pattern, "i");
}

function matchesSingleFindTerm(rawValue: string, rawTerm: string): boolean {
  const value = rawValue.trim();
  const term = rawTerm.trim();
  if (!term) {
    return true;
  }

  if (term === "?") {
    return value.length > 0 && parseFindDateToken(value) == null;
  }
  if (term.startsWith("!") && term.length > 1) {
    return !matchesSingleFindTerm(value, term.slice(1));
  }
  if (term === "//") {
    const valueDate = parseFindDateToken(value);
    if (valueDate == null) {
      return false;
    }
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return valueDate === today;
  }

  const phraseAnywhereMatch = term.match(/^\*"(.*)"$/);
  if (phraseAnywhereMatch) {
    const phrase = (phraseAnywhereMatch[1] ?? "").trim();
    if (!phrase) {
      return false;
    }
    return value.toLowerCase().includes(phrase.toLowerCase());
  }

  const phraseWordStartMatch = term.match(/^"(.*)"$/);
  if (phraseWordStartMatch) {
    const phrase = (phraseWordStartMatch[1] ?? "").trim();
    if (!phrase) {
      return false;
    }
    const wordStartPattern = new RegExp(`(^|\\b)${escapeRegexToken(phrase)}`, "i");
    return wordStartPattern.test(value);
  }

  if (term.startsWith("'") && term.endsWith("'") && term.length >= 2) {
    const exact = term.slice(1, -1).trim();
    if (!exact) {
      return false;
    }
    return value.toLowerCase() === exact.toLowerCase();
  }

  const rangeIndex = term.indexOf("...");
  if (rangeIndex >= 0) {
    const from = term.slice(0, rangeIndex).trim();
    const to = term.slice(rangeIndex + 3).trim();
    if (!from && !to) {
      return true;
    }
    if (from && compareFindValues(value, from) < 0) {
      return false;
    }
    if (to && compareFindValues(value, to) > 0) {
      return false;
    }
    return true;
  }

  const comparisonMatch = term.match(/^(<=|>=|<|>)(.*)$/);
  if (comparisonMatch) {
    const operator = comparisonMatch[1];
    const compareToken = comparisonMatch[2]?.trim() ?? "";
    if (!compareToken) {
      return false;
    }
    const comparison = compareFindValues(value, compareToken);
    if (operator === "<=") {
      return comparison <= 0;
    }
    if (operator === ">=") {
      return comparison >= 0;
    }
    if (operator === "<") {
      return comparison < 0;
    }
    return comparison > 0;
  }

  if (term.startsWith("==")) {
    const exact = term.slice(2).trim().toLowerCase();
    return value.toLowerCase() === exact;
  }

  if (term.startsWith("=")) {
    const wholeWord = term.slice(1).trim();
    if (!wholeWord) {
      return value.length === 0;
    }
    const wholeWordPattern = new RegExp(`(^|\\b)${escapeRegexToken(wholeWord)}(\\b|$)`, "i");
    return wholeWordPattern.test(value);
  }

  if (term.includes("\\") || term.includes("*") || term.includes("@") || term.includes("#")) {
    return buildWildcardFindPattern(term).test(value);
  }

  return value.toLowerCase().includes(term.toLowerCase());
}

function matchesFindCriterion(value: unknown, criterion: string): boolean {
  const normalizedCriterion = String(criterion ?? "").trim();
  if (!normalizedCriterion) {
    return true;
  }

  const valueText = normalizeFindCriterionValue(value);
  const terms = normalizedCriterion
    .split(/\r?\n/g)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (terms.length === 0) {
    return true;
  }

  return terms.some((term) => matchesSingleFindTerm(valueText, term));
}

function buildDuplicateFindFieldValueMap(
  records: FMRecord[],
  criteria: FindCriteriaMap
): Map<string, Set<string>> {
  const duplicateFields = Object.entries(criteria)
    .filter(([, criterion]) => String(criterion ?? "").trim() === "!")
    .map(([fieldName]) => fieldName);
  if (duplicateFields.length === 0) {
    return new Map();
  }
  const byField = new Map<string, Set<string>>();
  for (const fieldName of duplicateFields) {
    const counts = new Map<string, number>();
    for (const record of records) {
      const value = normalizeFindCriterionValue(mergeFieldValue(record, fieldName)).trim().toLowerCase();
      if (!value) {
        continue;
      }
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    const duplicates = new Set<string>();
    for (const [value, count] of counts.entries()) {
      if (count > 1) {
        duplicates.add(value);
      }
    }
    byField.set(fieldName, duplicates);
  }
  return byField;
}

export function recordMatchesFindCriteria(
  record: FMRecord,
  criteria: FindCriteriaMap,
  duplicateFieldValueMap?: Map<string, Set<string>>
): boolean {
  for (const [fieldName, criterion] of Object.entries(criteria)) {
    const normalizedCriterion = String(criterion ?? "").trim();
    if (!normalizedCriterion) {
      continue;
    }
    const fieldValue = mergeFieldValue(record, fieldName);
    if (normalizedCriterion === "!") {
      const duplicates = duplicateFieldValueMap?.get(fieldName);
      const normalizedFieldValue = normalizeFindCriterionValue(fieldValue).trim().toLowerCase();
      if (!duplicates || !normalizedFieldValue || !duplicates.has(normalizedFieldValue)) {
        return false;
      }
      continue;
    }
    if (!matchesFindCriterion(fieldValue, normalizedCriterion)) {
      return false;
    }
  }
  return true;
}

export function applyFindRequestsOnRecords(
  sourceRecords: FMRecord[],
  requests: FindRequestState[]
): ApplyFindRequestsResult {
  const normalizedRequests = normalizeFindRequests(requests);
  const includeRequests = normalizedRequests.filter(
    (request) => !request.omit && Object.keys(request.criteria).length > 0
  );
  const omitRequests = normalizedRequests.filter(
    (request) => request.omit && Object.keys(request.criteria).length > 0
  );

  const includeDuplicateMaps = includeRequests.map((request) =>
    buildDuplicateFindFieldValueMap(sourceRecords, request.criteria)
  );
  const omitDuplicateMaps = omitRequests.map((request) =>
    buildDuplicateFindFieldValueMap(sourceRecords, request.criteria)
  );

  let filtered = includeRequests.length > 0
    ? sourceRecords.filter((record) =>
        includeRequests.some((request, requestIndex) =>
          recordMatchesFindCriteria(record, request.criteria, includeDuplicateMaps[requestIndex])
        )
      )
    : sourceRecords;

  if (omitRequests.length > 0) {
    filtered = filtered.filter(
      (record) =>
        !omitRequests.some((request, requestIndex) =>
          recordMatchesFindCriteria(record, request.criteria, omitDuplicateMaps[requestIndex])
        )
    );
  }

  return {
    normalizedRequests,
    includeRequests,
    omitRequests,
    records: filtered
  };
}

export function constrainFoundSetRecordIds(currentRecordIds: string[], nextRecordIds: string[]): string[] {
  const nextSet = new Set(nextRecordIds.map((entry) => entry.trim()).filter((entry) => entry.length > 0));
  const constrained: string[] = [];
  for (const recordId of currentRecordIds) {
    const normalized = recordId.trim();
    if (!normalized || !nextSet.has(normalized)) {
      continue;
    }
    constrained.push(normalized);
  }
  return constrained;
}

export function extendFoundSetRecordIds(currentRecordIds: string[], nextRecordIds: string[]): string[] {
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const recordId of [...currentRecordIds, ...nextRecordIds]) {
    const normalized = recordId.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    merged.push(normalized);
  }
  return merged;
}

export function buildFileMakerFindPayload(options: {
  requests: FindRequestState[];
  executionMode?: FindExecutionMode;
  limit?: number;
  offset?: number;
  sort?: FileMakerFindSortRule[];
}): FileMakerFindPayload | null {
  const normalized = normalizeFindRequests(options.requests);
  const query = normalized
    .map((request) => {
      const criteria = normalizeFindCriteriaMap(request.criteria);
      if (Object.keys(criteria).length === 0) {
        return null;
      }
      const queryEntry: Record<string, unknown> = {
        ...criteria
      };
      if (request.omit) {
        queryEntry.omit = "true";
      }
      return queryEntry;
    })
    .filter((entry): entry is Record<string, unknown> => Boolean(entry));

  if (query.length === 0) {
    return null;
  }

  const payload: FileMakerFindPayload = {
    query
  };
  if (typeof options.limit === "number" && Number.isFinite(options.limit)) {
    payload.limit = Math.max(1, Math.round(options.limit));
  }
  if (typeof options.offset === "number" && Number.isFinite(options.offset)) {
    payload.offset = Math.max(1, Math.round(options.offset));
  }
  if (Array.isArray(options.sort) && options.sort.length > 0) {
    payload.sort = options.sort;
  }
  return payload;
}

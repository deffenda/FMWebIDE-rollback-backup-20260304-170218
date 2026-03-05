export type TableSortDirection = "asc" | "desc";
export type TableSortMode = "standard" | "valueList";

export type TableSortEntry = {
  field: string;
  direction: TableSortDirection;
  mode: TableSortMode;
  valueList?: string[];
  valueListName?: string;
};

function dedupeCaseInsensitiveStrings(values: string[]): string[] {
  const output: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const token = String(value ?? "").trim();
    if (!token) {
      continue;
    }
    const normalized = token.toLowerCase();
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    output.push(token);
  }
  return output;
}

export function resolveOrderedTableFieldNames(
  visibleViewFieldNames: string[],
  tableColumnOrder: string[],
  hiddenTableFields: string[]
): string[] {
  const visible = dedupeCaseInsensitiveStrings(visibleViewFieldNames);
  if (visible.length === 0) {
    return [];
  }
  const visibleSet = new Set(visible.map((entry) => entry.toLowerCase()));
  const ordered = dedupeCaseInsensitiveStrings(tableColumnOrder).filter((entry) =>
    visibleSet.has(entry.toLowerCase())
  );
  const seen = new Set(ordered.map((entry) => entry.toLowerCase()));
  const hiddenSet = new Set(hiddenTableFields.map((entry) => String(entry ?? "").trim().toLowerCase()));
  return [...ordered, ...visible.filter((entry) => !seen.has(entry.toLowerCase()))].filter(
    (entry) => !hiddenSet.has(entry.toLowerCase())
  );
}

export function toggleHeaderSort(
  previous: TableSortEntry[],
  fieldName: string,
  withShiftKey: boolean
): TableSortEntry[] {
  const field = String(fieldName ?? "").trim();
  if (!field) {
    return previous;
  }
  const current = previous.find((entry) => entry.field === field);
  if (withShiftKey) {
    if (!current) {
      return [...previous, { field, direction: "asc", mode: "standard" }];
    }
    return previous.map((entry) =>
      entry.field === field
        ? {
            ...entry,
            direction: entry.direction === "asc" ? "desc" : "asc"
          }
        : entry
    );
  }
  if (!current) {
    return [{ field, direction: "asc", mode: "standard" }];
  }
  if (current.direction === "asc") {
    return [{ ...current, direction: "desc" }];
  }
  return [];
}

export function parseTableColumnConfigInput(
  input: string,
  visibleViewFieldNames: string[]
): {
  order: string[];
  hidden: string[];
} {
  const tokens = String(input ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  const visibleByLower = new Map(
    dedupeCaseInsensitiveStrings(visibleViewFieldNames).map((fieldName) => [fieldName.toLowerCase(), fieldName])
  );
  const order: string[] = [];
  const hidden: string[] = [];
  for (const token of tokens) {
    const isHidden = token.startsWith("-");
    const rawField = isHidden ? token.slice(1).trim() : token;
    if (!rawField) {
      continue;
    }
    const canonical = visibleByLower.get(rawField.toLowerCase());
    if (!canonical) {
      continue;
    }
    if (!order.some((entry) => entry.toLowerCase() === canonical.toLowerCase())) {
      order.push(canonical);
    }
    if (isHidden && !hidden.some((entry) => entry.toLowerCase() === canonical.toLowerCase())) {
      hidden.push(canonical);
    }
  }
  return {
    order,
    hidden
  };
}

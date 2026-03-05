export type SpecifyFieldCatalogEntry = {
  name: string;
  type: string;
};

export type SpecifyFieldViewBy = "creation" | "name" | "type";

export type SpecifyFieldTableGroups = {
  current: string;
  related: string[];
  unrelated: string[];
};

export type SpecifyFieldLabelPlacement = "left" | "top" | "none";

export type SpecifyFieldLabelRectInput = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SpecifyFieldLabelRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function sortSpecifyFieldCatalogEntries(
  entries: SpecifyFieldCatalogEntry[],
  viewBy: SpecifyFieldViewBy
): SpecifyFieldCatalogEntry[] {
  const normalized = [...entries];
  if (viewBy === "creation") {
    return normalized;
  }
  if (viewBy === "name") {
    return normalized.sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));
  }
  return normalized.sort((left, right) => {
    const typeDiff = left.type.localeCompare(right.type, undefined, { sensitivity: "base" });
    if (typeDiff !== 0) {
      return typeDiff;
    }
    return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
  });
}

export function groupSpecifyFieldTableOccurrences(
  currentTableOccurrence: string,
  relatedTableOccurrences: string[],
  allTableOccurrences: string[]
): SpecifyFieldTableGroups {
  const current = normalizeText(currentTableOccurrence);
  const currentKey = current.toLowerCase();
  const relatedKeys = new Set<string>();
  const related: string[] = [];

  for (const tableOccurrence of relatedTableOccurrences) {
    const normalized = normalizeText(tableOccurrence);
    if (!normalized) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (key === currentKey || relatedKeys.has(key)) {
      continue;
    }
    relatedKeys.add(key);
    related.push(normalized);
  }

  const unrelated: string[] = [];
  const seen = new Set<string>();
  for (const tableOccurrence of allTableOccurrences) {
    const normalized = normalizeText(tableOccurrence);
    if (!normalized) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    if (key === currentKey || relatedKeys.has(key)) {
      continue;
    }
    unrelated.push(normalized);
  }

  return {
    current,
    related,
    unrelated
  };
}

export function computeSpecifyFieldLabelRect(
  field: SpecifyFieldLabelRectInput,
  placement: SpecifyFieldLabelPlacement,
  partTop: number,
  partBottom: number
): SpecifyFieldLabelRect | null {
  if (placement === "none") {
    return null;
  }
  const safePartTop = Math.max(0, Number.isFinite(partTop) ? partTop : 0);
  const safePartBottom = Math.max(safePartTop + 20, Number.isFinite(partBottom) ? partBottom : safePartTop + 20);
  const fieldHeight = Math.max(20, Math.round(field.height));
  const fieldY = Math.max(safePartTop, Math.min(safePartBottom - fieldHeight, Math.round(field.y)));

  if (placement === "top") {
    const height = 21;
    const gap = 4;
    const width = Math.max(80, Math.round(field.width));
    const preferredY = fieldY - height - gap;
    const y = Math.max(safePartTop, Math.min(safePartBottom - height, preferredY));
    return {
      x: Math.max(0, Math.round(field.x)),
      y,
      width,
      height
    };
  }

  const width = Math.max(72, Math.min(180, Math.round(field.width * 0.34)));
  const height = Math.max(18, Math.min(24, Math.round(fieldHeight)));
  const y = Math.max(
    safePartTop,
    Math.min(safePartBottom - height, fieldY + Math.round((fieldHeight - height) / 2))
  );
  const x = Math.max(0, Math.round(field.x - width - 8));

  return {
    x,
    y,
    width,
    height
  };
}

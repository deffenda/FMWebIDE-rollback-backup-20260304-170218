export type PortalRowVisualKind = "data" | "placeholder" | "create";

type PortalRowVisualStateInput = {
  rowKind: PortalRowVisualKind;
  rowIndex: number;
  useAlternateRowState: boolean;
  useActiveRowState: boolean;
  rowToken: string;
  activeRowToken: string;
};

export function resolvePortalRowVisualState(input: PortalRowVisualStateInput): {
  alternate: boolean;
  active: boolean;
} {
  const safeRowIndex = Number.isFinite(input.rowIndex) ? Math.max(0, Math.trunc(input.rowIndex)) : 0;
  const isDataRow = input.rowKind === "data";
  const alternate = isDataRow && input.useAlternateRowState && safeRowIndex % 2 === 1;
  const active =
    input.useActiveRowState &&
    String(input.activeRowToken ?? "").trim().length > 0 &&
    String(input.activeRowToken ?? "").trim() === String(input.rowToken ?? "").trim();
  return {
    alternate,
    active
  };
}

export function resolvePortalRelatedWriteTarget(input: {
  relatedTableOccurrence: string;
  defaultTableOccurrence: string;
  relatedLayoutHint?: string;
}): {
  tableOccurrence: string;
  layoutName?: string;
} {
  const relatedTableOccurrence = String(input.relatedTableOccurrence ?? "").trim();
  const defaultTableOccurrence = String(input.defaultTableOccurrence ?? "").trim();
  const relatedLayoutHint = String(input.relatedLayoutHint ?? "").trim();
  if (relatedTableOccurrence) {
    return {
      tableOccurrence: relatedTableOccurrence,
      layoutName: relatedLayoutHint || undefined
    };
  }
  return {
    tableOccurrence: defaultTableOccurrence,
    layoutName: undefined
  };
}

function normalizePortalToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "");
}

function unqualifiedPortalFieldToken(value: string): string {
  const token = value.trim();
  if (!token) {
    return "";
  }
  if (!token.includes("::")) {
    return normalizePortalToken(token);
  }
  const last = token.split("::").pop() ?? token;
  return normalizePortalToken(last);
}

export function resolvePortalFieldKeyForRow(
  row: Record<string, unknown>,
  rowField: string,
  options?: {
    tableOccurrence?: string;
    portalName?: string;
  }
): string {
  const fieldToken = String(rowField ?? "").trim();
  if (!fieldToken) {
    return "";
  }
  const normalizedFieldToken = normalizePortalToken(fieldToken);
  const normalizedUnqualifiedToken = unqualifiedPortalFieldToken(fieldToken);
  const tableToken = String(options?.tableOccurrence ?? "").trim();
  const portalToken = String(options?.portalName ?? "").trim();
  const normalizedTableToken = normalizePortalToken(tableToken);
  const normalizedPortalToken = normalizePortalToken(portalToken);

  const directCandidates = [
    tableToken ? `${tableToken}::${fieldToken}` : "",
    portalToken ? `${portalToken}::${fieldToken}` : "",
    fieldToken
  ]
    .map((entry) => String(entry ?? "").trim())
    .filter((entry) => entry.length > 0);

  for (const candidate of directCandidates) {
    if (Object.prototype.hasOwnProperty.call(row, candidate)) {
      return candidate;
    }
  }

  const rowKeys = Object.keys(row);
  const matchingKeys = rowKeys.filter((rowKey) => unqualifiedPortalFieldToken(rowKey) === normalizedUnqualifiedToken);
  if (matchingKeys.length === 0) {
    return "";
  }
  if (matchingKeys.length === 1) {
    return matchingKeys[0] ?? "";
  }

  let bestKey = matchingKeys[0] ?? "";
  let bestScore = -1;
  for (const candidateKey of matchingKeys) {
    let score = 0;
    const relationToken = candidateKey.includes("::")
      ? normalizePortalToken(candidateKey.split("::")[0] ?? "")
      : "";
    if (normalizedTableToken && relationToken === normalizedTableToken) {
      score += 10;
    }
    if (normalizedPortalToken && relationToken === normalizedPortalToken) {
      score += 8;
    }
    if (candidateKey.includes("::")) {
      score += 3;
    }
    if (normalizePortalToken(candidateKey) === normalizedFieldToken) {
      score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      bestKey = candidateKey;
    }
  }

  return bestKey;
}

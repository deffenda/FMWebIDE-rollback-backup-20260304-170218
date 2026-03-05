export type CustomFunctionWorkspaceEntry = {
  id: string;
  name: string;
  parameters: string[];
  definition: string;
  source: "ddr" | "workspace";
  notes?: string;
};

const DEFAULT_CUSTOM_FUNCTION_NAME = "NewFunction";
const DEFAULT_CUSTOM_FUNCTION_DEFINITION = "/* Return expression */\n\"\"";

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function dedupeCaseInsensitive(tokens: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const token of tokens) {
    const normalized = normalizeText(token);
    if (!normalized) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

function buildUniqueId(
  existing: CustomFunctionWorkspaceEntry[],
  now: () => number,
  idPrefix = "cf"
): string {
  const existingIds = new Set(existing.map((entry) => normalizeText(entry.id)));
  const base = `${idPrefix}-${Math.max(1, Math.floor(now()))}`;
  if (!existingIds.has(base)) {
    return base;
  }
  let counter = 2;
  while (existingIds.has(`${base}-${counter}`)) {
    counter += 1;
  }
  return `${base}-${counter}`;
}

export function parseCustomFunctionParameters(raw: string): string[] {
  const source = typeof raw === "string" ? raw : "";
  return dedupeCaseInsensitive(source.split(/[;,\n]/g));
}

export function resolveNextCustomFunctionName(existingNames: string[], requestedName: string): string {
  const normalizedRequested = normalizeText(requestedName).replace(/\s+/g, " ") || DEFAULT_CUSTOM_FUNCTION_NAME;
  const occupied = new Set(existingNames.map((entry) => normalizeText(entry).toLowerCase()).filter(Boolean));
  if (!occupied.has(normalizedRequested.toLowerCase())) {
    return normalizedRequested;
  }

  const base = normalizedRequested;
  let counter = 1;
  while (true) {
    const candidate = counter === 1 ? `${base} Copy` : `${base} Copy ${counter}`;
    if (!occupied.has(candidate.toLowerCase())) {
      return candidate;
    }
    counter += 1;
  }
}

export function createWorkspaceCustomFunctionEntry(
  existing: CustomFunctionWorkspaceEntry[],
  options?: {
    seed?: Partial<CustomFunctionWorkspaceEntry>;
    now?: () => number;
    idPrefix?: string;
  }
): CustomFunctionWorkspaceEntry {
  const seed = options?.seed ?? {};
  const now = options?.now ?? (() => Date.now());
  const existingNames = existing.map((entry) => entry.name);
  const requestedName = normalizeText(seed.name) || DEFAULT_CUSTOM_FUNCTION_NAME;
  const name = resolveNextCustomFunctionName(existingNames, requestedName);

  const parameters = Array.isArray(seed.parameters)
    ? dedupeCaseInsensitive(seed.parameters.map((token) => String(token)))
    : [];
  const definition = normalizeText(seed.definition) || DEFAULT_CUSTOM_FUNCTION_DEFINITION;
  const notes = normalizeText(seed.notes) || undefined;

  return {
    id: buildUniqueId(existing, now, options?.idPrefix || "cf"),
    name,
    parameters,
    definition,
    source: "workspace",
    notes
  };
}

export function duplicateWorkspaceCustomFunctionEntry(
  existing: CustomFunctionWorkspaceEntry[],
  sourceEntry: CustomFunctionWorkspaceEntry,
  options?: {
    now?: () => number;
    idPrefix?: string;
  }
): CustomFunctionWorkspaceEntry {
  return createWorkspaceCustomFunctionEntry(existing, {
    seed: {
      ...sourceEntry,
      name: normalizeText(sourceEntry.name) || DEFAULT_CUSTOM_FUNCTION_NAME,
      source: "workspace"
    },
    now: options?.now,
    idPrefix: options?.idPrefix
  });
}

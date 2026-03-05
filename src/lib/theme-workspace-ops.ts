export type WorkspaceThemeEntry = {
  id: string;
  name: string;
  description?: string;
  source: "filemaker" | "workspace";
};

const DEFAULT_THEME_NAME = "New Theme";

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDescription(value: unknown): string | undefined {
  const normalized = normalizeText(value);
  return normalized || undefined;
}

function buildUniqueThemeId(existingIds: string[], now: () => number): string {
  const occupied = new Set(existingIds.map((token) => normalizeText(token)).filter(Boolean));
  const base = `theme-${Math.max(1, Math.floor(now()))}`;
  if (!occupied.has(base)) {
    return base;
  }
  let suffix = 2;
  while (occupied.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}

export function resolveNextWorkspaceThemeName(existingNames: string[], requestedName: string): string {
  const base = normalizeText(requestedName).replace(/\s+/g, " ") || DEFAULT_THEME_NAME;
  const occupied = new Set(existingNames.map((entry) => normalizeText(entry).toLowerCase()).filter(Boolean));
  if (!occupied.has(base.toLowerCase())) {
    return base;
  }
  let copyIndex = 1;
  while (true) {
    const candidate = copyIndex === 1 ? `${base} Copy` : `${base} Copy ${copyIndex}`;
    if (!occupied.has(candidate.toLowerCase())) {
      return candidate;
    }
    copyIndex += 1;
  }
}

export function createWorkspaceThemeEntry(
  existingEntries: WorkspaceThemeEntry[],
  options?: {
    requestedName?: string;
    description?: string;
    additionalNameHints?: string[];
    now?: () => number;
  }
): WorkspaceThemeEntry {
  const now = options?.now ?? (() => Date.now());
  const allNameHints = [
    ...existingEntries.map((entry) => entry.name),
    ...(Array.isArray(options?.additionalNameHints) ? options.additionalNameHints : [])
  ];
  const name = resolveNextWorkspaceThemeName(allNameHints, options?.requestedName ?? DEFAULT_THEME_NAME);
  return {
    id: buildUniqueThemeId(
      existingEntries.map((entry) => entry.id),
      now
    ),
    name,
    description: normalizeDescription(options?.description),
    source: "workspace"
  };
}

export function duplicateWorkspaceThemeEntry(
  existingEntries: WorkspaceThemeEntry[],
  sourceEntry: WorkspaceThemeEntry,
  options?: {
    additionalNameHints?: string[];
    now?: () => number;
  }
): WorkspaceThemeEntry {
  return createWorkspaceThemeEntry(existingEntries, {
    requestedName: sourceEntry.name,
    description: sourceEntry.description,
    additionalNameHints: options?.additionalNameHints,
    now: options?.now
  });
}

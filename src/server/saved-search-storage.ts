import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  ensureWorkspaceStorage,
  normalizeWorkspaceId,
  workspaceRootPath
} from "./workspace-context.ts";

export type SavedFindRequest = {
  id: string;
  criteria: Record<string, string>;
  omit: boolean;
};

export type SavedFindConfigEntry = {
  id: string;
  name: string;
  requests: SavedFindRequest[];
  createdAt: number;
  lastRunAt?: number;
  layoutId?: string;
};

export type SavedFoundSetConfigEntry = {
  id: string;
  name: string;
  layoutId: string;
  tableOccurrence: string;
  recordIds: string[];
  capturedAt: number;
  source: "manual" | "find" | "script";
  sort?: Array<{
    field: string;
    direction: "asc" | "desc";
    mode: "standard" | "valueList";
    valueListName?: string;
    valueList?: string[];
  }>;
};

export type SavedSearchConfig = {
  version: 1;
  savedFinds: SavedFindConfigEntry[];
  savedFoundSets: SavedFoundSetConfigEntry[];
};

type SavedFoundSetSortEntry = NonNullable<SavedFoundSetConfigEntry["sort"]>[number];

const DEFAULT_SAVED_SEARCH_CONFIG: SavedSearchConfig = {
  version: 1,
  savedFinds: [],
  savedFoundSets: []
};

function savedSearchConfigPath(workspaceId?: string): string {
  return path.join(workspaceRootPath(workspaceId), "saved-searches.json");
}

function normalizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeFindRequest(raw: unknown): SavedFindRequest | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  const id = normalizeToken(candidate.id);
  const criteriaRaw = candidate.criteria;
  const criteria: Record<string, string> = {};
  if (criteriaRaw && typeof criteriaRaw === "object") {
    for (const [fieldName, value] of Object.entries(criteriaRaw as Record<string, unknown>)) {
      const normalizedField = normalizeToken(fieldName);
      const normalizedValue = normalizeToken(value);
      if (normalizedField && normalizedValue) {
        criteria[normalizedField] = normalizedValue;
      }
    }
  }
  if (!id || Object.keys(criteria).length === 0) {
    return null;
  }
  return {
    id,
    criteria,
    omit: candidate.omit === true
  };
}

function normalizeSavedFindEntry(raw: unknown): SavedFindConfigEntry | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  const id = normalizeToken(candidate.id);
  const name = normalizeToken(candidate.name);
  const requestsRaw = Array.isArray(candidate.requests) ? candidate.requests : [];
  const requests = requestsRaw
    .map((entry) => normalizeFindRequest(entry))
    .filter((entry): entry is SavedFindRequest => Boolean(entry));
  if (!id || !name || requests.length === 0) {
    return null;
  }
  const createdAt = Number(candidate.createdAt ?? Date.now());
  const lastRunAt = Number(candidate.lastRunAt ?? NaN);
  const layoutId = normalizeToken(candidate.layoutId);
  return {
    id,
    name,
    requests,
    createdAt: Number.isFinite(createdAt) ? Math.round(createdAt) : Date.now(),
    lastRunAt: Number.isFinite(lastRunAt) ? Math.round(lastRunAt) : undefined,
    layoutId: layoutId || undefined
  };
}

function normalizeSavedFoundSetEntry(raw: unknown): SavedFoundSetConfigEntry | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  const id = normalizeToken(candidate.id);
  const name = normalizeToken(candidate.name);
  const layoutId = normalizeToken(candidate.layoutId);
  const tableOccurrence = normalizeToken(candidate.tableOccurrence);
  const recordIds = Array.isArray(candidate.recordIds)
    ? candidate.recordIds
        .map((entry) => normalizeToken(entry))
        .filter((entry) => entry.length > 0)
    : [];
  if (!id || !name || !layoutId || !tableOccurrence || recordIds.length === 0) {
    return null;
  }
  const capturedAt = Number(candidate.capturedAt ?? Date.now());
  const sourceToken = normalizeToken(candidate.source).toLowerCase();
  const source: SavedFoundSetConfigEntry["source"] =
    sourceToken === "find" || sourceToken === "script" ? (sourceToken as SavedFoundSetConfigEntry["source"]) : "manual";
  const sort: SavedFoundSetSortEntry[] | undefined = Array.isArray(candidate.sort)
    ? candidate.sort
        .filter((entry) => Boolean(entry) && typeof entry === "object")
        .map((entry): SavedFoundSetSortEntry | null => {
          const candidateSort = entry as Record<string, unknown>;
          const field = normalizeToken(candidateSort.field);
          if (!field) {
            return null;
          }
          const direction: SavedFoundSetSortEntry["direction"] =
            normalizeToken(candidateSort.direction).toLowerCase() === "desc" ? "desc" : "asc";
          const mode: SavedFoundSetSortEntry["mode"] =
            normalizeToken(candidateSort.mode).toLowerCase() === "valuelist" ? "valueList" : "standard";
          const valueListName = normalizeToken(candidateSort.valueListName);
          const valueList = Array.isArray(candidateSort.valueList)
            ? candidateSort.valueList
                .map((item) => normalizeToken(item))
                .filter((item) => item.length > 0)
            : undefined;
          return {
            field,
            direction,
            mode,
            valueListName: valueListName || undefined,
            valueList
          };
        })
        .filter((entry): entry is SavedFoundSetSortEntry => Boolean(entry))
    : undefined;

  return {
    id,
    name,
    layoutId,
    tableOccurrence,
    recordIds,
    capturedAt: Number.isFinite(capturedAt) ? Math.round(capturedAt) : Date.now(),
    source,
    sort: sort && sort.length > 0 ? sort : undefined
  };
}

function normalizeSavedSearchConfig(raw: unknown): SavedSearchConfig {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_SAVED_SEARCH_CONFIG;
  }
  const candidate = raw as Record<string, unknown>;
  const savedFindsRaw = Array.isArray(candidate.savedFinds) ? candidate.savedFinds : [];
  const savedFoundSetsRaw = Array.isArray(candidate.savedFoundSets) ? candidate.savedFoundSets : [];

  const savedFinds = savedFindsRaw
    .map((entry) => normalizeSavedFindEntry(entry))
    .filter((entry): entry is SavedFindConfigEntry => Boolean(entry));
  const savedFoundSets = savedFoundSetsRaw
    .map((entry) => normalizeSavedFoundSetEntry(entry))
    .filter((entry): entry is SavedFoundSetConfigEntry => Boolean(entry));

  return {
    version: 1,
    savedFinds,
    savedFoundSets
  };
}

export async function readSavedSearchConfig(workspaceId?: string): Promise<SavedSearchConfig> {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
  await ensureWorkspaceStorage(normalizedWorkspaceId);
  const filePath = savedSearchConfigPath(normalizedWorkspaceId);
  if (!existsSync(filePath)) {
    return DEFAULT_SAVED_SEARCH_CONFIG;
  }
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return normalizeSavedSearchConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_SAVED_SEARCH_CONFIG;
  }
}

export async function writeSavedSearchConfig(
  workspaceId: string,
  payload: Partial<SavedSearchConfig>
): Promise<SavedSearchConfig> {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
  await ensureWorkspaceStorage(normalizedWorkspaceId);
  const current = await readSavedSearchConfig(normalizedWorkspaceId);
  const normalized = normalizeSavedSearchConfig({
    ...current,
    ...payload,
    version: 1
  });
  await fs.writeFile(savedSearchConfigPath(normalizedWorkspaceId), JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
}

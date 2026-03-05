import { existsSync, readFileSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";

export const DEFAULT_WORKSPACE_ID = "default";

export type WorkspaceFileMakerConfig = {
  host?: string;
  database?: string;
  username?: string;
  password?: string;
  ddrPath?: string;
  summaryPath?: string;
  sourceFileName?: string;
  solutionName?: string;
  dependsOn?: string[];
  externalDataSources?: string[];
};

export type WorkspaceFileConfig = {
  fileId: string;
  displayName?: string;
  databaseName: string;
  host?: string;
  username?: string;
  password?: string;
  sourceFileName?: string;
  workspaceIdRef?: string;
  primary?: boolean;
  dependencies?: string[];
  apiLayoutsByTableOccurrence?: Record<string, string>;
  status?: "connected" | "missing" | "locked" | "unknown";
};

export type WorkspaceLayoutIndexEntry = {
  fileId: string;
  databaseName: string;
  baseTableOccurrence?: string;
  baseTable?: string;
  apiLayoutName?: string;
};

export type WorkspaceToIndexEntry = {
  fileId: string;
  databaseName: string;
  baseTable?: string;
  apiLayoutName?: string;
  relationshipTargets?: string[];
};

export type WorkspaceRelationshipEdge = {
  id: string;
  left: {
    fileId: string;
    tableOccurrence: string;
  };
  right: {
    fileId: string;
    tableOccurrence: string;
  };
  predicate?: string;
};

export type WorkspaceRoutingConfig = {
  layoutIndex?: Record<string, WorkspaceLayoutIndexEntry>;
  toIndex?: Record<string, WorkspaceToIndexEntry>;
  relationshipGraph?: WorkspaceRelationshipEdge[];
};

export type WorkspaceConfig = {
  version: 1 | 2;
  id: string;
  name?: string;
  filemaker?: WorkspaceFileMakerConfig;
  files?: WorkspaceFileConfig[];
  routing?: WorkspaceRoutingConfig;
};

const dataDir = path.join(process.cwd(), "data");
const workspacesDir = path.join(dataDir, "workspaces");

function cleanWorkspaceId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeWorkspaceId(value?: string | null): string {
  const cleaned = cleanWorkspaceId(String(value ?? ""));
  return cleaned || DEFAULT_WORKSPACE_ID;
}

export function workspaceIdFromUrl(url: URL): string {
  return normalizeWorkspaceId(url.searchParams.get("workspace"));
}

export function workspaceIdFromPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return DEFAULT_WORKSPACE_ID;
  }
  const raw = (payload as { workspaceId?: unknown }).workspaceId;
  if (typeof raw !== "string") {
    return DEFAULT_WORKSPACE_ID;
  }
  return normalizeWorkspaceId(raw);
}

export function workspaceIdFromFormData(formData: FormData): string {
  const token = formData.get("workspaceId");
  return typeof token === "string" ? normalizeWorkspaceId(token) : DEFAULT_WORKSPACE_ID;
}

export function workspaceRootPath(workspaceId?: string): string {
  return path.join(workspacesDir, normalizeWorkspaceId(workspaceId));
}

export function workspaceConfigPath(workspaceId?: string): string {
  return path.join(workspaceRootPath(workspaceId), "workspace.json");
}

export function workspaceLayoutsDirPath(workspaceId?: string): string {
  const normalized = normalizeWorkspaceId(workspaceId);
  if (normalized === DEFAULT_WORKSPACE_ID) {
    return path.join(dataDir, "layouts");
  }
  return path.join(workspaceRootPath(normalized), "layouts");
}

export function workspaceLayoutMapPath(workspaceId?: string): string {
  const normalized = normalizeWorkspaceId(workspaceId);
  if (normalized === DEFAULT_WORKSPACE_ID) {
    return path.join(dataDir, "layout-fm-map.json");
  }
  return path.join(workspaceRootPath(normalized), "layout-fm-map.json");
}

export function workspaceMockRecordsDirPath(workspaceId?: string): string {
  const normalized = normalizeWorkspaceId(workspaceId);
  if (normalized === DEFAULT_WORKSPACE_ID) {
    return path.join(dataDir, "mock-records");
  }
  return path.join(workspaceRootPath(normalized), "mock-records");
}

export async function ensureWorkspaceStorage(workspaceId?: string): Promise<string> {
  const normalized = normalizeWorkspaceId(workspaceId);
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(workspacesDir, { recursive: true });
  await fs.mkdir(workspaceRootPath(normalized), { recursive: true });
  await fs.mkdir(workspaceLayoutsDirPath(normalized), { recursive: true });
  await fs.mkdir(workspaceMockRecordsDirPath(normalized), { recursive: true });
  return normalized;
}

function cleanText(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() || undefined : undefined;
}

function cleanStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const cleaned = value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
  return cleaned.length > 0 ? cleaned : undefined;
}

function cleanFileId(value: unknown, fallback: string): string {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    return fallback;
  }
  const cleaned = raw.replace(/[^a-zA-Z0-9._:-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || fallback;
}

function normalizeWorkspaceFileStatus(value: unknown): WorkspaceFileConfig["status"] {
  const token = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (token === "connected" || token === "missing" || token === "locked" || token === "unknown") {
    return token;
  }
  return "unknown";
}

function sanitizeApiLayoutsByTableOccurrence(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const next: Record<string, string> = {};
  for (const [rawTo, rawLayout] of Object.entries(value as Record<string, unknown>)) {
    const tableOccurrence = rawTo.trim();
    const layoutName = cleanText(rawLayout);
    if (!tableOccurrence || !layoutName) {
      continue;
    }
    next[tableOccurrence] = layoutName;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

function sanitizeWorkspaceFileMakerConfig(value: unknown): WorkspaceFileMakerConfig | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const candidate = value as Record<string, unknown>;
  const filemaker: WorkspaceFileMakerConfig = {
    host: cleanText(candidate.host),
    database: cleanText(candidate.database),
    username: cleanText(candidate.username),
    password: cleanText(candidate.password),
    ddrPath: cleanText(candidate.ddrPath),
    summaryPath: cleanText(candidate.summaryPath),
    sourceFileName: cleanText(candidate.sourceFileName),
    solutionName: cleanText(candidate.solutionName),
    dependsOn: cleanStringList(candidate.dependsOn),
    externalDataSources: cleanStringList(candidate.externalDataSources)
  };
  if (Object.values(filemaker).every((entry) => entry == null)) {
    return undefined;
  }
  return filemaker;
}

function sanitizeWorkspaceFileConfig(
  entry: unknown,
  fallbackFileId: string,
  fallbackDatabaseName?: string
): WorkspaceFileConfig | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const candidate = entry as Record<string, unknown>;
  const databaseName = cleanText(candidate.databaseName) ?? fallbackDatabaseName;
  if (!databaseName) {
    return null;
  }

  const fileId = cleanFileId(candidate.fileId, fallbackFileId);
  const fileConfig: WorkspaceFileConfig = {
    fileId,
    databaseName,
    displayName: cleanText(candidate.displayName),
    host: cleanText(candidate.host),
    username: cleanText(candidate.username),
    password: cleanText(candidate.password),
    sourceFileName: cleanText(candidate.sourceFileName),
    workspaceIdRef: cleanText(candidate.workspaceIdRef),
    primary: candidate.primary === true ? true : undefined,
    dependencies: cleanStringList(candidate.dependencies),
    apiLayoutsByTableOccurrence: sanitizeApiLayoutsByTableOccurrence(candidate.apiLayoutsByTableOccurrence),
    status: normalizeWorkspaceFileStatus(candidate.status)
  };

  return fileConfig;
}

function sanitizeLayoutIndexEntry(entry: unknown): WorkspaceLayoutIndexEntry | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const candidate = entry as Record<string, unknown>;
  const fileId = cleanText(candidate.fileId);
  const databaseName = cleanText(candidate.databaseName);
  if (!fileId || !databaseName) {
    return null;
  }
  return {
    fileId,
    databaseName,
    baseTableOccurrence: cleanText(candidate.baseTableOccurrence),
    baseTable: cleanText(candidate.baseTable),
    apiLayoutName: cleanText(candidate.apiLayoutName)
  };
}

function sanitizeToIndexEntry(entry: unknown): WorkspaceToIndexEntry | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const candidate = entry as Record<string, unknown>;
  const fileId = cleanText(candidate.fileId);
  const databaseName = cleanText(candidate.databaseName);
  if (!fileId || !databaseName) {
    return null;
  }
  return {
    fileId,
    databaseName,
    baseTable: cleanText(candidate.baseTable),
    apiLayoutName: cleanText(candidate.apiLayoutName),
    relationshipTargets: cleanStringList(candidate.relationshipTargets)
  };
}

function sanitizeRelationshipEdge(entry: unknown): WorkspaceRelationshipEdge | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const candidate = entry as Record<string, unknown>;
  const left = candidate.left;
  const right = candidate.right;
  if (!left || !right || typeof left !== "object" || typeof right !== "object") {
    return null;
  }
  const leftFileId = cleanText((left as Record<string, unknown>).fileId);
  const leftTo = cleanText((left as Record<string, unknown>).tableOccurrence);
  const rightFileId = cleanText((right as Record<string, unknown>).fileId);
  const rightTo = cleanText((right as Record<string, unknown>).tableOccurrence);
  if (!leftFileId || !leftTo || !rightFileId || !rightTo) {
    return null;
  }
  return {
    id:
      cleanText(candidate.id) ||
      `${leftFileId}:${leftTo}->${rightFileId}:${rightTo}`,
    left: {
      fileId: leftFileId,
      tableOccurrence: leftTo
    },
    right: {
      fileId: rightFileId,
      tableOccurrence: rightTo
    },
    predicate: cleanText(candidate.predicate)
  };
}

function sanitizeWorkspaceRoutingConfig(value: unknown): WorkspaceRoutingConfig | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const candidate = value as Record<string, unknown>;
  const layoutIndexSource =
    candidate.layoutIndex && typeof candidate.layoutIndex === "object"
      ? (candidate.layoutIndex as Record<string, unknown>)
      : {};
  const toIndexSource =
    candidate.toIndex && typeof candidate.toIndex === "object"
      ? (candidate.toIndex as Record<string, unknown>)
      : {};

  const layoutIndex: Record<string, WorkspaceLayoutIndexEntry> = {};
  for (const [layoutName, entry] of Object.entries(layoutIndexSource)) {
    const normalizedLayoutName = layoutName.trim();
    if (!normalizedLayoutName) {
      continue;
    }
    const normalizedEntry = sanitizeLayoutIndexEntry(entry);
    if (!normalizedEntry) {
      continue;
    }
    layoutIndex[normalizedLayoutName] = normalizedEntry;
  }

  const toIndex: Record<string, WorkspaceToIndexEntry> = {};
  for (const [tableOccurrence, entry] of Object.entries(toIndexSource)) {
    const normalizedTableOccurrence = tableOccurrence.trim();
    if (!normalizedTableOccurrence) {
      continue;
    }
    const normalizedEntry = sanitizeToIndexEntry(entry);
    if (!normalizedEntry) {
      continue;
    }
    toIndex[normalizedTableOccurrence] = normalizedEntry;
  }

  const relationshipGraph = Array.isArray(candidate.relationshipGraph)
    ? candidate.relationshipGraph
        .map((entry) => sanitizeRelationshipEdge(entry))
        .filter((entry): entry is WorkspaceRelationshipEdge => Boolean(entry))
    : [];

  if (
    Object.keys(layoutIndex).length === 0 &&
    Object.keys(toIndex).length === 0 &&
    relationshipGraph.length === 0
  ) {
    return undefined;
  }

  return {
    layoutIndex: Object.keys(layoutIndex).length > 0 ? layoutIndex : undefined,
    toIndex: Object.keys(toIndex).length > 0 ? toIndex : undefined,
    relationshipGraph: relationshipGraph.length > 0 ? relationshipGraph : undefined
  };
}

function buildDefaultFilesForConfig(
  workspaceId: string,
  filemaker: WorkspaceFileMakerConfig | undefined,
  existingFiles: WorkspaceFileConfig[] | undefined
): WorkspaceFileConfig[] | undefined {
  if (existingFiles && existingFiles.length > 0) {
    const next = existingFiles.map((entry, index) => ({
      ...entry,
      fileId: cleanFileId(entry.fileId, `${workspaceId}-file-${index + 1}`),
      primary: index === 0 ? true : entry.primary === true ? true : undefined
    }));
    if (!next.some((entry) => entry.primary === true)) {
      next[0] = {
        ...next[0],
        primary: true
      };
    }
    return next;
  }

  const databaseName = filemaker?.database?.trim() || workspaceId;
  const primaryFile: WorkspaceFileConfig = {
    fileId: cleanFileId(workspaceId, "primary"),
    displayName: workspaceId,
    databaseName,
    host: filemaker?.host,
    username: filemaker?.username,
    password: filemaker?.password,
    sourceFileName: filemaker?.sourceFileName,
    primary: true,
    dependencies: filemaker?.dependsOn,
    status: "unknown"
  };
  return [primaryFile];
}

function parseWorkspaceConfig(raw: string): WorkspaceConfig | null {
  try {
    const parsed = JSON.parse(raw) as Partial<WorkspaceConfig>;
    if (!parsed || (parsed.version !== 1 && parsed.version !== 2) || typeof parsed.id !== "string") {
      return null;
    }
    const id = normalizeWorkspaceId(parsed.id);
    const filemaker = sanitizeWorkspaceFileMakerConfig(parsed.filemaker);
    const rawFiles = Array.isArray(parsed.files)
      ? parsed.files
          .map((entry, index) =>
            sanitizeWorkspaceFileConfig(entry, `${id}-file-${index + 1}`, filemaker?.database || id)
          )
          .filter((entry): entry is WorkspaceFileConfig => Boolean(entry))
      : undefined;
    const files = buildDefaultFilesForConfig(id, filemaker, rawFiles);
    const routing = sanitizeWorkspaceRoutingConfig(parsed.routing);

    return {
      version: 2,
      id,
      name: typeof parsed.name === "string" ? parsed.name.trim() : undefined,
      filemaker,
      files,
      routing
    };
  } catch {
    return null;
  }
}

export async function readWorkspaceConfig(workspaceId?: string): Promise<WorkspaceConfig | null> {
  const normalized = normalizeWorkspaceId(workspaceId);
  const filePath = workspaceConfigPath(normalized);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return parseWorkspaceConfig(raw);
  } catch {
    return null;
  }
}

export function readWorkspaceConfigSync(workspaceId?: string): WorkspaceConfig | null {
  const normalized = normalizeWorkspaceId(workspaceId);
  const filePath = workspaceConfigPath(normalized);
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    return parseWorkspaceConfig(readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

export async function writeWorkspaceConfig(
  workspaceId: string,
  config: Omit<WorkspaceConfig, "version" | "id"> & { id?: string }
): Promise<WorkspaceConfig> {
  const normalized = normalizeWorkspaceId(workspaceId);
  await ensureWorkspaceStorage(normalized);

  const filemaker = sanitizeWorkspaceFileMakerConfig(config.filemaker);
  const rawFiles = Array.isArray(config.files)
    ? config.files
        .map((entry, index) =>
          sanitizeWorkspaceFileConfig(entry, `${normalized}-file-${index + 1}`, filemaker?.database || normalized)
        )
        .filter((entry): entry is WorkspaceFileConfig => Boolean(entry))
    : undefined;
  const files = buildDefaultFilesForConfig(normalized, filemaker, rawFiles);
  const routing = sanitizeWorkspaceRoutingConfig(config.routing);

  const payload: WorkspaceConfig = {
    version: 2,
    id: normalized,
    name: config.name?.trim() || normalized,
    filemaker,
    files,
    routing
  };

  await fs.writeFile(workspaceConfigPath(normalized), JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

export async function listWorkspaceIds(): Promise<string[]> {
  await fs.mkdir(workspacesDir, { recursive: true });
  const ids = new Set<string>([DEFAULT_WORKSPACE_ID]);
  const entries = await fs.readdir(workspacesDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    ids.add(normalizeWorkspaceId(entry.name));
  }
  return [...ids].sort((a, b) => a.localeCompare(b));
}

export async function deleteWorkspaceStorage(workspaceId?: string): Promise<string> {
  const normalized = normalizeWorkspaceId(workspaceId);

  if (normalized === DEFAULT_WORKSPACE_ID) {
    await fs.rm(workspaceRootPath(normalized), { recursive: true, force: true });
    await fs.rm(workspaceLayoutsDirPath(normalized), { recursive: true, force: true });
    await fs.rm(workspaceMockRecordsDirPath(normalized), { recursive: true, force: true });
    await fs.rm(workspaceLayoutMapPath(normalized), { force: true });

    await fs.mkdir(dataDir, { recursive: true });
    await fs.mkdir(workspacesDir, { recursive: true });
    await fs.mkdir(workspaceRootPath(normalized), { recursive: true });
    await fs.mkdir(workspaceLayoutsDirPath(normalized), { recursive: true });
    await fs.mkdir(workspaceMockRecordsDirPath(normalized), { recursive: true });
    await fs.writeFile(path.join(workspaceLayoutsDirPath(normalized), ".gitkeep"), "", "utf8");
    return normalized;
  }

  await fs.rm(workspaceRootPath(normalized), { recursive: true, force: true });
  return normalized;
}

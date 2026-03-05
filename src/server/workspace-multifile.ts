import { existsSync, readFileSync } from "node:fs";
import {
  normalizeWorkspaceId,
  readWorkspaceConfigSync,
  workspaceLayoutMapPath,
  type WorkspaceConfig,
  type WorkspaceFileConfig,
  type WorkspaceLayoutIndexEntry,
  type WorkspaceRelationshipEdge,
  type WorkspaceToIndexEntry
} from "./workspace-context.ts";

export type WorkspaceRoutingErrorCode =
  | "WORKSPACE_CONFIG_MISSING"
  | "WORKSPACE_TARGET_FILE_MISSING"
  | "WORKSPACE_TARGET_FILE_LOCKED"
  | "WORKSPACE_API_LAYOUT_MISSING";

export class WorkspaceRoutingError extends Error {
  readonly code: WorkspaceRoutingErrorCode;
  readonly guidance: string;
  readonly details?: Record<string, unknown>;

  constructor(
    code: WorkspaceRoutingErrorCode,
    message: string,
    guidance: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "WorkspaceRoutingError";
    this.code = code;
    this.guidance = guidance;
    this.details = details;
  }
}

export type ResolvedWorkspaceFile = WorkspaceFileConfig & {
  workspaceId: string;
  aliases: string[];
};

export type ResolvedWorkspaceGraph = {
  workspaceId: string;
  files: ResolvedWorkspaceFile[];
  primaryFileId: string;
  byFileId: Record<string, ResolvedWorkspaceFile>;
  byDatabaseToken: Record<string, ResolvedWorkspaceFile>;
  layoutIndex: Record<string, WorkspaceLayoutIndexEntry>;
  toIndex: Record<string, WorkspaceToIndexEntry>;
  relationshipGraph: WorkspaceRelationshipEdge[];
  warnings: string[];
};

export type ResolveWorkspaceRoutingTargetOptions = {
  workspaceId?: string;
  tableOccurrence?: string;
  layoutNameHint?: string;
  databaseNameHint?: string;
  fileIdHint?: string;
  operation: "read" | "find" | "write" | "delete" | "create" | "script" | "metadata";
};

export type WorkspaceRoutingTarget = {
  workspaceId: string;
  fileId: string;
  databaseName: string;
  host?: string;
  username?: string;
  password?: string;
  status: NonNullable<WorkspaceFileConfig["status"]>;
  tableOccurrence: string;
  apiLayoutName: string;
  source:
    | "file-id-hint"
    | "database-hint"
    | "to-index"
    | "layout-index"
    | "heuristic"
    | "primary";
  relationshipPath: string[];
  warnings: string[];
};

type LayoutMapPayload = {
  version: 1;
  byFileMakerLayoutKey: Record<string, string>;
};

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function sanitizeAlias(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function choosePrimaryFile(config: WorkspaceConfig, workspaceId: string): WorkspaceFileConfig {
  const fromFiles =
    config.files?.find((entry) => entry.primary === true) ??
    config.files?.[0];
  if (fromFiles) {
    return fromFiles;
  }
  return {
    fileId: workspaceId,
    databaseName: config.filemaker?.database?.trim() || workspaceId,
    host: config.filemaker?.host,
    username: config.filemaker?.username,
    password: config.filemaker?.password,
    sourceFileName: config.filemaker?.sourceFileName,
    primary: true,
    dependencies: config.filemaker?.dependsOn,
    status: "unknown"
  };
}

function readLayoutMap(workspaceId: string): LayoutMapPayload | null {
  const mapPath = workspaceLayoutMapPath(workspaceId);
  if (!existsSync(mapPath)) {
    return null;
  }
  try {
    const parsed = JSON.parse(readFileSync(mapPath, "utf8")) as Partial<LayoutMapPayload>;
    if (!parsed || parsed.version !== 1 || !parsed.byFileMakerLayoutKey) {
      return null;
    }
    return {
      version: 1,
      byFileMakerLayoutKey: parsed.byFileMakerLayoutKey
    };
  } catch {
    return null;
  }
}

function attachLayoutIndexFromMap(
  workspaceId: string,
  databaseTokenToFile: Record<string, ResolvedWorkspaceFile>,
  target: Record<string, WorkspaceLayoutIndexEntry>
): void {
  const map = readLayoutMap(workspaceId);
  if (!map) {
    return;
  }
  for (const key of Object.keys(map.byFileMakerLayoutKey)) {
    const marker = key.indexOf("::");
    if (marker <= 0) {
      continue;
    }
    const databaseName = key.slice(0, marker).trim();
    const layoutName = key.slice(marker + 2).trim();
    if (!databaseName || !layoutName || target[layoutName]) {
      continue;
    }
    const owner = databaseTokenToFile[normalizeToken(databaseName)];
    if (!owner) {
      continue;
    }
    target[layoutName] = {
      fileId: owner.fileId,
      databaseName: owner.databaseName,
      apiLayoutName: layoutName
    };
  }
}

function buildRelationshipPath(
  primaryFileId: string,
  targetFileId: string,
  relationshipGraph: WorkspaceRelationshipEdge[]
): string[] {
  if (targetFileId === primaryFileId) {
    return [primaryFileId];
  }
  const linked = relationshipGraph.find(
    (edge) =>
      (edge.left.fileId === primaryFileId && edge.right.fileId === targetFileId) ||
      (edge.right.fileId === primaryFileId && edge.left.fileId === targetFileId)
  );
  if (linked) {
    return [
      primaryFileId,
      `${linked.left.fileId}:${linked.left.tableOccurrence}`,
      `${linked.right.fileId}:${linked.right.tableOccurrence}`,
      targetFileId
    ];
  }
  return [primaryFileId, targetFileId];
}

function normalizeLayoutNameKey(layoutName: string): string {
  return layoutName.trim().toLowerCase();
}

function findLayoutIndexEntry(
  layoutIndex: Record<string, WorkspaceLayoutIndexEntry>,
  layoutName: string
): WorkspaceLayoutIndexEntry | null {
  const normalized = normalizeLayoutNameKey(layoutName);
  for (const [candidateName, entry] of Object.entries(layoutIndex)) {
    if (normalizeLayoutNameKey(candidateName) === normalized) {
      return entry;
    }
  }
  return null;
}

function findToIndexEntry(
  toIndex: Record<string, WorkspaceToIndexEntry>,
  tableOccurrence: string
): WorkspaceToIndexEntry | null {
  const normalized = normalizeToken(tableOccurrence);
  for (const [candidateName, entry] of Object.entries(toIndex)) {
    if (normalizeToken(candidateName) === normalized) {
      return entry;
    }
  }
  return null;
}

function inferApiLayoutFromTableOccurrence(
  tableOccurrence: string,
  fileId: string,
  layoutIndex: Record<string, WorkspaceLayoutIndexEntry>
): string | undefined {
  const normalizedTableOccurrence = tableOccurrence.trim();
  if (!normalizedTableOccurrence) {
    return undefined;
  }

  const candidates = new Set<string>([normalizedTableOccurrence]);
  const beforeUnderscore = normalizedTableOccurrence.split("_")[0]?.trim() ?? "";
  if (beforeUnderscore) {
    candidates.add(beforeUnderscore);
    candidates.add(beforeUnderscore.toUpperCase());
  }
  const beforeScope = normalizedTableOccurrence.split("::")[0]?.trim() ?? "";
  if (beforeScope) {
    candidates.add(beforeScope);
    candidates.add(beforeScope.toUpperCase());
  }
  if (normalizedTableOccurrence.includes(".")) {
    const upper = normalizedTableOccurrence
      .split(".")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .join(".")
      .toUpperCase();
    if (upper) {
      candidates.add(upper);
    }
  }

  for (const candidate of candidates) {
    const entry = findLayoutIndexEntry(layoutIndex, candidate);
    if (entry && entry.fileId === fileId) {
      return entry.apiLayoutName?.trim() || candidate;
    }
  }

  return undefined;
}

function inferFileFromTableOccurrence(
  tableOccurrence: string,
  graph: ResolvedWorkspaceGraph
): ResolvedWorkspaceFile | null {
  const normalized = normalizeToken(tableOccurrence);
  if (!normalized) {
    return null;
  }
  for (const file of graph.files) {
    for (const alias of file.aliases) {
      if (!alias) {
        continue;
      }
      if (
        normalized.startsWith(`${alias}.`) ||
        normalized.startsWith(`${alias}_`) ||
        normalized.includes(`.${alias}.`) ||
        normalized.includes(`${alias}::`)
      ) {
        return file;
      }
    }
  }
  return null;
}

function workspaceFilesFromConfig(workspaceId: string, config: WorkspaceConfig): ResolvedWorkspaceFile[] {
  const files: ResolvedWorkspaceFile[] = [];
  const seen = new Set<string>();
  const addFile = (file: WorkspaceFileConfig, ownerWorkspaceId: string, primary: boolean) => {
    const fileId = file.fileId.trim();
    const databaseName = file.databaseName.trim();
    if (!fileId || !databaseName) {
      return;
    }
    const key = `${ownerWorkspaceId}::${fileId}`.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    const aliases = new Set<string>();
    aliases.add(sanitizeAlias(databaseName));
    aliases.add(sanitizeAlias(fileId));
    aliases.add(sanitizeAlias(ownerWorkspaceId));
    if (file.workspaceIdRef) {
      aliases.add(sanitizeAlias(file.workspaceIdRef));
    }
    files.push({
      ...file,
      fileId,
      databaseName,
      workspaceId: ownerWorkspaceId,
      primary,
      status: file.status ?? "unknown",
      aliases: [...aliases].filter((entry) => entry.length > 0)
    });
  };

  const baseFiles = config.files?.length ? config.files : [choosePrimaryFile(config, workspaceId)];
  for (const [index, file] of baseFiles.entries()) {
    addFile(file, workspaceId, index === 0 || file.primary === true);
  }

  const dependencyIds = new Set<string>([
    ...(config.filemaker?.dependsOn ?? []),
    ...baseFiles.flatMap((entry) => entry.dependencies ?? [])
  ]);
  for (const dependencyWorkspaceId of dependencyIds) {
    const dependencyId = normalizeWorkspaceId(dependencyWorkspaceId);
    if (!dependencyId || dependencyId === workspaceId) {
      continue;
    }
    const dependencyConfig = readWorkspaceConfigSync(dependencyId);
    if (!dependencyConfig) {
      addFile(
        {
          fileId: dependencyId,
          databaseName: dependencyId,
          workspaceIdRef: dependencyId,
          status: "missing"
        },
        dependencyId,
        false
      );
      continue;
    }
    const dependencyPrimary = choosePrimaryFile(dependencyConfig, dependencyId);
    addFile(
      {
        ...dependencyPrimary,
        workspaceIdRef: dependencyId,
        status: dependencyPrimary.status ?? "unknown"
      },
      dependencyId,
      false
    );
  }

  if (files.length === 0) {
    files.push({
      fileId: workspaceId,
      workspaceId,
      databaseName: workspaceId,
      primary: true,
      status: "unknown",
      aliases: [sanitizeAlias(workspaceId)]
    });
  }

  if (!files.some((entry) => entry.primary === true)) {
    files[0] = {
      ...files[0],
      primary: true
    };
  }

  return files;
}

export function resolveWorkspaceGraph(workspaceId?: string): ResolvedWorkspaceGraph {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
  const config = readWorkspaceConfigSync(normalizedWorkspaceId);
  if (!config) {
    throw new WorkspaceRoutingError(
      "WORKSPACE_CONFIG_MISSING",
      `Workspace "${normalizedWorkspaceId}" is not configured`,
      "Open Solution Settings and configure at least one FileMaker database profile.",
      {
        workspaceId: normalizedWorkspaceId
      }
    );
  }

  const files = workspaceFilesFromConfig(normalizedWorkspaceId, config);
  const primaryFile = files.find((entry) => entry.primary === true) ?? files[0];
  const byFileId: Record<string, ResolvedWorkspaceFile> = {};
  const byDatabaseToken: Record<string, ResolvedWorkspaceFile> = {};
  const warnings: string[] = [];

  for (const file of files) {
    byFileId[file.fileId] = file;
    byDatabaseToken[normalizeToken(file.databaseName)] = file;
  }

  const layoutIndex: Record<string, WorkspaceLayoutIndexEntry> = {
    ...(config.routing?.layoutIndex ?? {})
  };
  const toIndex: Record<string, WorkspaceToIndexEntry> = {
    ...(config.routing?.toIndex ?? {})
  };

  attachLayoutIndexFromMap(normalizedWorkspaceId, byDatabaseToken, layoutIndex);
  for (const file of files) {
    attachLayoutIndexFromMap(file.workspaceId, byDatabaseToken, layoutIndex);
    for (const [tableOccurrence, apiLayoutName] of Object.entries(file.apiLayoutsByTableOccurrence ?? {})) {
      if (!tableOccurrence.trim() || !apiLayoutName.trim()) {
        continue;
      }
      if (!toIndex[tableOccurrence]) {
        toIndex[tableOccurrence] = {
          fileId: file.fileId,
          databaseName: file.databaseName,
          apiLayoutName: apiLayoutName.trim()
        };
      }
    }
  }

  for (const [tableOccurrence, entry] of Object.entries(toIndex)) {
    if (!byFileId[entry.fileId]) {
      const fallbackByDb = byDatabaseToken[normalizeToken(entry.databaseName)];
      if (fallbackByDb) {
        entry.fileId = fallbackByDb.fileId;
        entry.databaseName = fallbackByDb.databaseName;
      } else {
        warnings.push(
          `TO index entry "${tableOccurrence}" points to unknown fileId "${entry.fileId}" (database "${entry.databaseName}").`
        );
      }
    }
  }

  const relationshipGraph = config.routing?.relationshipGraph ?? [];
  return {
    workspaceId: normalizedWorkspaceId,
    files,
    primaryFileId: primaryFile.fileId,
    byFileId,
    byDatabaseToken,
    layoutIndex,
    toIndex,
    relationshipGraph,
    warnings
  };
}

export function resolveWorkspaceRoutingTarget(
  options: ResolveWorkspaceRoutingTargetOptions
): { graph: ResolvedWorkspaceGraph; target: WorkspaceRoutingTarget } {
  const graph = resolveWorkspaceGraph(options.workspaceId);
  const tableOccurrence = options.tableOccurrence?.trim() || "";
  const layoutNameHint = options.layoutNameHint?.trim() || "";
  const warnings: string[] = [];

  let selected: ResolvedWorkspaceFile | null = null;
  let source: WorkspaceRoutingTarget["source"] = "primary";
  let mappedApiLayout = false;
  let apiLayoutName = "";

  if (options.fileIdHint?.trim()) {
    selected = graph.byFileId[options.fileIdHint.trim()] ?? null;
    source = "file-id-hint";
  }

  if (!selected && options.databaseNameHint?.trim()) {
    selected = graph.byDatabaseToken[normalizeToken(options.databaseNameHint)] ?? null;
    source = "database-hint";
  }

  const toEntry = tableOccurrence ? findToIndexEntry(graph.toIndex, tableOccurrence) : null;
  if (!selected && toEntry) {
    selected = graph.byFileId[toEntry.fileId] ?? graph.byDatabaseToken[normalizeToken(toEntry.databaseName)] ?? null;
    source = "to-index";
    if (toEntry.apiLayoutName?.trim()) {
      apiLayoutName = toEntry.apiLayoutName.trim();
      mappedApiLayout = true;
    }
  }

  const layoutEntry = layoutNameHint ? findLayoutIndexEntry(graph.layoutIndex, layoutNameHint) : null;
  if (!selected && layoutEntry) {
    selected =
      graph.byFileId[layoutEntry.fileId] ??
      graph.byDatabaseToken[normalizeToken(layoutEntry.databaseName)] ??
      null;
    source = "layout-index";
    if (layoutEntry.apiLayoutName?.trim()) {
      apiLayoutName = layoutEntry.apiLayoutName.trim();
      mappedApiLayout = true;
    }
  }

  if (!selected && tableOccurrence) {
    selected = inferFileFromTableOccurrence(tableOccurrence, graph);
    if (selected) {
      source = "heuristic";
    }
  }

  if (!selected) {
    selected = graph.byFileId[graph.primaryFileId] ?? graph.files[0] ?? null;
    source = "primary";
  }

  if (!selected) {
    throw new WorkspaceRoutingError(
      "WORKSPACE_TARGET_FILE_MISSING",
      `Workspace "${graph.workspaceId}" has no available FileMaker files`,
      "Open Solution Settings and configure at least one FileMaker file for this workspace.",
      {
        workspaceId: graph.workspaceId
      }
    );
  }

  if (selected.status === "missing" || selected.status === "locked") {
    throw new WorkspaceRoutingError(
      "WORKSPACE_TARGET_FILE_LOCKED",
      `File "${selected.databaseName}" is not accessible with the current workspace profile`,
      `Grant account access to "${selected.databaseName}" or adjust workspace dependency settings.`,
      {
        workspaceId: graph.workspaceId,
        fileId: selected.fileId,
        databaseName: selected.databaseName,
        status: selected.status
      }
    );
  }

  if (!apiLayoutName && tableOccurrence) {
    const fromFileMap = Object.entries(selected.apiLayoutsByTableOccurrence ?? {}).find(
      ([candidate]) => normalizeToken(candidate) === normalizeToken(tableOccurrence)
    );
    if (fromFileMap?.[1].trim()) {
      apiLayoutName = fromFileMap[1].trim();
      mappedApiLayout = true;
    }
  }

  if (!apiLayoutName && tableOccurrence) {
    const inferred = inferApiLayoutFromTableOccurrence(tableOccurrence, selected.fileId, graph.layoutIndex);
    if (inferred) {
      apiLayoutName = inferred;
      mappedApiLayout = true;
    }
  }

  if (!apiLayoutName && layoutNameHint) {
    apiLayoutName = layoutNameHint;
  }
  if (!apiLayoutName && tableOccurrence) {
    apiLayoutName = tableOccurrence;
  }

  const crossFileTarget = selected.fileId !== graph.primaryFileId;
  if (
    crossFileTarget &&
    (options.operation === "write" || options.operation === "create" || options.operation === "delete") &&
    !mappedApiLayout
  ) {
    throw new WorkspaceRoutingError(
      "WORKSPACE_API_LAYOUT_MISSING",
      `No writable API layout is configured for table occurrence "${tableOccurrence}" in file "${selected.databaseName}".`,
      `Configure routing.toIndex["${tableOccurrence}"].apiLayoutName or files["${selected.fileId}"].apiLayoutsByTableOccurrence.`,
      {
        workspaceId: graph.workspaceId,
        fileId: selected.fileId,
        databaseName: selected.databaseName,
        tableOccurrence
      }
    );
  }

  if (!selected.host) {
    warnings.push(`File "${selected.databaseName}" is missing host configuration.`);
  }
  if (!selected.username) {
    warnings.push(`File "${selected.databaseName}" is missing username configuration.`);
  }
  if (!selected.password) {
    warnings.push(`File "${selected.databaseName}" is missing password configuration.`);
  }

  return {
    graph,
    target: {
      workspaceId: graph.workspaceId,
      fileId: selected.fileId,
      databaseName: selected.databaseName,
      host: selected.host,
      username: selected.username,
      password: selected.password,
      status: selected.status ?? "unknown",
      tableOccurrence,
      apiLayoutName,
      source,
      relationshipPath: buildRelationshipPath(graph.primaryFileId, selected.fileId, graph.relationshipGraph),
      warnings: [...graph.warnings, ...warnings]
    }
  };
}

export function buildWorkspaceRoutingSnapshot(workspaceId?: string): {
  workspaceId: string;
  files: Array<{
    fileId: string;
    workspaceId: string;
    databaseName: string;
    status: string;
    primary: boolean;
    hasHost: boolean;
    hasUsername: boolean;
    hasPassword: boolean;
  }>;
  indexes: {
    layoutIndexCount: number;
    toIndexCount: number;
    relationshipCount: number;
  };
  warnings: string[];
} {
  const graph = resolveWorkspaceGraph(workspaceId);
  return {
    workspaceId: graph.workspaceId,
    files: graph.files.map((entry) => ({
      fileId: entry.fileId,
      workspaceId: entry.workspaceId,
      databaseName: entry.databaseName,
      status: entry.status ?? "unknown",
      primary: entry.primary === true,
      hasHost: Boolean(entry.host),
      hasUsername: Boolean(entry.username),
      hasPassword: Boolean(entry.password)
    })),
    indexes: {
      layoutIndexCount: Object.keys(graph.layoutIndex).length,
      toIndexCount: Object.keys(graph.toIndex).length,
      relationshipCount: graph.relationshipGraph.length
    },
    warnings: graph.warnings
  };
}

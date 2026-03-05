import { describeFileMakerError, getAvailableLayouts } from "./filemaker-client.ts";
import {
  normalizeWorkspaceId,
  readWorkspaceConfig,
  writeWorkspaceConfig,
  type WorkspaceConfig,
  type WorkspaceFileConfig
} from "./workspace-context.ts";

type DatabaseConnectionStatus = "connected" | "missing" | "locked" | "unknown";

export type WorkspaceDatabaseSessionFile = {
  fileId: string;
  displayName: string;
  databaseName: string;
  host: string;
  username: string;
  hasPassword: boolean;
  sourceFileName: string;
  status: DatabaseConnectionStatus;
  primary: boolean;
  dependencies: string[];
};

export type WorkspaceDatabaseSessionSnapshot = {
  workspaceId: string;
  activeFileId: string;
  activeDatabaseName: string;
  files: WorkspaceDatabaseSessionFile[];
};

export type WorkspaceDatabaseSessionConnectionResult = {
  attempted: boolean;
  ok: boolean;
  source: "mock" | "filemaker" | null;
  error?: string;
  layouts: string[];
  layoutFolders: Array<{
    folder: string | null;
    layouts: string[];
  }>;
};

export type UpdateWorkspaceDatabaseSessionOptions = {
  fileId?: string;
  databaseName?: string;
  displayName?: string;
  host?: string;
  username?: string;
  password?: string;
  clearPassword?: boolean;
  activate?: boolean;
  loadLayouts?: boolean;
};

export type UpdateWorkspaceDatabaseSessionResult = WorkspaceDatabaseSessionSnapshot & {
  connection: WorkspaceDatabaseSessionConnectionResult;
};

function normalizeFileIdToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function safeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function resolveFiles(config: WorkspaceConfig, workspaceId: string): WorkspaceFileConfig[] {
  const existing = Array.isArray(config.files) ? [...config.files] : [];
  if (existing.length > 0) {
    return existing;
  }
  const fallbackDatabase = safeText(config.filemaker?.database) || workspaceId;
  return [
    {
      fileId: normalizeFileIdToken(workspaceId) || "primary",
      displayName: workspaceId,
      databaseName: fallbackDatabase,
      host: safeText(config.filemaker?.host) || undefined,
      username: safeText(config.filemaker?.username) || undefined,
      password: safeText(config.filemaker?.password) || undefined,
      sourceFileName: safeText(config.filemaker?.sourceFileName) || undefined,
      primary: true,
      dependencies: config.filemaker?.dependsOn,
      status: "unknown"
    }
  ];
}

function fileSummary(entry: WorkspaceFileConfig): WorkspaceDatabaseSessionFile {
  return {
    fileId: safeText(entry.fileId),
    displayName: safeText(entry.displayName) || safeText(entry.databaseName) || safeText(entry.fileId),
    databaseName: safeText(entry.databaseName),
    host: safeText(entry.host),
    username: safeText(entry.username),
    hasPassword: safeText(entry.password).length > 0,
    sourceFileName: safeText(entry.sourceFileName),
    status: (entry.status ?? "unknown") as DatabaseConnectionStatus,
    primary: entry.primary === true,
    dependencies: Array.isArray(entry.dependencies)
      ? entry.dependencies.map((dep) => safeText(dep)).filter((dep) => dep.length > 0)
      : []
  };
}

function normalizePrimary(files: WorkspaceFileConfig[], activeFileId?: string): WorkspaceFileConfig[] {
  if (files.length === 0) {
    return files;
  }
  const explicitTargetId = safeText(activeFileId);
  const fallbackTargetId =
    safeText(files.find((entry) => entry.primary === true)?.fileId) || safeText(files[0]?.fileId);
  const selectedTargetId = explicitTargetId || fallbackTargetId;
  if (!selectedTargetId) {
    return files;
  }
  const selectedEntry =
    files.find((entry) => safeText(entry.fileId) === selectedTargetId) ??
    files[0];
  if (!selectedEntry) {
    return files;
  }
  const remainder = files.filter((entry) => safeText(entry.fileId) !== safeText(selectedEntry.fileId));
  const ordered = [selectedEntry, ...remainder];
  return ordered.map((entry, index) => ({
    ...entry,
    primary: index === 0 ? true : undefined
  }));
}

function resolveActiveFile(files: WorkspaceFileConfig[]): WorkspaceFileConfig | null {
  if (files.length === 0) {
    return null;
  }
  return files.find((entry) => entry.primary === true) ?? files[0] ?? null;
}

function classifyConnectionFailure(message: string): DatabaseConnectionStatus {
  const token = message.toLowerCase();
  if (token.includes("401") || token.includes("952") || token.includes("access denied") || token.includes("not authorized")) {
    return "locked";
  }
  if (token.includes("host") || token.includes("network") || token.includes("not found") || token.includes("unreachable")) {
    return "missing";
  }
  return "unknown";
}

async function persistConfig(workspaceId: string, existing: WorkspaceConfig | null, files: WorkspaceFileConfig[]) {
  const active = resolveActiveFile(files);
  const nextFilemaker = {
    host: safeText(active?.host) || safeText(existing?.filemaker?.host) || undefined,
    database: safeText(active?.databaseName) || safeText(existing?.filemaker?.database) || undefined,
    username: safeText(active?.username) || safeText(existing?.filemaker?.username) || undefined,
    password: safeText(active?.password) || safeText(existing?.filemaker?.password) || undefined,
    ddrPath: safeText(existing?.filemaker?.ddrPath) || undefined,
    summaryPath: safeText(existing?.filemaker?.summaryPath) || undefined,
    sourceFileName: safeText(existing?.filemaker?.sourceFileName) || undefined,
    solutionName: safeText(existing?.filemaker?.solutionName) || undefined,
    dependsOn: existing?.filemaker?.dependsOn ?? undefined,
    externalDataSources: existing?.filemaker?.externalDataSources ?? undefined
  };

  return writeWorkspaceConfig(workspaceId, {
    name: safeText(existing?.name) || workspaceId,
    filemaker: nextFilemaker,
    files,
    routing: existing?.routing
  });
}

function snapshotFromConfig(workspaceId: string, config: WorkspaceConfig): WorkspaceDatabaseSessionSnapshot {
  const files = resolveFiles(config, workspaceId);
  const active = resolveActiveFile(files);
  return {
    workspaceId,
    activeFileId: safeText(active?.fileId),
    activeDatabaseName: safeText(active?.databaseName),
    files: files.map(fileSummary).sort((left, right) => {
      if (left.primary !== right.primary) {
        return left.primary ? -1 : 1;
      }
      return left.displayName.localeCompare(right.displayName, undefined, { sensitivity: "base" });
    })
  };
}

export async function readWorkspaceDatabaseSession(workspaceId?: string): Promise<WorkspaceDatabaseSessionSnapshot> {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
  const existing = await readWorkspaceConfig(normalizedWorkspaceId);
  if (!existing) {
    return {
      workspaceId: normalizedWorkspaceId,
      activeFileId: "",
      activeDatabaseName: "",
      files: []
    };
  }
  return snapshotFromConfig(normalizedWorkspaceId, existing);
}

export async function updateWorkspaceDatabaseSession(
  workspaceId: string,
  options: UpdateWorkspaceDatabaseSessionOptions
): Promise<UpdateWorkspaceDatabaseSessionResult> {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
  const existing = await readWorkspaceConfig(normalizedWorkspaceId);
  const baseConfig: WorkspaceConfig = existing ?? {
    version: 2,
    id: normalizedWorkspaceId,
    name: normalizedWorkspaceId
  };

  const files = resolveFiles(baseConfig, normalizedWorkspaceId);

  const requestedFileId = safeText(options.fileId);
  const requestedDatabaseName = safeText(options.databaseName);
  let selected = files.find((entry) => safeText(entry.fileId) === requestedFileId);
  if (!selected && requestedDatabaseName) {
    selected = files.find(
      (entry) => safeText(entry.databaseName).toLowerCase() === requestedDatabaseName.toLowerCase()
    );
  }
  if (!selected && (requestedFileId || requestedDatabaseName)) {
    const derivedFileId = normalizeFileIdToken(requestedFileId || requestedDatabaseName) || `file-${files.length + 1}`;
    selected = {
      fileId: derivedFileId,
      displayName: requestedDatabaseName || requestedFileId || derivedFileId,
      databaseName: requestedDatabaseName || requestedFileId || derivedFileId,
      status: "unknown"
    };
    files.push(selected);
  }
  if (!selected) {
    selected = resolveActiveFile(files) ?? undefined;
  }
  if (!selected) {
    throw new Error("No database files are configured for this solution.");
  }

  const selectedIndex = files.findIndex((entry) => safeText(entry.fileId) === safeText(selected?.fileId));
  if (selectedIndex >= 0) {
    const updated = { ...files[selectedIndex] };
    if (requestedDatabaseName) {
      updated.databaseName = requestedDatabaseName;
    }
    const nextDisplayName = safeText(options.displayName);
    if (nextDisplayName) {
      updated.displayName = nextDisplayName;
    }
    const nextHost = safeText(options.host);
    if (nextHost || options.host === "") {
      updated.host = nextHost || undefined;
    }
    const nextUsername = safeText(options.username);
    if (nextUsername || options.username === "") {
      updated.username = nextUsername || undefined;
    }
    if (options.clearPassword === true) {
      updated.password = undefined;
    } else {
      const nextPassword = safeText(options.password);
      if (nextPassword) {
        updated.password = nextPassword;
      }
    }
    files[selectedIndex] = updated;
    selected = updated;
  }

  const activate = options.activate !== false;
  const normalizedFiles = normalizePrimary(files, activate ? safeText(selected.fileId) : undefined);
  const persisted = await persistConfig(normalizedWorkspaceId, existing, normalizedFiles);

  const connection: WorkspaceDatabaseSessionConnectionResult = {
    attempted: false,
    ok: true,
    source: null,
    layouts: [],
    layoutFolders: []
  };

  const shouldLoadLayouts = options.loadLayouts !== false;
  if (shouldLoadLayouts) {
    connection.attempted = true;
    try {
      const layoutPayload = await getAvailableLayouts({
        workspaceId: normalizedWorkspaceId,
        fileId: safeText(selected.fileId),
        databaseName: safeText(selected.databaseName),
        layoutName: safeText(selected.databaseName)
      });
      connection.ok = true;
      connection.source = layoutPayload.source;
      connection.layouts = Array.isArray(layoutPayload.layouts) ? [...layoutPayload.layouts] : [];
      connection.layoutFolders = Array.isArray(layoutPayload.layoutFolders) ? [...layoutPayload.layoutFolders] : [];

      const connectedStatus: DatabaseConnectionStatus = layoutPayload.source === "filemaker" ? "connected" : "unknown";
      const nextFiles = normalizePrimary(
        persisted.files?.map((entry) =>
          safeText(entry.fileId) === safeText(selected.fileId)
            ? {
                ...entry,
                status: connectedStatus
              }
            : entry
        ) ?? [],
        persisted.files?.find((entry) => entry.primary === true)?.fileId
      );
      await persistConfig(normalizedWorkspaceId, persisted, nextFiles);
    } catch (error) {
      const described = describeFileMakerError(error);
      connection.ok = false;
      connection.source = null;
      connection.error = described.message;

      const failedStatus = classifyConnectionFailure(described.message);
      const nextFiles = normalizePrimary(
        (persisted.files ?? []).map((entry) =>
          safeText(entry.fileId) === safeText(selected.fileId)
            ? {
                ...entry,
                status: failedStatus
              }
            : entry
        ),
        persisted.files?.find((entry) => entry.primary === true)?.fileId
      );
      await persistConfig(normalizedWorkspaceId, persisted, nextFiles);
    }
  }

  const refreshed = await readWorkspaceConfig(normalizedWorkspaceId);
  const snapshot = refreshed
    ? snapshotFromConfig(normalizedWorkspaceId, refreshed)
    : {
        workspaceId: normalizedWorkspaceId,
        activeFileId: "",
        activeDatabaseName: "",
        files: []
      };
  return {
    ...snapshot,
    connection
  };
}

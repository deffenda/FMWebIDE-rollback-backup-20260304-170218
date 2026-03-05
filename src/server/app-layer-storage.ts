import { promises as fs } from "node:fs";
import path from "node:path";
import {
  ensureWorkspaceStorage,
  normalizeWorkspaceId,
  workspaceRootPath
} from "./workspace-context.ts";

export type AppLayerExternalDataSourceType =
  | "odbc"
  | "jdbc"
  | "rest"
  | "filemaker-data-api"
  | "other";

export type AppLayerExternalDataSourceEntry = {
  id: string;
  name: string;
  type: AppLayerExternalDataSourceType;
  host: string;
  database: string;
  description?: string;
  enabled: boolean;
};

export type AppLayerCustomFunctionEntry = {
  id: string;
  name: string;
  parameters: string[];
  definition: string;
  source: "ddr" | "workspace";
  notes?: string;
};

export type AppLayerThemeEntry = {
  id: string;
  name: string;
  description?: string;
  source: "filemaker" | "workspace";
};

export type AppLayerSecurityRoleEntry = {
  id: string;
  name: string;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  notes?: string;
};

export type AppLayerContainerSettings = {
  cacheSeconds: number;
  maxPreviewBytes: number;
  allowUploads: boolean;
};

export type AppLayerPreferences = {
  general: {
    showStatusToolbar: boolean;
    showFormattingBar: boolean;
    compactStatusArea: boolean;
  };
  runtime: {
    defaultBrowseView: "form" | "list" | "table";
    autoRefreshOnOpen: boolean;
    enablePolling: boolean;
  };
  debug: {
    enableDebugOverlay: boolean;
    enableScriptTrace: boolean;
    enableCalcDiagnostics: boolean;
  };
  security: {
    maskSensitiveDebugValues: boolean;
    requireConfirmOnDelete: boolean;
  };
};

export type AppLayerFileOptionEntry = {
  fileId: string;
  defaultLayout: string;
  onOpenScript: string;
  onCloseScript: string;
  openToDefaultLayout: boolean;
  menuSet: string;
  runOnOpenScript: boolean;
  runOnCloseScript: boolean;
  openHidden: boolean;
  spellingUnderline: boolean;
  spellingSuggest: boolean;
  textSmartQuotes: boolean;
  textSmartDashes: boolean;
  textDirection: "default" | "ltr" | "rtl";
  notes?: string;
};

export type AppLayerSharingEntry = {
  fileId: string;
  networkAccess: "off" | "local" | "all";
  requireAccountPrivilege: boolean;
  showInOpenRemote: boolean;
  webDirectEnabled: boolean;
  webDirectRequireSecure: boolean;
  webDirectAllowPrinting: boolean;
  webDirectDisconnectMinutes: number;
  odbcJdbcEnabled: boolean;
  odbcJdbcMode: "all-users" | "extended-privilege";
  odbcJdbcAllowExecuteSql: boolean;
  notes?: string;
};

export type AppLayerFileReferenceEntry = {
  id: string;
  sourceFileId: string;
  targetFileId: string;
  connectionHint: string;
  required: boolean;
  status: "ok" | "warning" | "missing";
  notes?: string;
};

export type AppLayerAuthProfileEntry = {
  id: string;
  name: string;
  host: string;
  database: string;
  username: string;
  workspaceFileIds: string[];
  enabled: boolean;
  lastTestStatus: "unknown" | "ok" | "failed";
  notes?: string;
};

export type AppLayerPluginPreferenceEntry = {
  pluginId: string;
  enabled: boolean;
  notes?: string;
};

export type AppLayerWorkspaceConfig = {
  externalDataSources: AppLayerExternalDataSourceEntry[];
  customFunctions: AppLayerCustomFunctionEntry[];
  themes: AppLayerThemeEntry[];
  securityRoles: AppLayerSecurityRoleEntry[];
  containerSettings: AppLayerContainerSettings;
  preferences: AppLayerPreferences;
  fileOptions: AppLayerFileOptionEntry[];
  sharing: AppLayerSharingEntry[];
  fileReferences: AppLayerFileReferenceEntry[];
  authProfiles: AppLayerAuthProfileEntry[];
  pluginPreferences: AppLayerPluginPreferenceEntry[];
  updatedAt: string;
};

function storagePath(workspaceId?: string): string {
  return path.join(workspaceRootPath(workspaceId), "app-layer.json");
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeExternalDataSourceType(value: unknown): AppLayerExternalDataSourceType {
  const token = cleanText(value).toLowerCase();
  switch (token) {
    case "odbc":
    case "jdbc":
    case "rest":
    case "filemaker-data-api":
      return token;
    default:
      return "other";
  }
}

function normalizeExternalDataSource(
  entry: unknown,
  fallbackIndex: number
): AppLayerExternalDataSourceEntry | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const candidate = entry as Record<string, unknown>;
  const name = cleanText(candidate.name);
  if (!name) {
    return null;
  }
  const id = cleanText(candidate.id) || `source-${fallbackIndex + 1}`;
  return {
    id,
    name,
    type: normalizeExternalDataSourceType(candidate.type),
    host: cleanText(candidate.host),
    database: cleanText(candidate.database),
    description: cleanText(candidate.description) || undefined,
    enabled: candidate.enabled !== false
  };
}

function normalizeCustomFunction(entry: unknown, fallbackIndex: number): AppLayerCustomFunctionEntry | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const candidate = entry as Record<string, unknown>;
  const name = cleanText(candidate.name);
  if (!name) {
    return null;
  }
  const rawParameters = Array.isArray(candidate.parameters)
    ? candidate.parameters.map((param) => cleanText(param)).filter((param) => param.length > 0)
    : [];
  const source = cleanText(candidate.source).toLowerCase() === "ddr" ? "ddr" : "workspace";
  return {
    id: cleanText(candidate.id) || `cf-${fallbackIndex + 1}`,
    name,
    parameters: rawParameters,
    definition: cleanText(candidate.definition),
    source,
    notes: cleanText(candidate.notes) || undefined
  };
}

function normalizeTheme(entry: unknown, fallbackIndex: number): AppLayerThemeEntry | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const candidate = entry as Record<string, unknown>;
  const name = cleanText(candidate.name);
  if (!name) {
    return null;
  }
  const source = cleanText(candidate.source).toLowerCase() === "filemaker" ? "filemaker" : "workspace";
  return {
    id: cleanText(candidate.id) || `theme-${fallbackIndex + 1}`,
    name,
    description: cleanText(candidate.description) || undefined,
    source
  };
}

function normalizeSecurityRole(entry: unknown, fallbackIndex: number): AppLayerSecurityRoleEntry | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const candidate = entry as Record<string, unknown>;
  const name = cleanText(candidate.name);
  if (!name) {
    return null;
  }
  return {
    id: cleanText(candidate.id) || `role-${fallbackIndex + 1}`,
    name,
    canView: candidate.canView !== false,
    canEdit: candidate.canEdit !== false,
    canDelete: candidate.canDelete !== false,
    notes: cleanText(candidate.notes) || undefined
  };
}

function normalizeContainerSettings(value: unknown): AppLayerContainerSettings {
  if (!value || typeof value !== "object") {
    return {
      cacheSeconds: 0,
      maxPreviewBytes: 8_388_608,
      allowUploads: true
    };
  }
  const candidate = value as Record<string, unknown>;
  const cacheSeconds = Number.isFinite(candidate.cacheSeconds)
    ? Math.max(0, Math.round(Number(candidate.cacheSeconds)))
    : 0;
  const maxPreviewBytes = Number.isFinite(candidate.maxPreviewBytes)
    ? Math.max(512_000, Math.round(Number(candidate.maxPreviewBytes)))
    : 8_388_608;
  const allowUploads = candidate.allowUploads !== false;
  return {
    cacheSeconds,
    maxPreviewBytes,
    allowUploads
  };
}

function normalizePreferences(value: unknown): AppLayerPreferences {
  const asObject = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const general = asObject.general && typeof asObject.general === "object" ? (asObject.general as Record<string, unknown>) : {};
  const runtime = asObject.runtime && typeof asObject.runtime === "object" ? (asObject.runtime as Record<string, unknown>) : {};
  const debug = asObject.debug && typeof asObject.debug === "object" ? (asObject.debug as Record<string, unknown>) : {};
  const security = asObject.security && typeof asObject.security === "object" ? (asObject.security as Record<string, unknown>) : {};
  const browseViewToken = cleanText(runtime.defaultBrowseView).toLowerCase();
  const defaultBrowseView: "form" | "list" | "table" =
    browseViewToken === "list" ? "list" : browseViewToken === "table" ? "table" : "form";
  return {
    general: {
      showStatusToolbar: general.showStatusToolbar !== false,
      showFormattingBar: general.showFormattingBar === true,
      compactStatusArea: general.compactStatusArea === true
    },
    runtime: {
      defaultBrowseView,
      autoRefreshOnOpen: runtime.autoRefreshOnOpen !== false,
      enablePolling: runtime.enablePolling === true
    },
    debug: {
      enableDebugOverlay: debug.enableDebugOverlay === true,
      enableScriptTrace: debug.enableScriptTrace === true,
      enableCalcDiagnostics: debug.enableCalcDiagnostics === true
    },
    security: {
      maskSensitiveDebugValues: security.maskSensitiveDebugValues !== false,
      requireConfirmOnDelete: security.requireConfirmOnDelete !== false
    }
  };
}

function normalizeFileOption(entry: unknown): AppLayerFileOptionEntry | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const candidate = entry as Record<string, unknown>;
  const fileId = cleanText(candidate.fileId);
  if (!fileId) {
    return null;
  }
  const textDirectionToken = cleanText(candidate.textDirection).toLowerCase();
  const textDirection: "default" | "ltr" | "rtl" =
    textDirectionToken === "ltr" ? "ltr" : textDirectionToken === "rtl" ? "rtl" : "default";
  return {
    fileId,
    defaultLayout: cleanText(candidate.defaultLayout),
    onOpenScript: cleanText(candidate.onOpenScript),
    onCloseScript: cleanText(candidate.onCloseScript),
    openToDefaultLayout: candidate.openToDefaultLayout !== false,
    menuSet: cleanText(candidate.menuSet),
    runOnOpenScript: candidate.runOnOpenScript !== false,
    runOnCloseScript: candidate.runOnCloseScript !== false,
    openHidden: candidate.openHidden === true,
    spellingUnderline: candidate.spellingUnderline !== false,
    spellingSuggest: candidate.spellingSuggest !== false,
    textSmartQuotes: candidate.textSmartQuotes !== false,
    textSmartDashes: candidate.textSmartDashes !== false,
    textDirection,
    notes: cleanText(candidate.notes) || undefined
  };
}

function normalizeSharingEntry(entry: unknown): AppLayerSharingEntry | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const candidate = entry as Record<string, unknown>;
  const fileId = cleanText(candidate.fileId);
  if (!fileId) {
    return null;
  }
  const networkAccessToken = cleanText(candidate.networkAccess).toLowerCase();
  const networkAccess: "off" | "local" | "all" =
    networkAccessToken === "local" ? "local" : networkAccessToken === "all" ? "all" : "off";
  const odbcJdbcModeToken = cleanText(candidate.odbcJdbcMode).toLowerCase();
  const odbcJdbcMode: "all-users" | "extended-privilege" =
    odbcJdbcModeToken === "all-users" ? "all-users" : "extended-privilege";
  const rawDisconnectMinutes = Number(candidate.webDirectDisconnectMinutes);
  const webDirectDisconnectMinutes = Number.isFinite(rawDisconnectMinutes)
    ? Math.min(240, Math.max(1, Math.round(rawDisconnectMinutes)))
    : 15;
  return {
    fileId,
    networkAccess,
    requireAccountPrivilege: candidate.requireAccountPrivilege !== false,
    showInOpenRemote: candidate.showInOpenRemote !== false,
    webDirectEnabled: candidate.webDirectEnabled === true,
    webDirectRequireSecure: candidate.webDirectRequireSecure !== false,
    webDirectAllowPrinting: candidate.webDirectAllowPrinting !== false,
    webDirectDisconnectMinutes,
    odbcJdbcEnabled: candidate.odbcJdbcEnabled === true,
    odbcJdbcMode,
    odbcJdbcAllowExecuteSql: candidate.odbcJdbcAllowExecuteSql !== false,
    notes: cleanText(candidate.notes) || undefined
  };
}

function normalizeFileReference(entry: unknown, fallbackIndex: number): AppLayerFileReferenceEntry | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const candidate = entry as Record<string, unknown>;
  const sourceFileId = cleanText(candidate.sourceFileId);
  const targetFileId = cleanText(candidate.targetFileId);
  if (!sourceFileId || !targetFileId) {
    return null;
  }
  const statusToken = cleanText(candidate.status).toLowerCase();
  const status: "ok" | "warning" | "missing" =
    statusToken === "ok" ? "ok" : statusToken === "warning" ? "warning" : "missing";
  return {
    id: cleanText(candidate.id) || `ref-${fallbackIndex + 1}`,
    sourceFileId,
    targetFileId,
    connectionHint: cleanText(candidate.connectionHint),
    required: candidate.required !== false,
    status,
    notes: cleanText(candidate.notes) || undefined
  };
}

function normalizeAuthProfile(entry: unknown, fallbackIndex: number): AppLayerAuthProfileEntry | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const candidate = entry as Record<string, unknown>;
  const name = cleanText(candidate.name);
  if (!name) {
    return null;
  }
  const statusToken = cleanText(candidate.lastTestStatus).toLowerCase();
  const lastTestStatus: "unknown" | "ok" | "failed" =
    statusToken === "ok" ? "ok" : statusToken === "failed" ? "failed" : "unknown";
  const workspaceFileIds = Array.isArray(candidate.workspaceFileIds)
    ? candidate.workspaceFileIds.map((token) => cleanText(token)).filter((token) => token.length > 0)
    : [];
  return {
    id: cleanText(candidate.id) || `auth-${fallbackIndex + 1}`,
    name,
    host: cleanText(candidate.host),
    database: cleanText(candidate.database),
    username: cleanText(candidate.username),
    workspaceFileIds,
    enabled: candidate.enabled !== false,
    lastTestStatus,
    notes: cleanText(candidate.notes) || undefined
  };
}

function normalizePluginPreference(entry: unknown): AppLayerPluginPreferenceEntry | null {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const candidate = entry as Record<string, unknown>;
  const pluginId = cleanText(candidate.pluginId);
  if (!pluginId) {
    return null;
  }
  return {
    pluginId,
    enabled: candidate.enabled !== false,
    notes: cleanText(candidate.notes) || undefined
  };
}

function buildDefaultConfig(): AppLayerWorkspaceConfig {
  return {
    externalDataSources: [],
    customFunctions: [],
    themes: [],
    securityRoles: [
      {
        id: "full-access",
        name: "fullAccess",
        canView: true,
        canEdit: true,
        canDelete: true,
        notes: "Default unrestricted runtime simulation role."
      },
      {
        id: "read-only",
        name: "readOnly",
        canView: true,
        canEdit: false,
        canDelete: false,
        notes: "Runtime read-only simulation role."
      },
      {
        id: "restricted",
        name: "restricted",
        canView: true,
        canEdit: true,
        canDelete: false,
        notes: "Runtime restricted simulation role."
      }
    ],
    containerSettings: {
      cacheSeconds: 0,
      maxPreviewBytes: 8_388_608,
      allowUploads: true
    },
    preferences: {
      general: {
        showStatusToolbar: true,
        showFormattingBar: false,
        compactStatusArea: false
      },
      runtime: {
        defaultBrowseView: "form",
        autoRefreshOnOpen: true,
        enablePolling: false
      },
      debug: {
        enableDebugOverlay: false,
        enableScriptTrace: false,
        enableCalcDiagnostics: false
      },
      security: {
        maskSensitiveDebugValues: true,
        requireConfirmOnDelete: true
      }
    },
    fileOptions: [],
    sharing: [],
    fileReferences: [],
    authProfiles: [],
    pluginPreferences: [],
    updatedAt: new Date().toISOString()
  };
}

function normalizeConfig(raw: Partial<AppLayerWorkspaceConfig> | null | undefined): AppLayerWorkspaceConfig {
  const defaults = buildDefaultConfig();
  const updatedAt =
    cleanText((raw as Partial<AppLayerWorkspaceConfig> | null | undefined)?.updatedAt) || defaults.updatedAt;

  const externalDataSources = Array.isArray(raw?.externalDataSources)
    ? raw.externalDataSources
        .map((entry, index) => normalizeExternalDataSource(entry, index))
        .filter((entry): entry is AppLayerExternalDataSourceEntry => Boolean(entry))
    : defaults.externalDataSources;

  const customFunctions = Array.isArray(raw?.customFunctions)
    ? raw.customFunctions
        .map((entry, index) => normalizeCustomFunction(entry, index))
        .filter((entry): entry is AppLayerCustomFunctionEntry => Boolean(entry))
    : defaults.customFunctions;

  const themes = Array.isArray(raw?.themes)
    ? raw.themes
        .map((entry, index) => normalizeTheme(entry, index))
        .filter((entry): entry is AppLayerThemeEntry => Boolean(entry))
    : defaults.themes;

  const securityRoles = Array.isArray(raw?.securityRoles)
    ? raw.securityRoles
        .map((entry, index) => normalizeSecurityRole(entry, index))
        .filter((entry): entry is AppLayerSecurityRoleEntry => Boolean(entry))
    : defaults.securityRoles;

  const fileOptions = Array.isArray(raw?.fileOptions)
    ? raw.fileOptions
        .map((entry) => normalizeFileOption(entry))
        .filter((entry): entry is AppLayerFileOptionEntry => Boolean(entry))
    : defaults.fileOptions;

  const sharing = Array.isArray(raw?.sharing)
    ? raw.sharing
        .map((entry) => normalizeSharingEntry(entry))
        .filter((entry): entry is AppLayerSharingEntry => Boolean(entry))
    : defaults.sharing;

  const fileReferences = Array.isArray(raw?.fileReferences)
    ? raw.fileReferences
        .map((entry, index) => normalizeFileReference(entry, index))
        .filter((entry): entry is AppLayerFileReferenceEntry => Boolean(entry))
    : defaults.fileReferences;

  const authProfiles = Array.isArray(raw?.authProfiles)
    ? raw.authProfiles
        .map((entry, index) => normalizeAuthProfile(entry, index))
        .filter((entry): entry is AppLayerAuthProfileEntry => Boolean(entry))
    : defaults.authProfiles;

  const pluginPreferences = Array.isArray(raw?.pluginPreferences)
    ? raw.pluginPreferences
        .map((entry) => normalizePluginPreference(entry))
        .filter((entry): entry is AppLayerPluginPreferenceEntry => Boolean(entry))
    : defaults.pluginPreferences;

  return {
    externalDataSources,
    customFunctions,
    themes,
    securityRoles: securityRoles.length > 0 ? securityRoles : defaults.securityRoles,
    containerSettings: normalizeContainerSettings(raw?.containerSettings),
    preferences: normalizePreferences(raw?.preferences),
    fileOptions,
    sharing,
    fileReferences,
    authProfiles,
    pluginPreferences,
    updatedAt
  };
}

export async function readAppLayerWorkspaceConfig(workspaceId?: string): Promise<AppLayerWorkspaceConfig> {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
  await ensureWorkspaceStorage(normalizedWorkspaceId);
  const filePath = storagePath(normalizedWorkspaceId);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<AppLayerWorkspaceConfig>;
    return normalizeConfig(parsed);
  } catch {
    const defaults = buildDefaultConfig();
    await fs.writeFile(filePath, JSON.stringify(defaults, null, 2), "utf8");
    return defaults;
  }
}

export async function writeAppLayerWorkspaceConfig(
  workspaceId: string,
  config: Partial<AppLayerWorkspaceConfig>
): Promise<AppLayerWorkspaceConfig> {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
  await ensureWorkspaceStorage(normalizedWorkspaceId);
  const normalized = {
    ...normalizeConfig(config),
    updatedAt: new Date().toISOString()
  };
  await fs.writeFile(storagePath(normalizedWorkspaceId), JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
}

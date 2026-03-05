export type AppLayerCapabilityStatus = "implemented" | "partial" | "missing" | "not-feasible";

export type AppLayerCapabilityKey =
  | "manageDatabase"
  | "manageSecurity"
  | "manageValueLists"
  | "manageLayouts"
  | "manageScripts"
  | "manageExternalDataSources"
  | "manageContainers"
  | "manageCustomFunctions"
  | "manageCustomMenus"
  | "manageThemes"
  | "preferences"
  | "fileOptions"
  | "sharing"
  | "recover"
  | "scriptDebugger"
  | "dataViewer"
  | "windowTiling"
  | "helpDiagnostics"
  | "appLayerCapabilities"
  | "importExport"
  | "fileReferences"
  | "authProfiles"
  | "pluginManager"
  | "windowManagementExtras"
  | "workspaceVersioning"
  | "publishPromote"
  | "adminConsole"
  | "recoverySafeMode";

export type AppLayerCapability = {
  id: `APP-${number}` | `APPX-${number}`;
  key: AppLayerCapabilityKey;
  label: string;
  menuPath: string;
  status: AppLayerCapabilityStatus;
  enabled: boolean;
  rationale?: string;
  availableInstead?: string;
  docsHref: string;
  prerequisites?: string[];
  requiredModules?: string[];
  experimental?: boolean;
};

export type AppLayerCapabilityOverrideMap = Partial<Record<AppLayerCapabilityKey, boolean>>;

type CapabilityDefinition = Omit<AppLayerCapability, "enabled" | "docsHref"> & {
  defaultEnabled: boolean;
  docsAnchor?: string;
};

function readBooleanEnv(name: string, defaultValue: boolean): boolean {
  const token = String(process.env[name] ?? "").trim().toLowerCase();
  if (!token) {
    return defaultValue;
  }
  if (token === "1" || token === "true" || token === "yes" || token === "on") {
    return true;
  }
  if (token === "0" || token === "false" || token === "no" || token === "off") {
    return false;
  }
  return defaultValue;
}

export const appLayerFeatureFlags = {
  experimentalUiEnabled: readBooleanEnv(
    "NEXT_PUBLIC_APP_LAYER_ENABLE_EXPERIMENTAL",
    process.env.NODE_ENV !== "production"
  )
};

const MATRIX_DOC_PATH = "/docs/app-layer-parity-matrix.md";

function capabilityDocHref(definition: CapabilityDefinition): string {
  const anchor = definition.docsAnchor?.trim() || definition.id;
  return `${MATRIX_DOC_PATH}#${anchor}`;
}

const capabilityDefinitions: Record<AppLayerCapabilityKey, CapabilityDefinition> = {
  manageDatabase: {
    id: "APP-101",
    key: "manageDatabase",
    label: "Manage Database",
    menuPath: "File > Manage > Database...",
    status: "partial",
    defaultEnabled: true,
    rationale: "Workspace schema editing is available, but live FileMaker schema mutation is intentionally limited.",
    availableInstead: "Use workspace schema editing and Export Migration Plan for controlled rollout."
  },
  manageSecurity: {
    id: "APP-102",
    key: "manageSecurity",
    label: "Manage Security",
    menuPath: "File > Manage > Security...",
    status: "partial",
    defaultEnabled: true,
    rationale: "Live account and privilege-set mutation is not supported in the web runtime.",
    availableInstead: "Use read-only privilege diagnostics and runtime role simulation."
  },
  manageValueLists: {
    id: "APP-103",
    key: "manageValueLists",
    label: "Manage Value Lists",
    menuPath: "File > Manage > Value Lists...",
    status: "partial",
    defaultEnabled: true,
    rationale: "Workspace-level value list editing is supported; native FileMaker admin parity is partial.",
    availableInstead: "Manage list definitions in workspace storage and apply at runtime."
  },
  manageLayouts: {
    id: "APP-104",
    key: "manageLayouts",
    label: "Manage Layouts",
    menuPath: "File > Manage > Layouts...",
    status: "partial",
    defaultEnabled: true,
    rationale: "Workspace-level layout management is supported; live server layout mutation remains limited.",
    availableInstead: "Use layout JSON workflows for duplicate/rename/delete/open operations."
  },
  manageScripts: {
    id: "APP-105",
    key: "manageScripts",
    label: "Manage Scripts",
    menuPath: "File > Manage > Scripts...",
    status: "partial",
    defaultEnabled: true,
    rationale: "Script workspace and runtime execution exist; full native script authoring parity is partial.",
    availableInstead: "Run scripts with current context and inspect support matrix in Scripts Manager."
  },
  manageExternalDataSources: {
    id: "APP-106",
    key: "manageExternalDataSources",
    label: "Manage External Data Sources",
    menuPath: "File > Manage > External Data Sources...",
    status: "partial",
    defaultEnabled: true,
    rationale: "Registry and diagnostics are available; ESS/ODBC runtime integration is not yet implemented.",
    availableInstead: "Register external source metadata placeholders and plugin adapter references.",
    experimental: true
  },
  manageContainers: {
    id: "APP-107",
    key: "manageContainers",
    label: "Manage Containers",
    menuPath: "File > Manage > Containers...",
    status: "partial",
    defaultEnabled: true,
    rationale: "Container diagnostics and proxy controls are supported; advanced external storage controls are limited.",
    availableInstead: "Use proxy/cache diagnostics and workspace upload/fetch policies."
  },
  manageCustomFunctions: {
    id: "APP-108",
    key: "manageCustomFunctions",
    label: "Manage Custom Functions",
    menuPath: "File > Manage > Custom Functions...",
    status: "partial",
    defaultEnabled: true,
    rationale: "Custom function browsing is available; full FileMaker custom function runtime parity is limited.",
    availableInstead: "Use FMCalc-lite-compatible definitions and diagnostics for supported subsets."
  },
  manageCustomMenus: {
    id: "APP-109",
    key: "manageCustomMenus",
    label: "Manage Custom Menus",
    menuPath: "File > Manage > Custom Menus...",
    status: "partial",
    defaultEnabled: true,
    rationale: "Custom menu sets are workspace-managed and partially mapped to runtime menubars.",
    availableInstead: "Use workspace menu set editor with runtime preview for supported actions."
  },
  manageThemes: {
    id: "APP-110",
    key: "manageThemes",
    label: "Manage Themes",
    menuPath: "File > Manage > Themes...",
    status: "partial",
    defaultEnabled: true,
    rationale: "Workspace theme application is supported; native FileMaker theme import parity is partial.",
    availableInstead: "Apply workspace-managed themes and style tokens to active layouts."
  },
  preferences: {
    id: "APPX-201",
    key: "preferences",
    label: "Preferences",
    menuPath: "FileMaker Pro > Preferences...",
    status: "partial",
    defaultEnabled: true,
    rationale: "Preferences are available, but native OS-level preference scope is reduced in the browser.",
    requiredModules: ["workspace-settings", "runtime-ui"]
  },
  fileOptions: {
    id: "APPX-203",
    key: "fileOptions",
    label: "File Options",
    menuPath: "File > File Options...",
    status: "partial",
    defaultEnabled: true,
    rationale: "Workspace-level file options are available; direct live FileMaker file options mutation is not supported.",
    requiredModules: ["workspace-metadata", "layout-routing"]
  },
  sharing: {
    id: "APPX-202",
    key: "sharing",
    label: "Sharing/Hosting",
    menuPath: "File > Sharing",
    status: "partial",
    defaultEnabled: true,
    rationale: "Live hosting/admin mutation is server-managed; FMWeb provides FileMaker-style sharing dialogs as workspace metadata plus diagnostics.",
    availableInstead: "Use sharing dialogs for network/WebDirect/ODBC settings and run connection diagnostics before server deployment.",
    requiredModules: ["workspace-routing", "health-endpoint"]
  },
  recover: {
    id: "APPX-204",
    key: "recover",
    label: "Recover",
    menuPath: "File > Recover...",
    status: "not-feasible",
    defaultEnabled: false,
    rationale: "Recover/Clone/Compact are desktop or server maintenance operations and cannot be executed safely from the browser.",
    requiredModules: ["desktop-file-ops"]
  },
  importExport: {
    id: "APPX-205",
    key: "importExport",
    label: "Import/Export",
    menuPath: "File > Import Records... / Export Records...",
    status: "partial",
    defaultEnabled: true,
    rationale: "CSV/JSON flows are supported; full native format parity is partial.",
    availableInstead: "Use the Import/Export Center for CSV and JSON workflows.",
    requiredModules: ["import-export-center", "workspace-routing"]
  },
  scriptDebugger: {
    id: "APPX-206",
    key: "scriptDebugger",
    label: "Script Debugger",
    menuPath: "Tools > Script Debugger",
    status: "partial",
    defaultEnabled: true,
    rationale: "Debug tracing is available; full native debugger controls are not yet complete.",
    requiredModules: ["script-engine", "runtime-debug"]
  },
  dataViewer: {
    id: "APPX-207",
    key: "dataViewer",
    label: "Data Viewer",
    menuPath: "Tools > Data Viewer",
    status: "partial",
    defaultEnabled: true,
    rationale: "Data viewer UI exists in layout mode with read-only/runtime-limited behavior.",
    requiredModules: ["fmcalc-lite", "runtime-debug"]
  },
  fileReferences: {
    id: "APPX-208",
    key: "fileReferences",
    label: "File References",
    menuPath: "File > File References...",
    status: "partial",
    defaultEnabled: true,
    rationale: "Workspace file dependency mapping is supported; direct server-side reference mutation is not.",
    availableInstead: "Use workspace dependency mapping and diagnostics.",
    requiredModules: ["workspace-multifile", "workspace-routing"]
  },
  authProfiles: {
    id: "APPX-209",
    key: "authProfiles",
    label: "Auth Profiles",
    menuPath: "File > Auth Profiles...",
    status: "partial",
    defaultEnabled: true,
    rationale: "Profile management and connection tests are workspace-scoped; secure credentials remain server-side.",
    availableInstead: "Use Solution Settings for active file credentials and Auth Profiles for test mappings.",
    requiredModules: ["workspace-settings", "security-guard"]
  },
  pluginManager: {
    id: "APPX-210",
    key: "pluginManager",
    label: "Plugin Manager",
    menuPath: "Tools > Plugin Manager...",
    status: "partial",
    defaultEnabled: true,
    rationale: "Plugin SDK is available; install/discovery registry workflows are limited.",
    requiredModules: ["plugin-sdk"]
  },
  windowTiling: {
    id: "APPX-211",
    key: "windowTiling",
    label: "Window Tiling/Cascade",
    menuPath: "Window > Tile/Cascade",
    status: "partial",
    defaultEnabled: false,
    rationale: "Native window arrangement semantics are constrained in browser runtime.",
    requiredModules: ["multi-window"],
    experimental: true
  },
  windowManagementExtras: {
    id: "APPX-211",
    key: "windowManagementExtras",
    label: "Window Management Extras",
    menuPath: "Window > New/Close/Next/Previous",
    status: "partial",
    defaultEnabled: true,
    rationale: "Browser-safe window actions are supported; desktop-native window choreography remains partial.",
    requiredModules: ["multi-window"]
  },
  helpDiagnostics: {
    id: "APPX-212",
    key: "helpDiagnostics",
    label: "Help/Diagnostics",
    menuPath: "Help",
    status: "partial",
    defaultEnabled: true,
    rationale: "Help links and diagnostics exist; parity depends on platform/browser integration.",
    requiredModules: ["diagnostics-export", "runtime-debug"]
  },
  appLayerCapabilities: {
    id: "APP-119",
    key: "appLayerCapabilities",
    label: "App Layer Capabilities",
    menuPath: "View > App Layer Capabilities...",
    status: "implemented",
    defaultEnabled: true,
    rationale: "Centralized capability registry with rationale and parity links."
  },
  workspaceVersioning: {
    id: "APP-120",
    key: "workspaceVersioning",
    label: "Workspace Version History",
    menuPath: "File > Version History...",
    status: "partial",
    defaultEnabled: true,
    rationale:
      "Workspace checkpoints, diff summaries, and rollback are supported in FM Web IDE workspace metadata.",
    availableInstead:
      "Use Version History for safe checkpoints and rollback. Live FileMaker file rollback is not supported.",
    requiredModules: ["workspace-versioning", "schema-diff"]
  },
  publishPromote: {
    id: "APP-121",
    key: "publishPromote",
    label: "Publish / Promote",
    menuPath: "File > Publish / Promote...",
    status: "partial",
    defaultEnabled: true,
    rationale:
      "Environment promotion is supported for workspace metadata with approval checks; live FM deployment orchestration is partial.",
    availableInstead:
      "Generate workspace release bundles with checklist gates for dev/test/prod environment pointers.",
    requiredModules: ["workspace-governance", "rbac"]
  },
  adminConsole: {
    id: "APP-122",
    key: "adminConsole",
    label: "Admin Console",
    menuPath: "Window > Admin Console...",
    status: "partial",
    defaultEnabled: true,
    rationale:
      "Admin Console aggregates workspace health/audit/metrics; advanced enterprise SIEM/export integrations remain partial.",
    requiredModules: ["audit-log", "observability", "workspace-governance"]
  },
  recoverySafeMode: {
    id: "APP-123",
    key: "recoverySafeMode",
    label: "Recovery / Safe Mode",
    menuPath: "Help > Recovery / Safe Mode...",
    status: "partial",
    defaultEnabled: true,
    rationale:
      "Safe mode and recovery diagnostics are supported for browser runtime state; full desktop crash-recovery parity is not feasible.",
    requiredModules: ["runtime-recovery", "plugin-sdk"]
  }
};

export const APP_LAYER_CAPABILITY_KEYS = Object.keys(capabilityDefinitions) as AppLayerCapabilityKey[];

function normalizeCapability(
  definition: CapabilityDefinition,
  overrides?: AppLayerCapabilityOverrideMap
): AppLayerCapability {
  const overrideValue = overrides?.[definition.key];
  let enabled = typeof overrideValue === "boolean" ? overrideValue : definition.defaultEnabled;
  if (definition.experimental && !appLayerFeatureFlags.experimentalUiEnabled) {
    enabled = false;
  }
  return {
    id: definition.id,
    key: definition.key,
    label: definition.label,
    menuPath: definition.menuPath,
    status: definition.status,
    enabled,
    rationale: definition.rationale,
    availableInstead: definition.availableInstead,
    docsHref: capabilityDocHref(definition),
    prerequisites: definition.prerequisites,
    requiredModules: definition.requiredModules,
    experimental: definition.experimental
  };
}

export function getAppLayerCapability(
  key: AppLayerCapabilityKey,
  overrides?: AppLayerCapabilityOverrideMap
): AppLayerCapability {
  return normalizeCapability(capabilityDefinitions[key], overrides);
}

export function listAppLayerCapabilities(overrides?: AppLayerCapabilityOverrideMap): AppLayerCapability[] {
  return APP_LAYER_CAPABILITY_KEYS.map((key) => getAppLayerCapability(key, overrides)).sort((left, right) =>
    left.id.localeCompare(right.id, undefined, { numeric: true })
  );
}

export function isAppLayerCapabilityEnabled(
  key: AppLayerCapabilityKey,
  overrides?: AppLayerCapabilityOverrideMap
): boolean {
  return getAppLayerCapability(key, overrides).enabled;
}

export function appLayerCapabilityLabel(
  key: AppLayerCapabilityKey,
  overrides?: AppLayerCapabilityOverrideMap
): string {
  const capability = getAppLayerCapability(key, overrides);
  return `${capability.label} (${capability.id})`;
}

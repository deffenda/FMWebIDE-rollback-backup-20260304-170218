export type RuntimeFeatureFlags = {
  previewRendererEnabled: boolean;
  tableColumnPersistenceEnabled: boolean;
  listRowFieldConfigEnabled: boolean;
  tableCellEditModeEnabled: boolean;
  viewVirtualizationEnabled: boolean;
  portalVirtualizationEnabled: boolean;
  perfRequestCachingEnabled: boolean;
  perfBenchmarkGateEnabled: boolean;
  statusMenubarParityAuditEnabled: boolean;
  quickFindEnabled: boolean;
  windowTilingEnabled: boolean;
  popoversEnabled: boolean;
  cardWindowsEnabled: boolean;
  scriptEngineEnabled: boolean;
  multiWindowEnabled: boolean;
  workspaceMultiFileEnabled: boolean;
  crossFileCrudEnabled: boolean;
  multiDbSessionManagerEnabled: boolean;
  workspaceRoutingDebugEnabled: boolean;
  layoutFidelityUnknownObjectsEnabled: boolean;
  layoutFidelityDynamicConditionalFormattingEnabled: boolean;
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

export const runtimeFeatureFlags: RuntimeFeatureFlags = {
  previewRendererEnabled: readBooleanEnv("NEXT_PUBLIC_RUNTIME_ENABLE_PREVIEW_RENDERER", true),
  tableColumnPersistenceEnabled: readBooleanEnv("NEXT_PUBLIC_RUNTIME_ENABLE_TABLE_COLUMN_PERSISTENCE", true),
  listRowFieldConfigEnabled: readBooleanEnv("NEXT_PUBLIC_RUNTIME_ENABLE_LIST_ROW_FIELDS", true),
  tableCellEditModeEnabled: readBooleanEnv("NEXT_PUBLIC_RUNTIME_ENABLE_TABLE_CELL_EDIT_MODE", true),
  viewVirtualizationEnabled: readBooleanEnv("NEXT_PUBLIC_RUNTIME_ENABLE_VIEW_VIRTUALIZATION", true),
  portalVirtualizationEnabled: readBooleanEnv("NEXT_PUBLIC_RUNTIME_ENABLE_PORTAL_VIRTUALIZATION", true),
  perfRequestCachingEnabled: readBooleanEnv("NEXT_PUBLIC_RUNTIME_ENABLE_PERF_REQUEST_CACHING", true),
  perfBenchmarkGateEnabled: readBooleanEnv("NEXT_PUBLIC_RUNTIME_ENABLE_PERF_BENCHMARK_GATE", true),
  statusMenubarParityAuditEnabled: readBooleanEnv("NEXT_PUBLIC_RUNTIME_ENABLE_STATUS_MENUBAR_PARITY", true),
  quickFindEnabled: readBooleanEnv("NEXT_PUBLIC_RUNTIME_ENABLE_QUICK_FIND", false),
  windowTilingEnabled: readBooleanEnv("NEXT_PUBLIC_RUNTIME_ENABLE_WINDOW_TILING", false),
  popoversEnabled: readBooleanEnv("NEXT_PUBLIC_RUNTIME_ENABLE_POPOVERS", false),
  cardWindowsEnabled: readBooleanEnv("NEXT_PUBLIC_RUNTIME_ENABLE_CARD_WINDOWS", false),
  scriptEngineEnabled: readBooleanEnv("NEXT_PUBLIC_RUNTIME_ENABLE_SCRIPT_ENGINE", false),
  multiWindowEnabled: readBooleanEnv("NEXT_PUBLIC_RUNTIME_ENABLE_MULTI_WINDOW", true),
  workspaceMultiFileEnabled: readBooleanEnv("NEXT_PUBLIC_RUNTIME_ENABLE_WORKSPACE_MULTIFILE", true),
  crossFileCrudEnabled: readBooleanEnv("NEXT_PUBLIC_RUNTIME_ENABLE_CROSS_FILE_CRUD", true),
  multiDbSessionManagerEnabled: readBooleanEnv("NEXT_PUBLIC_RUNTIME_ENABLE_MULTI_DB_SESSION_MANAGER", true),
  workspaceRoutingDebugEnabled: readBooleanEnv("NEXT_PUBLIC_RUNTIME_ENABLE_WORKSPACE_ROUTING_DEBUG", true),
  layoutFidelityUnknownObjectsEnabled: readBooleanEnv(
    "NEXT_PUBLIC_RUNTIME_ENABLE_LAYOUT_FIDELITY_UNKNOWN_OBJECTS",
    process.env.NODE_ENV !== "production"
  ),
  layoutFidelityDynamicConditionalFormattingEnabled: readBooleanEnv(
    "NEXT_PUBLIC_RUNTIME_ENABLE_LAYOUT_FIDELITY_DYNAMIC_CONDITIONAL_FORMATTING",
    false
  )
};

export function listUnsupportedRuntimeCapabilities(flags: RuntimeFeatureFlags): string[] {
  const unsupported: string[] = [];
  if (!flags.windowTilingEnabled) {
    unsupported.push("Window tiling/cascade commands");
  }
  if (!flags.quickFindEnabled) {
    unsupported.push("Quick Find toolbar search");
  }
  if (!flags.previewRendererEnabled) {
    unsupported.push("Dedicated Preview renderer");
  }
  if (!flags.tableColumnPersistenceEnabled) {
    unsupported.push("Per-layout table column persistence");
  }
  if (!flags.listRowFieldConfigEnabled) {
    unsupported.push("Per-layout list row field configuration");
  }
  if (!flags.tableCellEditModeEnabled) {
    unsupported.push("Table cell edit mode (double-click edit)");
  }
  if (!flags.viewVirtualizationEnabled) {
    unsupported.push("List/table view virtualization");
  }
  if (!flags.portalVirtualizationEnabled) {
    unsupported.push("Portal row virtualization");
  }
  if (!flags.perfRequestCachingEnabled) {
    unsupported.push("Performance request caching/dedup");
  }
  if (!flags.perfBenchmarkGateEnabled) {
    unsupported.push("Performance benchmark CI gate");
  }
  if (!flags.workspaceMultiFileEnabled) {
    unsupported.push("Workspace multi-file routing");
  }
  if (!flags.crossFileCrudEnabled) {
    unsupported.push("Cross-file CRUD routing");
  }
  if (!flags.multiDbSessionManagerEnabled) {
    unsupported.push("Multi-database session manager");
  }
  if (!flags.workspaceRoutingDebugEnabled) {
    unsupported.push("Workspace routing debug overlay data");
  }
  if (!flags.layoutFidelityUnknownObjectsEnabled) {
    unsupported.push("DDR unknown object placeholders");
  }
  if (!flags.layoutFidelityDynamicConditionalFormattingEnabled) {
    unsupported.push("DDR dynamic conditional formatting evaluation");
  }
  return unsupported;
}

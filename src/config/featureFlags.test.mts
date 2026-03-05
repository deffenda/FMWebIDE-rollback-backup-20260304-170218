import assert from "node:assert/strict";
import test from "node:test";
import { listUnsupportedRuntimeCapabilities, runtimeFeatureFlags, type RuntimeFeatureFlags } from "./featureFlags.ts";

test("runtime feature flags expose required defaults", () => {
  assert.equal(typeof runtimeFeatureFlags.previewRendererEnabled, "boolean");
  assert.equal(typeof runtimeFeatureFlags.tableColumnPersistenceEnabled, "boolean");
  assert.equal(typeof runtimeFeatureFlags.listRowFieldConfigEnabled, "boolean");
  assert.equal(typeof runtimeFeatureFlags.tableCellEditModeEnabled, "boolean");
  assert.equal(typeof runtimeFeatureFlags.viewVirtualizationEnabled, "boolean");
  assert.equal(typeof runtimeFeatureFlags.portalVirtualizationEnabled, "boolean");
  assert.equal(typeof runtimeFeatureFlags.perfRequestCachingEnabled, "boolean");
  assert.equal(typeof runtimeFeatureFlags.perfBenchmarkGateEnabled, "boolean");
  assert.equal(typeof runtimeFeatureFlags.statusMenubarParityAuditEnabled, "boolean");
  assert.equal(typeof runtimeFeatureFlags.workspaceMultiFileEnabled, "boolean");
  assert.equal(typeof runtimeFeatureFlags.crossFileCrudEnabled, "boolean");
  assert.equal(typeof runtimeFeatureFlags.multiDbSessionManagerEnabled, "boolean");
  assert.equal(typeof runtimeFeatureFlags.workspaceRoutingDebugEnabled, "boolean");
  assert.equal(typeof runtimeFeatureFlags.layoutFidelityUnknownObjectsEnabled, "boolean");
  assert.equal(typeof runtimeFeatureFlags.layoutFidelityDynamicConditionalFormattingEnabled, "boolean");
});

test("unsupported capability list reflects disabled flags", () => {
  const flags: RuntimeFeatureFlags = {
    previewRendererEnabled: false,
    tableColumnPersistenceEnabled: false,
    listRowFieldConfigEnabled: false,
    tableCellEditModeEnabled: false,
    viewVirtualizationEnabled: false,
    portalVirtualizationEnabled: false,
    perfRequestCachingEnabled: false,
    perfBenchmarkGateEnabled: false,
    statusMenubarParityAuditEnabled: true,
    quickFindEnabled: false,
    windowTilingEnabled: false,
    popoversEnabled: false,
    cardWindowsEnabled: false,
    scriptEngineEnabled: false,
    multiWindowEnabled: true,
    workspaceMultiFileEnabled: false,
    crossFileCrudEnabled: false,
    multiDbSessionManagerEnabled: false,
    workspaceRoutingDebugEnabled: false,
    layoutFidelityUnknownObjectsEnabled: false,
    layoutFidelityDynamicConditionalFormattingEnabled: false
  };
  const unsupported = listUnsupportedRuntimeCapabilities(flags);
  assert.ok(unsupported.includes("Dedicated Preview renderer"));
  assert.ok(unsupported.includes("Per-layout table column persistence"));
  assert.ok(unsupported.includes("Per-layout list row field configuration"));
  assert.ok(unsupported.includes("Table cell edit mode (double-click edit)"));
  assert.ok(unsupported.includes("List/table view virtualization"));
  assert.ok(unsupported.includes("Portal row virtualization"));
  assert.ok(unsupported.includes("Performance request caching/dedup"));
  assert.ok(unsupported.includes("Performance benchmark CI gate"));
  assert.ok(unsupported.includes("Window tiling/cascade commands"));
  assert.ok(unsupported.includes("Quick Find toolbar search"));
  assert.ok(unsupported.includes("Workspace multi-file routing"));
  assert.ok(unsupported.includes("Cross-file CRUD routing"));
  assert.ok(unsupported.includes("Multi-database session manager"));
  assert.ok(unsupported.includes("Workspace routing debug overlay data"));
  assert.ok(unsupported.includes("DDR unknown object placeholders"));
  assert.ok(unsupported.includes("DDR dynamic conditional formatting evaluation"));
});

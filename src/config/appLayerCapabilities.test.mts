import assert from "node:assert/strict";
import test from "node:test";
import {
  APP_LAYER_CAPABILITY_KEYS,
  appLayerCapabilityLabel,
  getAppLayerCapability,
  isAppLayerCapabilityEnabled,
  listAppLayerCapabilities
} from "./appLayerCapabilities.ts";

test("app-layer registry exposes all required manage capability keys", () => {
  const expectedKeys = [
    "manageDatabase",
    "manageSecurity",
    "manageValueLists",
    "manageLayouts",
    "manageScripts",
    "manageExternalDataSources",
    "manageContainers",
    "manageCustomFunctions",
    "manageCustomMenus",
    "manageThemes",
    "appLayerCapabilities",
    "workspaceVersioning",
    "publishPromote",
    "adminConsole",
    "recoverySafeMode"
  ];
  for (const key of expectedKeys) {
    assert.ok(APP_LAYER_CAPABILITY_KEYS.includes(key as (typeof APP_LAYER_CAPABILITY_KEYS)[number]));
  }
});

test("listAppLayerCapabilities returns stable ids and docs links", () => {
  const capabilities = listAppLayerCapabilities();
  assert.ok(capabilities.length > 0);
  assert.ok(capabilities.every((entry) => entry.id.startsWith("APP-") || entry.id.startsWith("APPX-")));
  assert.ok(capabilities.every((entry) => entry.docsHref.includes("/docs/app-layer-parity-matrix.md#")));
  assert.equal(
    getAppLayerCapability("manageDatabase").docsHref,
    "/docs/app-layer-parity-matrix.md#APP-101"
  );
  assert.equal(
    getAppLayerCapability("preferences").docsHref,
    "/docs/app-layer-parity-matrix.md#APPX-201"
  );
});

test("capability overrides can force-enable disabled capability", () => {
  const baseline = getAppLayerCapability("recover");
  assert.equal(baseline.enabled, false);
  const overridden = getAppLayerCapability("recover", { recover: true });
  assert.equal(overridden.enabled, true);
});

test("isAppLayerCapabilityEnabled mirrors registry resolution", () => {
  assert.equal(isAppLayerCapabilityEnabled("manageDatabase"), true);
  assert.equal(isAppLayerCapabilityEnabled("recover"), false);
  assert.equal(isAppLayerCapabilityEnabled("recover", { recover: true }), true);
});

test("appLayerCapabilityLabel includes id and label", () => {
  const token = appLayerCapabilityLabel("manageCustomMenus");
  assert.match(token, /Manage Custom Menus/);
  assert.match(token, /APP-109/);
});

test("manage capabilities are mapped to APP-101..APP-110 ids", () => {
  const ids = [
    getAppLayerCapability("manageDatabase").id,
    getAppLayerCapability("manageSecurity").id,
    getAppLayerCapability("manageValueLists").id,
    getAppLayerCapability("manageLayouts").id,
    getAppLayerCapability("manageScripts").id,
    getAppLayerCapability("manageExternalDataSources").id,
    getAppLayerCapability("manageContainers").id,
    getAppLayerCapability("manageCustomFunctions").id,
    getAppLayerCapability("manageCustomMenus").id,
    getAppLayerCapability("manageThemes").id
  ];
  assert.deepEqual(ids, [
    "APP-101",
    "APP-102",
    "APP-103",
    "APP-104",
    "APP-105",
    "APP-106",
    "APP-107",
    "APP-108",
    "APP-109",
    "APP-110"
  ]);
});

test("phase 12 extras map to APPX-201..APPX-212 capability ids", () => {
  const mapping = {
    preferences: getAppLayerCapability("preferences").id,
    sharing: getAppLayerCapability("sharing").id,
    fileOptions: getAppLayerCapability("fileOptions").id,
    recover: getAppLayerCapability("recover").id,
    importExport: getAppLayerCapability("importExport").id,
    scriptDebugger: getAppLayerCapability("scriptDebugger").id,
    dataViewer: getAppLayerCapability("dataViewer").id,
    fileReferences: getAppLayerCapability("fileReferences").id,
    authProfiles: getAppLayerCapability("authProfiles").id,
    pluginManager: getAppLayerCapability("pluginManager").id,
    windowManagementExtras: getAppLayerCapability("windowManagementExtras").id,
    helpDiagnostics: getAppLayerCapability("helpDiagnostics").id
  };
  assert.deepEqual(mapping, {
    preferences: "APPX-201",
    sharing: "APPX-202",
    fileOptions: "APPX-203",
    recover: "APPX-204",
    importExport: "APPX-205",
    scriptDebugger: "APPX-206",
    dataViewer: "APPX-207",
    fileReferences: "APPX-208",
    authProfiles: "APPX-209",
    pluginManager: "APPX-210",
    windowManagementExtras: "APPX-211",
    helpDiagnostics: "APPX-212"
  });
});

test("phase 12 entries expose required module metadata", () => {
  assert.ok(getAppLayerCapability("preferences").requiredModules?.includes("workspace-settings"));
  assert.ok(getAppLayerCapability("importExport").requiredModules?.includes("import-export-center"));
  assert.ok(getAppLayerCapability("pluginManager").requiredModules?.includes("plugin-sdk"));
});

test("phase 15 governance entries map to APP-120..APP-123", () => {
  const mapping = {
    workspaceVersioning: getAppLayerCapability("workspaceVersioning").id,
    publishPromote: getAppLayerCapability("publishPromote").id,
    adminConsole: getAppLayerCapability("adminConsole").id,
    recoverySafeMode: getAppLayerCapability("recoverySafeMode").id
  };
  assert.deepEqual(mapping, {
    workspaceVersioning: "APP-120",
    publishPromote: "APP-121",
    adminConsole: "APP-122",
    recoverySafeMode: "APP-123"
  });
  assert.ok(getAppLayerCapability("workspaceVersioning").requiredModules?.includes("workspace-versioning"));
  assert.ok(getAppLayerCapability("publishPromote").requiredModules?.includes("workspace-governance"));
});

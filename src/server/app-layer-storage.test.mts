import assert from "node:assert/strict";
import test from "node:test";
import {
  readAppLayerWorkspaceConfig,
  writeAppLayerWorkspaceConfig
} from "./app-layer-storage.ts";

test("app-layer storage returns defaults for new workspace", async () => {
  const workspaceId = `app-layer-default-${Date.now()}`;
  const config = await readAppLayerWorkspaceConfig(workspaceId);
  assert.ok(Array.isArray(config.externalDataSources));
  assert.ok(Array.isArray(config.customFunctions));
  assert.ok(Array.isArray(config.themes));
  assert.ok(Array.isArray(config.securityRoles));
  assert.equal(typeof config.containerSettings.allowUploads, "boolean");
  assert.equal(typeof config.preferences.general.showStatusToolbar, "boolean");
  assert.equal(typeof config.preferences.runtime.defaultBrowseView, "string");
  assert.ok(Array.isArray(config.fileOptions));
  assert.ok(Array.isArray(config.sharing));
  assert.ok(Array.isArray(config.fileReferences));
  assert.ok(Array.isArray(config.authProfiles));
  assert.ok(Array.isArray(config.pluginPreferences));
});

test("app-layer storage persists edited workspace config", async () => {
  const workspaceId = `app-layer-write-${Date.now()}`;
  const saved = await writeAppLayerWorkspaceConfig(workspaceId, {
    externalDataSources: [
      {
        id: "source-rest",
        name: "Reporting API",
        type: "rest",
        host: "https://example.test",
        database: "reporting",
        enabled: true
      }
    ],
    customFunctions: [
      {
        id: "cf-upper",
        name: "UpperCase",
        parameters: ["text"],
        definition: "Upper ( text )",
        source: "workspace"
      }
    ],
    containerSettings: {
      cacheSeconds: 60,
      maxPreviewBytes: 1_048_576,
      allowUploads: false
    },
    preferences: {
      general: {
        showStatusToolbar: false,
        showFormattingBar: true,
        compactStatusArea: true
      },
      runtime: {
        defaultBrowseView: "table",
        autoRefreshOnOpen: false,
        enablePolling: true
      },
      debug: {
        enableDebugOverlay: true,
        enableScriptTrace: true,
        enableCalcDiagnostics: true
      },
      security: {
        maskSensitiveDebugValues: true,
        requireConfirmOnDelete: false
      }
    },
    fileOptions: [
      {
        fileId: "assets",
        defaultLayout: "Asset Details",
        onOpenScript: "OnOpen",
        onCloseScript: "OnClose",
        openToDefaultLayout: true,
        menuSet: "FileMaker Default",
        runOnOpenScript: true,
        runOnCloseScript: true,
        openHidden: false,
        spellingUnderline: true,
        spellingSuggest: true,
        textSmartQuotes: true,
        textSmartDashes: true,
        textDirection: "default"
      }
    ],
    sharing: [
      {
        fileId: "assets",
        networkAccess: "all",
        requireAccountPrivilege: true,
        showInOpenRemote: true,
        webDirectEnabled: true,
        webDirectRequireSecure: true,
        webDirectAllowPrinting: false,
        webDirectDisconnectMinutes: 30,
        odbcJdbcEnabled: true,
        odbcJdbcMode: "extended-privilege",
        odbcJdbcAllowExecuteSql: true
      }
    ],
    fileReferences: [
      {
        id: "ref-common",
        sourceFileId: "project-tracker",
        targetFileId: "common",
        connectionHint: "fms://common",
        required: true,
        status: "ok"
      }
    ],
    authProfiles: [
      {
        id: "profile-main",
        name: "Main",
        host: "fm.test.local",
        database: "Assets",
        username: "tester",
        workspaceFileIds: ["assets"],
        enabled: true,
        lastTestStatus: "ok"
      }
    ],
    pluginPreferences: [
      {
        pluginId: "example-chart",
        enabled: true
      }
    ]
  });
  assert.equal(saved.externalDataSources.length, 1);
  assert.equal(saved.customFunctions.length, 1);
  assert.equal(saved.containerSettings.allowUploads, false);

  const reloaded = await readAppLayerWorkspaceConfig(workspaceId);
  assert.equal(reloaded.externalDataSources[0]?.name, "Reporting API");
  assert.equal(reloaded.customFunctions[0]?.name, "UpperCase");
  assert.equal(reloaded.containerSettings.cacheSeconds, 60);
  assert.equal(reloaded.containerSettings.maxPreviewBytes, 1_048_576);
  assert.equal(reloaded.preferences.runtime.defaultBrowseView, "table");
  assert.equal(reloaded.preferences.debug.enableScriptTrace, true);
  assert.equal(reloaded.fileOptions[0]?.defaultLayout, "Asset Details");
  assert.equal(reloaded.sharing[0]?.networkAccess, "all");
  assert.equal(reloaded.sharing[0]?.webDirectDisconnectMinutes, 30);
  assert.equal(reloaded.fileReferences[0]?.targetFileId, "common");
  assert.equal(reloaded.authProfiles[0]?.name, "Main");
  assert.equal(reloaded.pluginPreferences[0]?.pluginId, "example-chart");
});

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const layoutModePath = path.resolve(process.cwd(), "components/layout-mode.tsx");
const browseModePath = path.resolve(process.cwd(), "components/browse-mode.tsx");

function loadLayoutModeSource(): string {
  return fs.readFileSync(layoutModePath, "utf8");
}

function loadBrowseModeSource(): string {
  return fs.readFileSync(browseModePath, "utf8");
}

test("layout-mode manage submenu exposes all Phase 11 manage actions", () => {
  const source = loadLayoutModeSource();
  const requiredActionIds = [
    "file-manage-database",
    "file-manage-security",
    "file-value-lists",
    "file-manage-layouts",
    "file-manage-scripts",
    "file-manage-external-data-sources",
    "file-manage-containers",
    "file-manage-custom-functions",
    "file-manage-custom-menus",
    "file-manage-themes"
  ];

  for (const actionId of requiredActionIds) {
    assert.ok(
      source.includes(`\"${actionId}\"`) || source.includes(`'${actionId}'`),
      `Expected action id ${actionId} to appear in layout-mode`
    );
  }
});

test("browse/find/preview file menu includes FileMaker Manage + Sharing submenus", () => {
  const source = loadBrowseModeSource();
  const requiredTokens = [
    "fileManageMenuItems.map",
    "fileSharingMenuItems.map",
    'aria-label="Manage"',
    'aria-label="Sharing"',
    'setTopMenubarSubmenu("file-manage")',
    'setTopMenubarSubmenu("file-sharing")'
  ];
  for (const token of requiredTokens) {
    assert.ok(source.includes(token), `Expected browse-mode File menu token "${token}"`);
  }
});

test("browse/find/preview routes manage + sharing actions through capability checks", () => {
  const source = loadBrowseModeSource();
  const requiredTokens = [
    'runWithAppLayerCapability("manageDatabase"',
    'runWithAppLayerCapability("manageSecurity"',
    'runWithAppLayerCapability("manageValueLists"',
    'runWithAppLayerCapability("manageLayouts"',
    'runWithAppLayerCapability("manageScripts"',
    'runWithAppLayerCapability("manageExternalDataSources"',
    'runWithAppLayerCapability("manageContainers"',
    'runWithAppLayerCapability("manageCustomFunctions"',
    'runWithAppLayerCapability("manageCustomMenus"',
    'runWithAppLayerCapability("manageThemes"',
    'runWithAppLayerCapability("sharing"',
    'runWithAppLayerCapability("fileOptions"',
    'runWithAppLayerCapability("fileReferences"',
    'runWithAppLayerCapability("authProfiles"',
    "openManageCenterFromRuntime"
  ];
  for (const token of requiredTokens) {
    assert.ok(source.includes(token), `Expected browse-mode capability routing token "${token}"`);
  }
});

test("browse/find/preview view menu checkmarks reflect active mode", () => {
  const source = loadBrowseModeSource();
  assert.ok(
    source.includes("!isFindMode && !isPreviewMode ? <span className=\"fm-view-check\">✓</span> : null"),
    "Expected Browse Mode checkmark to be disabled while in Preview"
  );
  assert.ok(
    source.includes("{isPreviewMode ? <span className=\"fm-view-check\">✓</span> : null}Preview Mode"),
    "Expected Preview Mode checkmark to reflect preview state"
  );
});

test("layout-mode exposes Phase 12 APPX action ids in menubar handlers", () => {
  const source = loadLayoutModeSource();
  const requiredActionIds = [
    "file-preferences",
    "file-sharing",
    "file-sharing-network",
    "file-sharing-webdirect",
    "file-sharing-odbc-jdbc",
    "file-sharing-upload-host",
    "file-file-options",
    "file-import-export",
    "file-file-references",
    "file-auth-profiles",
    "file-recover",
    "tools-script-debugger",
    "tools-data-viewer",
    "tools-plugin-manager",
    "window-next-window",
    "window-previous-window",
    "help-diagnostics"
  ];
  for (const actionId of requiredActionIds) {
    assert.ok(
      source.includes(`\"${actionId}\"`) || source.includes(`'${actionId}'`),
      `Expected Phase 12 action id ${actionId} to appear in layout-mode`
    );
  }
});

test("layout-mode exposes Phase 15 governance action ids in menubar handlers", () => {
  const source = loadLayoutModeSource();
  const requiredActionIds = [
    "file-version-history",
    "file-publish-promote",
    "window-admin-console",
    "help-recovery-safe-mode"
  ];
  for (const actionId of requiredActionIds) {
    assert.ok(
      source.includes(`\"${actionId}\"`) || source.includes(`'${actionId}'`),
      `Expected Phase 15 action id ${actionId} to appear in layout-mode`
    );
  }
});

test("layout-mode routes manage actions through app-layer capability checks", () => {
  const source = loadLayoutModeSource();
  const requiredCapabilityChecks = [
    'runWithAppLayerCapability("manageDatabase"',
    'runWithAppLayerCapability("manageSecurity"',
    'runWithAppLayerCapability("manageValueLists"',
    'runWithAppLayerCapability("manageLayouts"',
    'runWithAppLayerCapability("manageScripts"',
    'runWithAppLayerCapability("manageExternalDataSources"',
    'runWithAppLayerCapability("manageContainers"',
    'runWithAppLayerCapability("manageCustomFunctions"',
    'runWithAppLayerCapability("manageCustomMenus"',
    'runWithAppLayerCapability("manageThemes"'
  ];

  for (const token of requiredCapabilityChecks) {
    assert.ok(source.includes(token), `Expected capability gate ${token} in layout-mode handler`);
  }
});

test("layout-mode routes APPX actions through capability checks", () => {
  const source = loadLayoutModeSource();
  const requiredCapabilityChecks = [
    'runWithAppLayerCapability("preferences"',
    'runWithAppLayerCapability("sharing"',
    'runWithAppLayerCapability("fileOptions"',
    'runWithAppLayerCapability("recover"',
    'runWithAppLayerCapability("importExport"',
    'runWithAppLayerCapability("fileReferences"',
    'runWithAppLayerCapability("authProfiles"',
    'runWithAppLayerCapability("scriptDebugger"',
    'runWithAppLayerCapability("dataViewer"',
    'runWithAppLayerCapability("pluginManager"',
    'runWithAppLayerCapability("windowManagementExtras"',
    'runWithAppLayerCapability("helpDiagnostics"'
  ];
  for (const token of requiredCapabilityChecks) {
    assert.ok(source.includes(token), `Expected Phase 12 capability gate ${token} in layout-mode`);
  }
});

test("layout-mode routes Phase 15 governance actions through capability checks", () => {
  const source = loadLayoutModeSource();
  const requiredCapabilityChecks = [
    'runWithAppLayerCapability("workspaceVersioning"',
    'runWithAppLayerCapability("publishPromote"',
    'runWithAppLayerCapability("adminConsole"',
    'runWithAppLayerCapability("recoverySafeMode"'
  ];
  for (const token of requiredCapabilityChecks) {
    assert.ok(source.includes(token), `Expected Phase 15 capability gate ${token} in layout-mode`);
  }
});

test("blocked capability dialog uses explicit not-supported messaging and parity link", () => {
  const source = loadLayoutModeSource();
  assert.ok(source.includes("Not Supported Yet:"), "Expected explicit Not Supported Yet dialog copy");
  assert.ok(source.includes("Open parity matrix entry"), "Expected parity matrix link copy in blocked dialog");
  assert.ok(source.includes("availableInstead"), "Expected fallback guidance to be rendered when provided");
});

test("manage center list search and unsaved-close protection are wired", () => {
  const source = loadLayoutModeSource();
  assert.ok(source.includes("List Search"), "Expected list search control in manage center toolbar");
  assert.ok(source.includes("Filter current section items"), "Expected list-search placeholder");
  assert.ok(source.includes("You have unsaved changes in Manage"), "Expected unsaved close confirmation prompt");
  const filteredBindings = [
    "filteredManageValueListRows",
    "filteredManageLayouts",
    "filteredManageScripts",
    "filteredManageExternalDataSources",
    "filteredManageContainerFieldRows",
    "filteredManageCustomFunctions",
    "filteredManageThemes",
    "filteredManageFileOptions",
    "filteredManageFileReferences",
    "filteredManageAuthProfiles",
    "filteredManagePluginPreferences",
    "filteredWorkspaceVersions"
  ];
  for (const token of filteredBindings) {
    assert.ok(source.includes(token), `Expected ${token} to be used in manage center rendering`);
  }
});

test("layout inspector uses FileMaker-style Position/Appearance/Data tabs", () => {
  const source = loadLayoutModeSource();
  const requiredInspectorTokens = [
    "inspector-selection-summary",
    "Position inspector",
    "Appearance inspector",
    "Data inspector",
    "Use the right inspector tabs to edit Position, Appearance, and Data."
  ];
  for (const token of requiredInspectorTokens) {
    assert.ok(source.includes(token), `Expected inspector token "${token}" in layout-mode`);
  }
  assert.equal(
    source.includes("Styles inspector"),
    false,
    "Styles inspector tab should not be rendered as a primary tab"
  );
});

test("web viewer setup dialog includes FileMaker-style controls and field specification", () => {
  const source = loadLayoutModeSource();
  const requiredTokens = [
    "Web Viewer Setup",
    "Choose a Website",
    "Template Parameters",
    "Web Address",
    "Options",
    "Specify Field...",
    "openWebViewerFieldPicker",
    "applyWebViewerFieldToken",
    "webViewerSetupAllowJavaScript"
  ];
  for (const token of requiredTokens) {
    assert.ok(source.includes(token), `Expected Web Viewer Setup token "${token}" in layout-mode`);
  }
});

test("manage security dialog includes FileMaker-style sections and editable workflows", () => {
  const source = loadLayoutModeSource();
  const requiredUiTokens = [
    "Manage Security",
    "Runtime Role Simulation",
    "Accounts",
    "Privilege Sets",
    "Extended Privileges",
    "Access Diagnostics",
    "Save Security",
    "Created privilege set",
    "Created account",
    "Deleted privilege set",
    "Deleted account"
  ];
  for (const token of requiredUiTokens) {
    assert.ok(source.includes(token), `Expected Manage Security token "${token}" in layout-mode`);
  }
  const requiredHandlers = [
    "createSecurityRoleFromManageCenter",
    "duplicateSecurityRoleFromManageCenter",
    "deleteSecurityRoleFromManageCenter",
    "createSecurityAccountFromManageCenter",
    "deleteSecurityAccountFromManageCenter",
    "updateSecurityAccountPrivilegeSet",
    "saveSecurityFromManageCenter",
    "readPrivilegeSetIdFromAuthProfileNotes",
    "writePrivilegeSetIdToAuthProfileNotes"
  ];
  for (const handler of requiredHandlers) {
    assert.ok(source.includes(handler), `Expected Manage Security handler "${handler}" in layout-mode`);
  }
});

test("manage layouts dialog includes FileMaker-style list/detail workflows", () => {
  const source = loadLayoutModeSource();
  const requiredUiTokens = [
    "Manage Layouts",
    "New Layout / Report...",
    "Loading layout details...",
    "Based on Table Occurrence",
    "Default View",
    "Include in Layout Menus",
    "Device Preset",
    "Select a layout to view details."
  ];
  for (const token of requiredUiTokens) {
    assert.ok(source.includes(token), `Expected Manage Layouts token "${token}" in layout-mode`);
  }
  const requiredHandlers = [
    "createLayoutFromManageCenter",
    "openSelectedLayoutFromManageCenter",
    "renameSelectedLayoutFromManageCenter",
    "duplicateSelectedLayoutFromManageCenter",
    "deleteSelectedLayoutFromManageCenter",
    "deleteLayoutFromManageCenter"
  ];
  for (const handler of requiredHandlers) {
    assert.ok(source.includes(handler), `Expected Manage Layouts handler "${handler}" in layout-mode`);
  }
});

test("manage value lists dialog includes FileMaker-style list/detail workflows", () => {
  const source = loadLayoutModeSource();
  const requiredUiTokens = [
    "Manage Value Lists",
    "FileMaker-style value list manager",
    "Value List Name",
    "Use Custom Values",
    "Use Values from Field",
    "Source Fields",
    "Custom Values",
    "Used In",
    "Save Value Lists"
  ];
  for (const token of requiredUiTokens) {
    assert.ok(source.includes(token), `Expected Manage Value Lists token \"${token}\" in layout-mode`);
  }
  const requiredHandlers = [
    "loadManageValueLists",
    "saveManageValueLists",
    "addValueListFromManageCenter",
    "duplicateValueListFromManageCenter",
    "deleteValueListFromManageCenter",
    "updateManageValueListDraft"
  ];
  for (const handler of requiredHandlers) {
    assert.ok(source.includes(handler), `Expected Manage Value Lists handler \"${handler}\" in layout-mode`);
  }
});

test("manage custom functions dialog includes FileMaker-style editor workflows", () => {
  const source = loadLayoutModeSource();
  const requiredUiTokens = [
    "Manage Custom Functions",
    "FileMaker-style custom function workspace",
    "Function Parameters",
    "Calculation",
    "Comment",
    "View by",
    "Creation Order",
    "FMCalc-lite Support",
    "Add Parameter...",
    "Save Custom Functions"
  ];
  for (const token of requiredUiTokens) {
    assert.ok(source.includes(token), `Expected Manage Custom Functions token \"${token}\" in layout-mode`);
  }
  const requiredHandlers = [
    "setManageCustomFunctionsViewBy",
    "addCustomFunctionEntry",
    "duplicateCustomFunctionEntry",
    "removeCustomFunctionEntry",
    "commitCustomFunctionParameterDraft",
    "addCustomFunctionParameterFromManageCenter",
    "removeCustomFunctionParameterFromManageCenter",
    "saveCustomFunctionsFromManageCenter"
  ];
  for (const handler of requiredHandlers) {
    assert.ok(source.includes(handler), `Expected Manage Custom Functions handler \"${handler}\" in layout-mode`);
  }
});

test("file options dialog includes FileMaker-style tabbed workflows", () => {
  const source = loadLayoutModeSource();
  const requiredUiTokens = [
    "FileMaker-style file startup behavior",
    "Open/Close",
    "Script Triggers",
    "Spelling",
    "Text",
    "Icon",
    "Switch to layout:",
    "Open Startup Layout",
    "Perform script on first window open",
    "Perform script on last window close",
    "Save File Options"
  ];
  for (const token of requiredUiTokens) {
    assert.ok(source.includes(token), `Expected File Options token \"${token}\" in layout-mode`);
  }
  const requiredHandlers = [
    "manageCenterFileOptionsTab",
    "setManageCenterFileOptionsTab",
    "upsertManageCenterFileOption",
    "buildDefaultFileOptionEntry",
    "changeManageCenterSelectedFile"
  ];
  for (const handler of requiredHandlers) {
    assert.ok(source.includes(handler), `Expected File Options handler \"${handler}\" in layout-mode`);
  }
});

test("sharing dialog includes FileMaker-style submenu dialogs and settings", () => {
  const source = loadLayoutModeSource();
  const requiredUiTokens = [
    "With FileMaker Network...",
    "With FileMaker WebDirect...",
    "With ODBC/JDBC...",
    "Upload to Host...",
    "Network access to file: Off",
    "Allow FileMaker WebDirect sessions",
    "Allow ODBC/JDBC access",
    "Save Sharing Settings"
  ];
  for (const token of requiredUiTokens) {
    assert.ok(source.includes(token), `Expected Sharing token \"${token}\" in layout-mode`);
  }
  const requiredHandlers = [
    "openManageSharingDialog",
    "upsertManageCenterSharingOption",
    "runManageSharingConnectionTest",
    "setManageCenterSharingTab"
  ];
  for (const handler of requiredHandlers) {
    assert.ok(source.includes(handler), `Expected Sharing handler \"${handler}\" in layout-mode`);
  }
});

test("manage database relationships view includes FileMaker-style relationship editor workflows", () => {
  const source = loadLayoutModeSource();
  const requiredUiTokens = [
    "Edit relationships like FileMaker",
    "Relationship editor",
    "Related Table Occurrence",
    "Match Fields",
    "Add Match",
    "Delete Match",
    "Reversed relationship sides"
  ];
  for (const token of requiredUiTokens) {
    assert.ok(source.includes(token), `Expected Manage Database relationships token \"${token}\" in layout-mode`);
  }
  const requiredHandlers = [
    "createManageDatabaseRelationship",
    "deleteManageDatabaseRelationship",
    "reverseManageDatabaseRelationship",
    "addManageDatabaseRelationshipPredicate",
    "updateManageDatabaseRelationshipPredicate",
    "deleteManageDatabaseRelationshipPredicate",
    "updateManageDatabaseRelationshipEndpoints"
  ];
  for (const handler of requiredHandlers) {
    assert.ok(source.includes(handler), `Expected Manage Database relationships handler \"${handler}\" in layout-mode`);
  }
});

test("manage containers dialog includes FileMaker-style catalog/settings workflows", () => {
  const source = loadLayoutModeSource();
  const requiredUiTokens = [
    "Manage Containers",
    "FileMaker-style container manager",
    "Container diagnostics",
    "Allow uploads via runtime container actions",
    "Save Container Settings",
    "Reset Defaults"
  ];
  for (const token of requiredUiTokens) {
    assert.ok(source.includes(token), `Expected Manage Containers token \"${token}\" in layout-mode`);
  }
  const requiredHandlers = [
    "runManageContainerHealthCheck",
    "setManageContainersSelectedKey",
    "setManageCenterContainerHealth",
    "setManageCenterAppLayerConfig"
  ];
  for (const handler of requiredHandlers) {
    assert.ok(source.includes(handler), `Expected Manage Containers handler \"${handler}\" in layout-mode`);
  }
});

test("App Layer Parity Checklist", () => {
  const source = loadLayoutModeSource();
  const checklist: Array<{ id: string; label: string; implemented: boolean }> = [
    { id: "APPX-201", label: "Preferences", implemented: source.includes('"file-preferences"') },
    { id: "APPX-202", label: "Sharing / Hosting", implemented: source.includes('"file-sharing"') },
    { id: "APPX-203", label: "File Options", implemented: source.includes('"file-file-options"') },
    { id: "APPX-204", label: "Recover / Clone / Compact", implemented: source.includes('runWithAppLayerCapability("recover"') },
    { id: "APPX-205", label: "Import / Export", implemented: source.includes('"file-import-export"') },
    { id: "APPX-206", label: "Script Debugger", implemented: source.includes('"tools-script-debugger"') },
    { id: "APPX-207", label: "Data Viewer", implemented: source.includes('"tools-data-viewer"') },
    { id: "APPX-208", label: "File References", implemented: source.includes('"file-file-references"') },
    { id: "APPX-209", label: "Auth Profiles", implemented: source.includes('"file-auth-profiles"') },
    { id: "APPX-210", label: "Plugin Manager", implemented: source.includes('"tools-plugin-manager"') },
    { id: "APPX-211", label: "Window Management Extras", implemented: source.includes('"window-next-window"') },
    { id: "APPX-212", label: "Help / About / Diagnostics", implemented: source.includes('"help-diagnostics"') }
  ];
  const missing = checklist.filter((entry) => !entry.implemented);
  console.log("App Layer Parity Checklist");
  checklist.forEach((entry) => {
    console.log(`- ${entry.id} ${entry.label}: ${entry.implemented ? "PASS" : "FAIL"}`);
  });
  assert.deepEqual(
    missing.map((entry) => entry.id),
    [],
    `Missing APPX coverage for: ${missing.map((entry) => entry.id).join(", ")}`
  );
});

test("Phase 15 Governance Checklist", () => {
  const source = loadLayoutModeSource();
  const checklist: Array<{ id: string; label: string; implemented: boolean }> = [
    { id: "APP-120", label: "Workspace Version History", implemented: source.includes('"file-version-history"') },
    { id: "APP-121", label: "Publish / Promote", implemented: source.includes('"file-publish-promote"') },
    { id: "APP-122", label: "Admin Console", implemented: source.includes('"window-admin-console"') },
    { id: "APP-123", label: "Recovery / Safe Mode", implemented: source.includes('"help-recovery-safe-mode"') }
  ];
  console.log("Phase 15 Governance Checklist");
  checklist.forEach((entry) => {
    console.log(`- ${entry.id} ${entry.label}: ${entry.implemented ? "PASS" : "FAIL"}`);
  });
  const missing = checklist.filter((entry) => !entry.implemented);
  assert.deepEqual(
    missing.map((entry) => entry.id),
    [],
    `Missing Phase 15 coverage for: ${missing.map((entry) => entry.id).join(", ")}`
  );
});

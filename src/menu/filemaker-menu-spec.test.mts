import assert from "node:assert/strict";
import test from "node:test";
import {
  browseModeTopLevelMenuLabels,
  canonicalTopLevelMenuLabels,
  fileManageMenuItems,
  fileSharingMenuItems,
  FILEMAKER_MENU_UNIMPLEMENTED_POLICY,
  layoutModeTopLevelMenuLabels
} from "./filemakerMenuSpec.ts";

test("canonical top-level menus include required FileMaker groups", () => {
  const required = ["File", "Edit", "View", "Insert", "Format", "Records", "Scripts", "Window", "Help"];
  for (const label of required) {
    assert.equal(canonicalTopLevelMenuLabels.includes(label), true, `Missing top-level menu: ${label}`);
  }
});

test("mode-specific top-level menu labels are stable and workspace-free", () => {
  assert.deepEqual([...layoutModeTopLevelMenuLabels], [
    "FileMaker Pro",
    "File",
    "Edit",
    "View",
    "Insert",
    "Format",
    "Layouts",
    "Arrange",
    "Scripts",
    "Tools",
    "Window",
    "Help",
    "FMWeb IDE"
  ]);
  assert.deepEqual([...browseModeTopLevelMenuLabels], [
    "FileMaker Pro",
    "File",
    "Edit",
    "View",
    "Insert",
    "Format",
    "Records",
    "Scripts",
    "Tools",
    "Window",
    "Help",
    "FMWeb IDE"
  ]);
  assert.equal(
    [...layoutModeTopLevelMenuLabels, ...browseModeTopLevelMenuLabels].some((entry) => /workspace/i.test(entry)),
    false
  );
});

test("File > Manage submenu order matches APP-101..APP-110", () => {
  const expected = [
    "Database...",
    "Security...",
    "Value Lists...",
    "Layouts...",
    "Scripts...",
    "External Data Sources...",
    "Containers...",
    "Custom Functions...",
    "Custom Menus...",
    "Themes..."
  ];
  assert.deepEqual(
    fileManageMenuItems.map((entry) => entry.label),
    expected
  );
});

test("File > Sharing submenu order matches FileMaker-style labels", () => {
  const expected = [
    "With FileMaker Network...",
    "With FileMaker WebDirect...",
    "With ODBC/JDBC...",
    "Upload to Host..."
  ];
  assert.deepEqual(
    fileSharingMenuItems.map((entry) => entry.label),
    expected
  );
});

test("unimplemented menu policy remains disabled-and-visible", () => {
  assert.equal(FILEMAKER_MENU_UNIMPLEMENTED_POLICY.strategy, "disabled");
});

test("no File > Manage command id contains workspace", () => {
  const withWorkspace = fileManageMenuItems.filter((entry) => /workspace/i.test(entry.commandId));
  assert.deepEqual(withWorkspace, []);
});

test("no File > Sharing command id contains workspace", () => {
  const withWorkspace = fileSharingMenuItems.filter((entry) => /workspace/i.test(entry.commandId));
  assert.deepEqual(withWorkspace, []);
});

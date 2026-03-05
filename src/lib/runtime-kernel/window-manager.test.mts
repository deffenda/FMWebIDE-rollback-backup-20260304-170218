import assert from "node:assert/strict";
import test from "node:test";
import {
  closeWindow,
  createWindowManagerState,
  focusWindow,
  openWindow,
  patchWindow
} from "./window-manager.ts";

test("window manager opens and focuses card windows", () => {
  let state = createWindowManagerState({
    layoutName: "Asset Details",
    tableOccurrence: "Assets"
  });
  state = openWindow(state, {
    id: "card-1",
    type: "card",
    title: "Assigned",
    parentWindowId: "main",
    layoutName: "Assigned",
    tableOccurrence: "Assignments"
  });

  assert.equal(state.focusedWindowId, "card-1");
  assert.equal(state.windows["card-1"]?.type, "card");
  assert.equal(state.windows["card-1"]?.parentWindowId, "main");

  state = focusWindow(state, "main");
  assert.equal(state.focusedWindowId, "main");
});

test("patchWindow updates layout/mode and appends navigation history", () => {
  const initial = createWindowManagerState({
    layoutName: "Asset Details",
    tableOccurrence: "Assets",
    mode: "browse"
  });
  const patched = patchWindow(initial, {
    windowId: "main",
    layoutName: "Vendors",
    tableOccurrence: "Vendors",
    mode: "find",
    pushNavigation: true
  });
  assert.equal(patched.windows.main.layoutName, "Vendors");
  assert.equal(patched.windows.main.tableOccurrence, "Vendors");
  assert.equal(patched.windows.main.mode, "find");
  assert.equal(patched.windows.main.navigationStack.length, 2);
});

test("closeWindow removes card windows and keeps main", () => {
  let state = createWindowManagerState({
    layoutName: "Asset Details",
    tableOccurrence: "Assets"
  });
  state = openWindow(state, {
    id: "card-delete",
    type: "card",
    parentWindowId: "main",
    layoutName: "Assigned",
    tableOccurrence: "Assignments"
  });
  assert.equal(Boolean(state.windows["card-delete"]), true);

  state = closeWindow(state, "card-delete");
  assert.equal(Boolean(state.windows["card-delete"]), false);
  assert.equal(Boolean(state.windows.main), true);
});

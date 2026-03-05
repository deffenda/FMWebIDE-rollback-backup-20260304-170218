import assert from "node:assert/strict";
import test from "node:test";
import { isMenuCommandEnabled } from "./menuEnablement.ts";
import { createDefaultMenuUiState } from "./uiStateSnapshot.ts";

test("edit undo/redo enablement follows state", () => {
  const state = createDefaultMenuUiState("layout");
  assert.equal(isMenuCommandEnabled("edit-undo", state), false);
  assert.equal(isMenuCommandEnabled("edit-redo", state), false);
  assert.equal(
    isMenuCommandEnabled("edit-undo", {
      ...state,
      canUndo: true
    }),
    true
  );
  assert.equal(
    isMenuCommandEnabled("edit-redo", {
      ...state,
      canRedo: true
    }),
    true
  );
});

test("records actions are mode aware", () => {
  const browseState = {
    ...createDefaultMenuUiState("browse"),
    hasRecord: true
  };
  const findState = createDefaultMenuUiState("find");

  assert.equal(isMenuCommandEnabled("records-new", browseState), true);
  assert.equal(isMenuCommandEnabled("records-new", findState), false);
  assert.equal(isMenuCommandEnabled("records-perform-find", findState), true);
  assert.equal(isMenuCommandEnabled("records-perform-find", browseState), false);
});

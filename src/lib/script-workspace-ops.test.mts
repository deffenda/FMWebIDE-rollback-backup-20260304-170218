import assert from "node:assert/strict";
import test from "node:test";
import {
  deleteScriptWorkspaceStep,
  insertScriptWorkspaceStep,
  moveScriptWorkspaceStep,
  toggleScriptWorkspaceStepEnabled,
  updateScriptWorkspaceStepText,
  type ScriptWorkspaceStep
} from "./script-workspace-ops.ts";

const sampleSteps: ScriptWorkspaceStep[] = [
  { id: "s1", name: "Set Field", text: "Set Field [ Assets::Name ; \"A\" ]", enabled: true },
  { id: "s2", name: "Commit", text: "Commit Records/Requests [ With dialog: Off ]", enabled: true },
  { id: "s3", name: "Show Dialog", text: "Show Custom Dialog [ \"Done\" ]", enabled: true }
];

test("insertScriptWorkspaceStep inserts after selected step", () => {
  const result = insertScriptWorkspaceStep(
    sampleSteps,
    { id: "sx", name: "Go to Layout", text: "Go to Layout [ \"Assets\" ]", enabled: true },
    0,
    "after"
  );
  assert.equal(result.steps.length, 4);
  assert.equal(result.selectedIndex, 1);
  assert.equal(result.steps[1]?.name, "Go to Layout");
});

test("insertScriptWorkspaceStep appends when no selection", () => {
  const result = insertScriptWorkspaceStep(
    sampleSteps,
    { id: "sx", name: "Refresh", text: "Refresh Window", enabled: true },
    -1,
    "after"
  );
  assert.equal(result.selectedIndex, 3);
  assert.equal(result.steps[3]?.name, "Refresh");
});

test("deleteScriptWorkspaceStep removes current selection", () => {
  const result = deleteScriptWorkspaceStep(sampleSteps, 1);
  assert.equal(result.steps.length, 2);
  assert.equal(result.steps[1]?.id, "s3");
  assert.equal(result.selectedIndex, 1);
});

test("moveScriptWorkspaceStep swaps with adjacent step", () => {
  const up = moveScriptWorkspaceStep(sampleSteps, 2, -1);
  assert.equal(up.steps[1]?.id, "s3");
  assert.equal(up.selectedIndex, 1);
  const down = moveScriptWorkspaceStep(sampleSteps, 0, 1);
  assert.equal(down.steps[1]?.id, "s1");
  assert.equal(down.selectedIndex, 1);
});

test("toggleScriptWorkspaceStepEnabled flips enabled flag", () => {
  const result = toggleScriptWorkspaceStepEnabled(sampleSteps, 1);
  assert.equal(result.steps[1]?.enabled, false);
  assert.equal(result.selectedIndex, 1);
});

test("updateScriptWorkspaceStepText patches only selected step text", () => {
  const result = updateScriptWorkspaceStepText(sampleSteps, 2, "Show Custom Dialog [ \"Saved\" ]");
  assert.equal(result.steps[2]?.text, "Show Custom Dialog [ \"Saved\" ]");
  assert.equal(result.steps[0]?.text, sampleSteps[0]?.text);
});

import assert from "node:assert/strict";
import test from "node:test";
import { mapScriptWorkspaceScriptsToDefinitions, mapScriptWorkspaceStep, normalizeScriptStepType } from "./script-workspace-mapper.ts";

test("normalizeScriptStepType maps known and unknown steps safely", () => {
  assert.equal(normalizeScriptStepType("Set Variable"), "Set Variable");
  assert.equal(normalizeScriptStepType("# (comment)"), "Comment");
  assert.equal(normalizeScriptStepType("Unknown Step"), "Comment");
});

test("mapScriptWorkspaceStep parses common bracket params", () => {
  const setVariable = mapScriptWorkspaceStep({
    id: "step-1",
    name: "Set Variable",
    text: 'Set Variable [ $$target ; "Asset Details" ]',
    enabled: true
  });
  assert.equal(setVariable.type, "Set Variable");
  assert.deepEqual(setVariable.params, {
    name: "$$target",
    value: "Asset Details"
  });

  const performScript = mapScriptWorkspaceStep({
    id: "step-2",
    name: "Perform Script",
    text: 'Perform Script [ "Child Script" ; "param" ]',
    enabled: true
  });
  assert.equal(performScript.type, "Perform Script");
  assert.deepEqual(performScript.params, {
    scriptName: "Child Script",
    parameter: "param"
  });
});

test("mapScriptWorkspaceScriptsToDefinitions returns keyed script definitions", () => {
  const definitions = mapScriptWorkspaceScriptsToDefinitions([
    {
      id: "script-1",
      name: "Main Script",
      steps: [
        {
          id: "step-a",
          name: "Go to Layout",
          text: 'Go to Layout [ "Vendors" ]',
          enabled: true
        }
      ]
    }
  ]);
  assert.equal(Boolean(definitions["Main Script"]), true);
  assert.equal(definitions["Main Script"]?.steps[0]?.type, "Go to Layout");
  assert.deepEqual(definitions["Main Script"]?.steps[0]?.params, {
    layoutName: "Vendors"
  });
});

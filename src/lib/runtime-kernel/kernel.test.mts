import assert from "node:assert/strict";
import test from "node:test";
import { createRuntimeKernel } from "./kernel.ts";
import type { ScriptDefinition } from "./types.ts";

test("runtime kernel manages found sets and record navigation", () => {
  const kernel = createRuntimeKernel({
    workspaceId: "assets",
    initialLayoutName: "Asset Details",
    initialTableOccurrence: "Assets",
    initialFoundSet: {
      recordIds: ["100", "200", "300"],
      currentIndex: 0
    }
  });

  const firstSnapshot = kernel.getSnapshot();
  assert.equal(firstSnapshot.windows.length, 1);
  assert.equal(firstSnapshot.foundSets.length, 1);
  assert.equal(firstSnapshot.foundSets[0].currentRecordId, "100");

  const nextRecordId = kernel.navigateRecord({ mode: "next" });
  assert.equal(nextRecordId, "200");
  assert.equal(kernel.getSnapshot().foundSets[0].currentIndex, 1);

  const createdFoundSetId = kernel.createFoundSet({
    recordIds: ["A", "B"],
    attachToWindowId: "main",
    pushNavigation: true
  });
  assert.equal(Boolean(createdFoundSetId), true);
  assert.equal(kernel.getSnapshot().windows[0].foundSetId, createdFoundSetId);
});

test("runtime kernel supports card windows and focus/close semantics", () => {
  const kernel = createRuntimeKernel({
    workspaceId: "assets",
    initialLayoutName: "Asset Details",
    initialTableOccurrence: "Assets"
  });

  const cardWindowId = kernel.openWindow({
    type: "card",
    layoutName: "Assignments Card",
    tableOccurrence: "Assignments",
    parentWindowId: "main"
  });
  assert.notEqual(cardWindowId, "main");
  assert.equal(kernel.getSnapshot().focusedWindowId, cardWindowId);

  const focusedMain = kernel.focusWindow("main");
  assert.equal(focusedMain, true);
  assert.equal(kernel.getSnapshot().focusedWindowId, "main");

  const closed = kernel.closeWindow(cardWindowId);
  assert.equal(closed, true);
  assert.equal(kernel.getSnapshot().windows.length, 1);
});

test("runtime kernel variable scopes and context stack behave as expected", () => {
  const kernel = createRuntimeKernel({
    workspaceId: "assets",
    initialLayoutName: "Asset Details",
    initialTableOccurrence: "Assets"
  });
  kernel.setVariable("$$theme", "Universal Touch");
  kernel.setVariable("$temp", "frame-value", "frame-1");

  assert.equal(kernel.getVariable("$$theme"), "Universal Touch");
  assert.equal(kernel.getVariable("$temp", "frame-1"), "frame-value");
  assert.equal(kernel.getVariable("$temp", "frame-2"), undefined);

  kernel.pushContext({
    reason: "portalRow",
    windowId: "main",
    layoutName: "Asset Details",
    tableOccurrence: "Assignments",
    recordId: "900",
    portal: {
      componentId: "portal-assigned",
      rowToken: "900"
    }
  });
  const resolved = kernel.resolveFieldRef("Name");
  assert.deepEqual(resolved, {
    tableOccurrence: "Assignments",
    fieldName: "Name"
  });
  kernel.popContext("main");
  const afterPop = kernel.resolveFieldRef("Name");
  assert.deepEqual(afterPop, {
    tableOccurrence: "Assets",
    fieldName: "Name"
  });
});

test("runtime kernel script engine updates state and records history", async () => {
  const scripts: Record<string, ScriptDefinition> = {
    "Navigate Script": {
      id: "script-nav",
      name: "Navigate Script",
      steps: [
        {
          id: "step-var",
          type: "Set Variable",
          params: {
            name: "$$navTarget",
            value: "Vendors"
          }
        },
        {
          id: "step-layout",
          type: "Go to Layout",
          params: {
            layoutName: "Vendors"
          }
        },
        {
          id: "step-exit",
          type: "Exit Script",
          params: {
            result: "$$navTarget"
          }
        }
      ]
    }
  };

  const kernel = createRuntimeKernel({
    workspaceId: "assets",
    initialLayoutName: "Asset Details",
    initialTableOccurrence: "Assets",
    scriptsByName: scripts
  });

  const runState = await kernel.runScript({
    scriptName: "Navigate Script"
  });

  assert.equal(runState.status, "completed");
  assert.equal(runState.result?.ok, true);
  assert.equal(runState.result?.returnValue, "Vendors");
  assert.equal(kernel.getVariable("$$navTarget"), "Vendors");
  assert.equal(kernel.getSnapshot().windows[0].layoutName, "Vendors");
  assert.equal(kernel.getState().scriptHistory.length > 0, true);
});

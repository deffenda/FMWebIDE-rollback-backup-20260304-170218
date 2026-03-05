import assert from "node:assert/strict";
import test from "node:test";
import {
  clearAllGlobals,
  clearLocalsForFrame,
  createVariableStoreState,
  getVariable,
  setVariable
} from "./variable-store.ts";

test("variable store scopes $$ globals and $ locals correctly", () => {
  let state = createVariableStoreState();
  state = setVariable(state, {
    name: "$$theme",
    value: "Universal Touch"
  });
  state = setVariable(state, {
    name: "$assetId",
    value: "ASSET-1",
    frameId: "frame-1"
  });
  state = setVariable(state, {
    name: "$assetId",
    value: "ASSET-2",
    frameId: "frame-2"
  });

  assert.equal(getVariable(state, { name: "$$theme" }), "Universal Touch");
  assert.equal(getVariable(state, { name: "$assetId", frameId: "frame-1" }), "ASSET-1");
  assert.equal(getVariable(state, { name: "$assetId", frameId: "frame-2" }), "ASSET-2");
});

test("clear locals and globals removes the expected scopes", () => {
  let state = createVariableStoreState();
  state = setVariable(state, { name: "$$global", value: "keep" });
  state = setVariable(state, { name: "$local", value: 1, frameId: "frame-a" });
  state = setVariable(state, { name: "$local", value: 2, frameId: "frame-b" });

  state = clearLocalsForFrame(state, "frame-a");
  assert.equal(getVariable(state, { name: "$local", frameId: "frame-a" }), undefined);
  assert.equal(getVariable(state, { name: "$local", frameId: "frame-b" }), 2);

  state = clearAllGlobals(state);
  assert.equal(getVariable(state, { name: "$$global" }), undefined);
});

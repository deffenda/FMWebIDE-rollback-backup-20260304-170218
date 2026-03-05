import assert from "node:assert/strict";
import test from "node:test";
import { evaluateRecordCommitRequestPolicy } from "./trigger-policy.ts";
import type { LayoutDefinition } from "./layout-model.ts";

const baseLayout: LayoutDefinition = {
  id: "layout-1",
  name: "Assets",
  defaultTableOccurrence: "Assets",
  canvas: {
    width: 1024,
    height: 768,
    gridSize: 8
  },
  components: [],
  actions: [],
  rules: []
};

test("commit request policy allows commit when no matching rules exist", () => {
  const result = evaluateRecordCommitRequestPolicy(baseLayout, {
    recordId: "1",
    Name: "Laptop"
  });
  assert.equal(result.allowed, true);
  assert.deepEqual(result.reasons, []);
});

test("commit request policy vetoes when deny rule condition matches", () => {
  const layout: LayoutDefinition = {
    ...baseLayout,
    rules: [
      {
        id: "deny-archived",
        condition: 'Status = "Archived"',
        effect: "OnRecordCommitRequest:deny"
      }
    ]
  };
  const result = evaluateRecordCommitRequestPolicy(layout, {
    recordId: "1",
    Status: "Archived"
  });
  assert.equal(result.allowed, false);
  assert.equal(result.reasons.length, 1);
});

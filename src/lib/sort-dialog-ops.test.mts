import test from "node:test";
import assert from "node:assert/strict";

import {
  moveSortRuleByDelta,
  removeSortRuleAtIndex,
  upsertSortRuleByField
} from "./sort-dialog-ops.ts";

type Rule = {
  field: string;
  direction: "asc" | "desc";
};

test("upsertSortRuleByField appends a new rule and selects it", () => {
  const current: Rule[] = [{ field: "Name", direction: "asc" }];
  const next = upsertSortRuleByField(current, { field: "Created On", direction: "desc" });
  assert.deepEqual(next.rules, [
    { field: "Name", direction: "asc" },
    { field: "Created On", direction: "desc" }
  ]);
  assert.equal(next.selectedIndex, 1);
});

test("upsertSortRuleByField replaces an existing rule case-insensitively", () => {
  const current: Rule[] = [{ field: "Name", direction: "asc" }];
  const next = upsertSortRuleByField(current, { field: "name", direction: "desc" });
  assert.deepEqual(next.rules, [{ field: "name", direction: "desc" }]);
  assert.equal(next.selectedIndex, 0);
});

test("removeSortRuleAtIndex removes selected row and keeps a stable selection", () => {
  const current: Rule[] = [
    { field: "Name", direction: "asc" },
    { field: "Type", direction: "asc" },
    { field: "Created On", direction: "desc" }
  ];
  const next = removeSortRuleAtIndex(current, 1);
  assert.deepEqual(next.rules, [
    { field: "Name", direction: "asc" },
    { field: "Created On", direction: "desc" }
  ]);
  assert.equal(next.selectedIndex, 1);
});

test("moveSortRuleByDelta reorders rules and updates selected index", () => {
  const current: Rule[] = [
    { field: "Name", direction: "asc" },
    { field: "Type", direction: "asc" },
    { field: "Created On", direction: "desc" }
  ];
  const next = moveSortRuleByDelta(current, 2, -1);
  assert.deepEqual(next.rules, [
    { field: "Name", direction: "asc" },
    { field: "Created On", direction: "desc" },
    { field: "Type", direction: "asc" }
  ]);
  assert.equal(next.selectedIndex, 1);
});

test("moveSortRuleByDelta is a no-op when moving out of bounds", () => {
  const current: Rule[] = [
    { field: "Name", direction: "asc" },
    { field: "Type", direction: "asc" }
  ];
  const next = moveSortRuleByDelta(current, 0, -1);
  assert.deepEqual(next.rules, current);
  assert.equal(next.selectedIndex, 0);
});

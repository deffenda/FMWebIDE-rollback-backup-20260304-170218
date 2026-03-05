import assert from "node:assert/strict";
import test from "node:test";
import {
  computeSpecifyFieldLabelRect,
  groupSpecifyFieldTableOccurrences,
  sortSpecifyFieldCatalogEntries
} from "./specify-field-ops.ts";

test("sortSpecifyFieldCatalogEntries preserves creation order by default", () => {
  const fields = [
    { name: "zeta", type: "Text" },
    { name: "alpha", type: "Number" }
  ];
  const sorted = sortSpecifyFieldCatalogEntries(fields, "creation");
  assert.deepEqual(sorted.map((entry) => entry.name), ["zeta", "alpha"]);
});

test("sortSpecifyFieldCatalogEntries sorts by name and type deterministically", () => {
  const fields = [
    { name: "zeta", type: "Text" },
    { name: "alpha", type: "Text" },
    { name: "beta", type: "Number" }
  ];
  const byName = sortSpecifyFieldCatalogEntries(fields, "name");
  assert.deepEqual(byName.map((entry) => entry.name), ["alpha", "beta", "zeta"]);
  const byType = sortSpecifyFieldCatalogEntries(fields, "type");
  assert.deepEqual(byType.map((entry) => `${entry.type}:${entry.name}`), [
    "Number:beta",
    "Text:alpha",
    "Text:zeta"
  ]);
});

test("groupSpecifyFieldTableOccurrences separates related and unrelated tables", () => {
  const grouped = groupSpecifyFieldTableOccurrences(
    "Assets",
    ["Assignments", "Employees", "assignments"],
    ["Assets", "Assignments", "Employees", "Audit", "Vendors", "audit"]
  );
  assert.equal(grouped.current, "Assets");
  assert.deepEqual(grouped.related, ["Assignments", "Employees"]);
  assert.deepEqual(grouped.unrelated, ["Audit", "Vendors"]);
});

test("computeSpecifyFieldLabelRect computes top and left placement bounds", () => {
  const top = computeSpecifyFieldLabelRect(
    { x: 120, y: 80, width: 240, height: 32 },
    "top",
    0,
    200
  );
  assert.deepEqual(top, { x: 120, y: 55, width: 240, height: 21 });

  const left = computeSpecifyFieldLabelRect(
    { x: 120, y: 80, width: 240, height: 32 },
    "left",
    0,
    200
  );
  assert.deepEqual(left, { x: 30, y: 84, width: 82, height: 24 });

  const none = computeSpecifyFieldLabelRect(
    { x: 120, y: 80, width: 240, height: 32 },
    "none",
    0,
    200
  );
  assert.equal(none, null);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  parseTableColumnConfigInput,
  resolveOrderedTableFieldNames,
  toggleHeaderSort,
  type TableSortEntry
} from "./list-table-runtime.ts";

test("resolveOrderedTableFieldNames applies order and hidden filters", () => {
  const result = resolveOrderedTableFieldNames(
    ["Name", "Type", "Vendor", "Price"],
    ["Vendor", "Name"],
    ["price"]
  );
  assert.deepEqual(result, ["Vendor", "Name", "Type"]);
});

test("toggleHeaderSort supports single sort toggle cycle", () => {
  const initial: TableSortEntry[] = [];
  const asc = toggleHeaderSort(initial, "Name", false);
  assert.deepEqual(asc, [{ field: "Name", direction: "asc", mode: "standard" }]);

  const desc = toggleHeaderSort(asc, "Name", false);
  assert.deepEqual(desc, [{ field: "Name", direction: "desc", mode: "standard" }]);

  const cleared = toggleHeaderSort(desc, "Name", false);
  assert.deepEqual(cleared, []);
});

test("toggleHeaderSort supports shift multi-sort", () => {
  const start: TableSortEntry[] = [{ field: "Name", direction: "asc", mode: "standard" }];
  const extended = toggleHeaderSort(start, "Type", true);
  assert.deepEqual(extended, [
    { field: "Name", direction: "asc", mode: "standard" },
    { field: "Type", direction: "asc", mode: "standard" }
  ]);

  const toggled = toggleHeaderSort(extended, "Type", true);
  assert.deepEqual(toggled, [
    { field: "Name", direction: "asc", mode: "standard" },
    { field: "Type", direction: "desc", mode: "standard" }
  ]);
});

test("parseTableColumnConfigInput parses order and hidden markers", () => {
  const parsed = parseTableColumnConfigInput("Name,-Type,Vendor,-unknown", ["Name", "Type", "Vendor"]);
  assert.deepEqual(parsed.order, ["Name", "Type", "Vendor"]);
  assert.deepEqual(parsed.hidden, ["Type"]);
});

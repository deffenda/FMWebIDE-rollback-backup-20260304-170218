import assert from "node:assert/strict";
import test from "node:test";
import type { FMRecord } from "./layout-model.ts";
import { buildTableDisplayRows, sortRecordRows, type TableSortEntry } from "./sort-reporting.ts";

const records: FMRecord[] = [
  { recordId: "10", Name: "Laptop", Price: 1200, Type: "Computer" },
  { recordId: "20", Name: "Camera", Price: 900, Type: "Accessory" },
  { recordId: "30", Name: "Tablet", Price: 1500, Type: "Computer" }
];

test("sortRecordRows supports standard numeric sort", () => {
  const sortSpec: TableSortEntry[] = [
    {
      field: "Price",
      direction: "asc",
      mode: "standard"
    }
  ];
  const rows = sortRecordRows(records, sortSpec);
  assert.deepEqual(
    rows.map((entry) => entry.record.recordId),
    ["20", "10", "30"]
  );
});

test("sortRecordRows supports value-list custom order", () => {
  const sortSpec: TableSortEntry[] = [
    {
      field: "Type",
      direction: "asc",
      mode: "valueList",
      valueList: ["Accessory", "Computer"]
    }
  ];
  const rows = sortRecordRows(records, sortSpec);
  assert.deepEqual(
    rows.map((entry) => entry.record.recordId),
    ["20", "10", "30"]
  );
});

test("buildTableDisplayRows emits group/subsummary/grand summary rows", () => {
  const rows = buildTableDisplayRows({
    records,
    fieldNames: ["Name", "Price", "Type"],
    sort: [
      {
        field: "Name",
        direction: "asc",
        mode: "standard"
      }
    ],
    leadingGrandSummary: true,
    trailingGrandSummary: true,
    leadingGroupField: "Type",
    trailingGroupField: null,
    leadingSubtotals: {
      Price: ["sum", "count"]
    },
    trailingSubtotals: {}
  });

  const kinds = rows.map((entry) => entry.kind);
  assert.ok(kinds.includes("group"));
  assert.ok(kinds.includes("summary"));
  assert.ok(kinds.includes("record"));

  const first = rows[0];
  assert.equal(first.kind, "summary");
  if (first.kind === "summary") {
    assert.equal(first.variant, "grand-leading");
  }

  const last = rows[rows.length - 1];
  assert.equal(last.kind, "summary");
  if (last.kind === "summary") {
    assert.equal(last.variant, "grand-trailing");
  }
});

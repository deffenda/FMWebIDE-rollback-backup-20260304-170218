import assert from "node:assert/strict";
import test from "node:test";
import { calculateGroupedSummarySet, calculateSummaryOperation, calculateSummarySet } from "./summary-engine.ts";
import type { FMRecord } from "./layout-model.ts";

const SAMPLE_RECORDS: FMRecord[] = [
  {
    recordId: "1",
    Type: "Laptop",
    Price: 1000,
    Quantity: 1
  },
  {
    recordId: "2",
    Type: "Laptop",
    Price: 1400,
    Quantity: 2
  },
  {
    recordId: "3",
    Type: "Tablet",
    Price: 700,
    Quantity: 1
  }
];

test("summary engine calculates base aggregate operations", () => {
  assert.equal(calculateSummaryOperation({ records: SAMPLE_RECORDS }, "Price", "count"), 3);
  assert.equal(calculateSummaryOperation({ records: SAMPLE_RECORDS }, "Price", "sum"), 3100);
  assert.equal(calculateSummaryOperation({ records: SAMPLE_RECORDS }, "Price", "avg"), 1033.3333333333333);
  assert.equal(calculateSummaryOperation({ records: SAMPLE_RECORDS }, "Price", "min"), 700);
  assert.equal(calculateSummaryOperation({ records: SAMPLE_RECORDS }, "Price", "max"), 1400);
});

test("summary engine builds multi-field summary sets", () => {
  const summary = calculateSummarySet(
    {
      records: SAMPLE_RECORDS
    },
    [
      {
        field: "Price",
        operations: ["sum", "avg"]
      },
      {
        field: "Quantity",
        operations: ["sum", "max"]
      }
    ]
  );
  assert.equal(summary.Price.sum, 3100);
  assert.equal(summary.Price.avg, 1033.3333333333333);
  assert.equal(summary.Quantity.sum, 4);
  assert.equal(summary.Quantity.max, 2);
});

test("group summary reflects record edits deterministically", () => {
  const groupedBefore = calculateGroupedSummarySet(
    {
      records: SAMPLE_RECORDS
    },
    "Type",
    [
      {
        field: "Price",
        operations: ["count", "sum", "avg"]
      }
    ]
  );
  assert.equal(groupedBefore.Laptop.Price.count, 2);
  assert.equal(groupedBefore.Laptop.Price.sum, 2400);
  assert.equal(groupedBefore.Tablet.Price.sum, 700);

  const edited = SAMPLE_RECORDS.map((entry) =>
    entry.recordId === "3"
      ? {
          ...entry,
          Type: "Laptop",
          Price: 800
        }
      : entry
  );
  const groupedAfter = calculateGroupedSummarySet(
    {
      records: edited
    },
    "Type",
    [
      {
        field: "Price",
        operations: ["count", "sum"]
      }
    ]
  );
  assert.equal(groupedAfter.Laptop.Price.count, 3);
  assert.equal(groupedAfter.Laptop.Price.sum, 3200);
  assert.equal(groupedAfter.Tablet, undefined);
});

import assert from "node:assert/strict";
import test from "node:test";
import type { FMRecord } from "./layout-model.ts";
import {
  applyFindRequestsOnRecords,
  buildFileMakerFindPayload,
  constrainFoundSetRecordIds,
  createFindRequest,
  extendFoundSetRecordIds,
  normalizeFindCriteriaMap,
  recordMatchesFindCriteria,
  summarizeFindRequests
} from "./find-mode.ts";

const records: FMRecord[] = [
  {
    recordId: "1",
    Name: "Laptop-Field",
    Status: "Active",
    Price: 1200,
    PurchaseDate: "2026-01-01"
  },
  {
    recordId: "2",
    Name: "Laptop-Office",
    Status: "Archived",
    Price: 900,
    PurchaseDate: "2026-02-14"
  },
  {
    recordId: "3",
    Name: "Camera-Field",
    Status: "Active",
    Price: 1800,
    PurchaseDate: "2026-01-21"
  }
];

test("normalizeFindCriteriaMap trims and removes empties", () => {
  assert.deepEqual(
    normalizeFindCriteriaMap({
      " Name ": "  Alpha  ",
      Empty: " ",
      "": "x"
    }),
    {
      Name: "Alpha"
    }
  );
});

test("recordMatchesFindCriteria supports wildcard/range/comparison operators", () => {
  assert.equal(recordMatchesFindCriteria(records[0], { Name: "Laptop*" }), true);
  assert.equal(recordMatchesFindCriteria(records[2], { Price: ">1000" }), true);
  assert.equal(recordMatchesFindCriteria(records[1], { PurchaseDate: "2026-02-01...2026-03-01" }), true);
  assert.equal(recordMatchesFindCriteria(records[1], { Name: "==Laptop-Field" }), false);
});

test("applyFindRequestsOnRecords supports include + omit semantics", () => {
  const include = createFindRequest({
    id: "include-1",
    criteria: {
      Name: "Laptop*"
    },
    omit: false
  });
  const omit = createFindRequest({
    id: "omit-1",
    criteria: {
      Status: "Archived"
    },
    omit: true
  });
  const result = applyFindRequestsOnRecords(records, [include, omit]);
  assert.deepEqual(
    result.records.map((entry) => entry.recordId),
    ["1"]
  );
  assert.equal(result.includeRequests.length, 1);
  assert.equal(result.omitRequests.length, 1);
});

test("constrain/extend found set helpers preserve FileMaker-like ordering", () => {
  const current = ["1", "2", "3"];
  const next = ["3", "1", "4"];
  assert.deepEqual(constrainFoundSetRecordIds(current, next), ["1", "3"]);
  assert.deepEqual(extendFoundSetRecordIds(current, next), ["1", "2", "3", "4"]);
});

test("buildFileMakerFindPayload translates omit requests for Data API _find", () => {
  const include = createFindRequest({
    id: "include",
    criteria: { Name: "Laptop*" },
    omit: false
  });
  const omit = createFindRequest({
    id: "omit",
    criteria: { Status: "Archived" },
    omit: true
  });
  const payload = buildFileMakerFindPayload({
    requests: [include, omit],
    limit: 25,
    offset: 1,
    sort: [
      {
        fieldName: "Name",
        sortOrder: "ascend"
      }
    ]
  });

  assert.deepEqual(payload, {
    query: [
      {
        Name: "Laptop*"
      },
      {
        Status: "Archived",
        omit: "true"
      }
    ],
    limit: 25,
    offset: 1,
    sort: [
      {
        fieldName: "Name",
        sortOrder: "ascend"
      }
    ]
  });
});

test("summarizeFindRequests emits readable include/omit labels", () => {
  const summary = summarizeFindRequests([
    createFindRequest({
      id: "a",
      criteria: { Name: "Laptop*" }
    }),
    createFindRequest({
      id: "b",
      criteria: { Status: "Archived" },
      omit: true
    })
  ]);
  assert.equal(summary, "Include (Name: Laptop*) OR Omit (Status: Archived)");
});

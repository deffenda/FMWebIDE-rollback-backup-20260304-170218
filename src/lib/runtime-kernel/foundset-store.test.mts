import assert from "node:assert/strict";
import test from "node:test";
import {
  attachFoundSetPage,
  attachFoundSetRecord,
  createFoundSet,
  currentFoundSetRecordId,
  goToFoundSetRecord,
  refreshFoundSet
} from "./foundset-store.ts";

test("createFoundSet normalizes ids and index", () => {
  const foundSet = createFoundSet({
    id: "fs-assets",
    dataSource: {
      workspaceId: "assets",
      layoutName: "Asset Details",
      tableOccurrence: "Assets"
    },
    recordIds: ["1", "", "2", " 3 "],
    currentIndex: 10
  });
  assert.equal(foundSet.id, "fs-assets");
  assert.deepEqual(foundSet.recordIds, ["1", "2", "3"]);
  assert.equal(foundSet.currentIndex, 2);
  assert.equal(foundSet.totalCount, 3);
  assert.equal(foundSet.pageSize, 3);
  assert.deepEqual(foundSet.loadedPageIndexes, [0]);
});

test("goToFoundSetRecord supports mode/index/recordId navigation", () => {
  const initial = createFoundSet({
    id: "fs-nav",
    dataSource: {
      workspaceId: "assets",
      layoutName: "Asset Details",
      tableOccurrence: "Assets"
    },
    recordIds: ["10", "20", "30"],
    currentIndex: 1
  });

  assert.equal(currentFoundSetRecordId(initial), "20");
  assert.equal(currentFoundSetRecordId(goToFoundSetRecord(initial, { mode: "first" })), "10");
  assert.equal(currentFoundSetRecordId(goToFoundSetRecord(initial, { mode: "last" })), "30");
  assert.equal(currentFoundSetRecordId(goToFoundSetRecord(initial, { mode: "prev" })), "10");
  assert.equal(currentFoundSetRecordId(goToFoundSetRecord(initial, { mode: "next" })), "30");
  assert.equal(currentFoundSetRecordId(goToFoundSetRecord(initial, { index: 0 })), "10");
  assert.equal(currentFoundSetRecordId(goToFoundSetRecord(initial, { recordId: "30" })), "30");
});

test("refreshFoundSet preserves record when available", () => {
  const initial = createFoundSet({
    id: "fs-refresh",
    dataSource: {
      workspaceId: "assets",
      layoutName: "Asset Details",
      tableOccurrence: "Assets"
    },
    recordIds: ["100", "200", "300"],
    currentIndex: 1
  });
  const refreshed = refreshFoundSet({
    foundSet: initial,
    recordIds: ["050", "200", "600"]
  });
  assert.equal(refreshed.currentIndex, 1);
  assert.equal(currentFoundSetRecordId(refreshed), "200");
});

test("attachFoundSetRecord adds and optionally selects new record", () => {
  const initial = createFoundSet({
    id: "fs-attach",
    dataSource: {
      workspaceId: "assets",
      layoutName: "Asset Details",
      tableOccurrence: "Assets"
    },
    recordIds: ["1", "2"],
    currentIndex: 0
  });

  const appended = attachFoundSetRecord(initial, "3");
  assert.deepEqual(appended.recordIds, ["1", "2", "3"]);
  assert.equal(currentFoundSetRecordId(appended), "1");

  const selected = attachFoundSetRecord(appended, "4", true);
  assert.equal(currentFoundSetRecordId(selected), "4");
});

test("found set page attachments support sparse index navigation", () => {
  const initial = createFoundSet({
    id: "fs-pages",
    dataSource: {
      workspaceId: "assets",
      layoutName: "Asset List",
      tableOccurrence: "Assets"
    },
    pageSize: 2,
    pages: {
      0: ["1", "2"]
    },
    totalCount: 6
  });

  const withSecondPage = attachFoundSetPage({
    foundSet: initial,
    pageIndex: 1,
    recordIds: ["3", "4"],
    totalCount: 6
  });

  const moved = goToFoundSetRecord(withSecondPage, { index: 2 });
  assert.equal(currentFoundSetRecordId(moved), "3");
  assert.equal(moved.totalCount, 6);
  assert.deepEqual(moved.loadedPageIndexes, [0, 1]);
});

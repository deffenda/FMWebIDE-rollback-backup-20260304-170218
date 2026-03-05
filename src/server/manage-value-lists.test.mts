import assert from "node:assert/strict";
import test from "node:test";
import {
  applyManageValueListsDraftToSnapshot,
  buildManageValueListsPayload
} from "./manage-value-lists.ts";
import type { SchemaSnapshot } from "../lib/schemaSnapshot/types.ts";

function sampleSnapshot(): SchemaSnapshot {
  return {
    version: 1,
    snapshotId: "snapshot-1",
    workspaceId: "default",
    createdAt: "2026-03-03T00:00:00.000Z",
    source: "workspace",
    fileIds: ["project-tracker", "common"],
    metadata: {
      ddrPaths: [],
      warnings: []
    },
    files: [
      {
        fileId: "project-tracker",
        workspaceId: "default",
        displayName: "Project Tracker",
        databaseName: "ProjectTracker",
        primary: true,
        dependencies: ["common"],
        tables: [],
        tableOccurrences: [],
        relationships: [],
        valueLists: [
          {
            id: "vl-1",
            name: "Status",
            source: "Custom Values",
            sourceFields: [],
            values: ["Open", "Closed"]
          }
        ],
        layouts: [
          {
            layoutId: "layout-1",
            layoutName: "Assets",
            baseTableOccurrence: "Assets",
            referencedFields: [],
            referencedTableOccurrences: [],
            referencedValueLists: ["Status"],
            portals: []
          }
        ],
        scripts: []
      },
      {
        fileId: "common",
        workspaceId: "default",
        displayName: "Common",
        databaseName: "Common",
        primary: false,
        dependencies: [],
        tables: [],
        tableOccurrences: [],
        relationships: [],
        valueLists: [],
        layouts: [],
        scripts: []
      }
    ]
  };
}

test("buildManageValueListsPayload includes usage references for selected file", () => {
  const payload = buildManageValueListsPayload(sampleSnapshot(), { selectedFileId: "project-tracker" });
  assert.equal(payload.selectedFileId, "project-tracker");
  assert.equal(payload.source, "workspace");
  assert.equal(payload.valueLists.length, 1);
  assert.equal(payload.valueLists[0]?.name, "Status");
  assert.equal(payload.valueLists[0]?.usageCount, 1);
  assert.equal(payload.valueLists[0]?.usageRefs[0]?.layoutName, "Assets");
});

test("applyManageValueListsDraftToSnapshot rewrites selected file value lists deterministically", () => {
  const updated = applyManageValueListsDraftToSnapshot(sampleSnapshot(), {
    fileId: "project-tracker",
    valueLists: [
      {
        id: "vl-1",
        name: "Status",
        source: "Custom Values",
        values: ["Open", "Closed", "Archived"]
      },
      {
        id: "vl-2",
        name: "Status",
        source: "Custom Values",
        values: ["Deferred"]
      },
      {
        id: "vl-3",
        name: "Team",
        source: "From Field",
        sourceFields: ["Employees::Name"]
      }
    ]
  });
  const targetFile = updated.files.find((entry) => entry.fileId === "project-tracker");
  assert.ok(targetFile);
  assert.equal(targetFile?.valueLists.length, 3);
  assert.equal(targetFile?.valueLists[0]?.name, "Status");
  assert.equal(targetFile?.valueLists[1]?.name, "Status 2");
  assert.deepEqual(targetFile?.valueLists[2]?.sourceFields, ["Employees::Name"]);
  assert.equal(targetFile?.valueLists[0]?.values[2], "Archived");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyManageDatabaseDraftToSnapshot,
  buildManageDatabasePayload
} from "./manage-database.ts";
import type { SchemaSnapshot } from "../lib/schemaSnapshot/types.ts";

const baseSnapshot: SchemaSnapshot = {
  version: 1,
  snapshotId: "snapshot-1",
  workspaceId: "default",
  createdAt: "2026-03-03T00:00:00.000Z",
  source: "workspace",
  fileIds: ["assets"],
  files: [
    {
      fileId: "assets",
      workspaceId: "default",
      displayName: "Assets",
      databaseName: "Assets",
      primary: true,
      dependencies: [],
      tables: [
        {
          id: "table-assets",
          name: "Asset Details",
          source: "FileMaker",
          fields: [
            {
              id: "field-name",
              name: "AssetName",
              type: "Text"
            }
          ]
        }
      ],
      tableOccurrences: [
        {
          id: "to-assets",
          name: "Asset Details",
          baseTableId: "table-assets",
          baseTableName: "Asset Details",
          relationshipTargets: [],
          x: 120,
          y: 100,
          width: 240,
          height: 180
        }
      ],
      relationships: [],
      valueLists: [],
      layouts: [],
      scripts: []
    }
  ],
  metadata: {
    ddrPaths: [],
    warnings: []
  }
};

test("buildManageDatabasePayload maps schema snapshot into graph payload", () => {
  const payload = buildManageDatabasePayload(baseSnapshot, {
    selectedFileId: "assets"
  });
  assert.equal(payload.selectedFileId, "assets");
  assert.equal(payload.files.length, 1);
  assert.equal(payload.baseTables.length, 1);
  assert.equal(payload.baseTables[0]?.name, "Asset Details");
  assert.equal(payload.nodes.length, 1);
  assert.equal(payload.nodes[0]?.id, "to-assets");
  assert.equal(payload.fieldsByBaseTableId["table-assets"]?.length, 1);
  assert.equal(payload.fieldsByBaseTableId["table-assets"]?.[0]?.name, "AssetName");
});

test("applyManageDatabaseDraftToSnapshot applies table and field edits", () => {
  const payload = buildManageDatabasePayload(baseSnapshot, {
    selectedFileId: "assets"
  });
  const draft = {
    fileId: "assets",
    baseTables: [
      {
        ...payload.baseTables[0],
        name: "Asset Master"
      }
    ],
    fieldsByBaseTableId: {
      "table-assets": [
        {
          ...payload.fieldsByBaseTableId["table-assets"]?.[0],
          name: "AssetLabel",
          type: "Text",
          fieldType: "Normal",
          options: "Required Value",
          comment: "Renamed by test",
          creationIndex: 1
        }
      ]
    },
    nodes: payload.nodes,
    edges: payload.edges
  };
  const next = applyManageDatabaseDraftToSnapshot(baseSnapshot, draft);
  const file = next.files[0];
  assert.equal(file?.tables[0]?.name, "Asset Master");
  assert.equal(file?.tables[0]?.fields[0]?.name, "AssetLabel");
  assert.equal(file?.tables[0]?.fields[0]?.options, "Required Value");
  assert.equal(file?.tables[0]?.fields[0]?.comment, "Renamed by test");
});

import assert from "node:assert/strict";
import test from "node:test";
import { promises as fs } from "node:fs";
import path from "node:path";
import { workspaceRootPath } from "./workspace-context.ts";
import { readSavedSearchConfig, writeSavedSearchConfig } from "./saved-search-storage.ts";

function uniqueWorkspaceId(): string {
  return `saved-search-test-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

test("saved-search storage writes and reads normalized payload", async (t) => {
  const workspaceId = uniqueWorkspaceId();
  const rootPath = workspaceRootPath(workspaceId);

  t.after(async () => {
    await fs.rm(rootPath, { recursive: true, force: true });
  });

  const saved = await writeSavedSearchConfig(workspaceId, {
    savedFinds: [
      {
        id: "find-1",
        name: "Assets by Type",
        requests: [
          {
            id: "request-1",
            criteria: {
              Type: "Laptop"
            },
            omit: false
          }
        ],
        createdAt: Date.now(),
        layoutId: "Asset Details"
      }
    ],
    savedFoundSets: [
      {
        id: "found-1",
        name: "Asset Snapshot",
        layoutId: "Asset Details",
        tableOccurrence: "Assets",
        recordIds: ["1", "2", "3"],
        capturedAt: Date.now(),
        source: "find"
      }
    ]
  });

  assert.equal(saved.savedFinds.length, 1);
  assert.equal(saved.savedFoundSets.length, 1);

  const loaded = await readSavedSearchConfig(workspaceId);
  assert.equal(loaded.savedFinds[0]?.name, "Assets by Type");
  assert.deepEqual(loaded.savedFoundSets[0]?.recordIds, ["1", "2", "3"]);
});

test("saved-search storage drops malformed entries instead of crashing", async (t) => {
  const workspaceId = uniqueWorkspaceId();
  const rootPath = workspaceRootPath(workspaceId);

  t.after(async () => {
    await fs.rm(rootPath, { recursive: true, force: true });
  });

  await fs.mkdir(rootPath, { recursive: true });
  await fs.writeFile(
    path.join(rootPath, "saved-searches.json"),
    JSON.stringify({
      version: 1,
      savedFinds: [{ id: "", name: "", requests: [] }],
      savedFoundSets: [{ id: "missing-layout", name: "Bad", recordIds: [""] }]
    }),
    "utf8"
  );

  const loaded = await readSavedSearchConfig(workspaceId);
  assert.deepEqual(loaded.savedFinds, []);
  assert.deepEqual(loaded.savedFoundSets, []);
});

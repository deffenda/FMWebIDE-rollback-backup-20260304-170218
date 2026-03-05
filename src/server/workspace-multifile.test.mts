import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import test from "node:test";
import {
  ensureWorkspaceStorage,
  readWorkspaceConfig,
  workspaceConfigPath,
  workspaceRootPath,
  writeWorkspaceConfig
} from "./workspace-context.ts";
import {
  WorkspaceRoutingError,
  buildWorkspaceRoutingSnapshot,
  resolveWorkspaceGraph,
  resolveWorkspaceRoutingTarget
} from "./workspace-multifile.ts";

function uniqueWorkspaceId(seed: string): string {
  return `${seed}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

test("workspace config parser auto-migrates v1 config to multi-file shape", async (t) => {
  const workspaceId = uniqueWorkspaceId("phase7-v1");
  const rootPath = workspaceRootPath(workspaceId);
  t.after(async () => {
    await fs.rm(rootPath, { recursive: true, force: true });
  });

  await ensureWorkspaceStorage(workspaceId);
  await fs.writeFile(
    workspaceConfigPath(workspaceId),
    JSON.stringify(
      {
        version: 1,
        id: workspaceId,
        name: "Legacy Workspace",
        filemaker: {
          host: "https://fm.local",
          database: "LegacyDB",
          username: "legacy-user",
          password: "legacy-pass",
          dependsOn: ["common-legacy"]
        }
      },
      null,
      2
    ),
    "utf8"
  );

  const config = await readWorkspaceConfig(workspaceId);
  assert.ok(config, "Expected config to parse");
  assert.equal(config?.version, 2);
  assert.equal(config?.files?.length, 1);
  assert.equal(config?.files?.[0]?.databaseName, "LegacyDB");
  assert.equal(config?.files?.[0]?.primary, true);
});

test("workspace graph resolves dependency files and explicit TO routing", async (t) => {
  const commonWorkspaceId = uniqueWorkspaceId("phase7-common");
  const projectWorkspaceId = uniqueWorkspaceId("phase7-project");

  t.after(async () => {
    await fs.rm(workspaceRootPath(projectWorkspaceId), { recursive: true, force: true });
    await fs.rm(workspaceRootPath(commonWorkspaceId), { recursive: true, force: true });
  });

  await writeWorkspaceConfig(commonWorkspaceId, {
    name: "Common",
    filemaker: {
      host: "https://fm.local",
      database: "Common",
      username: "common-user",
      password: "common-pass"
    },
    files: [
      {
        fileId: "common",
        databaseName: "Common",
        host: "https://fm.local",
        username: "common-user",
        password: "common-pass",
        primary: true,
        apiLayoutsByTableOccurrence: {
          "CM.PERSONS": "CM.PERSONS"
        }
      }
    ]
  });

  await writeWorkspaceConfig(projectWorkspaceId, {
    name: "ProjectTracker",
    filemaker: {
      host: "https://fm.local",
      database: "ProjectTracker",
      username: "project-user",
      password: "project-pass",
      dependsOn: [commonWorkspaceId]
    },
    files: [
      {
        fileId: "projecttracker",
        databaseName: "ProjectTracker",
        host: "https://fm.local",
        username: "project-user",
        password: "project-pass",
        primary: true
      }
    ],
    routing: {
      toIndex: {
        "CM.PERSONS": {
          fileId: "common",
          databaseName: "Common",
          apiLayoutName: "CM.PERSONS"
        }
      }
    }
  });

  const graph = resolveWorkspaceGraph(projectWorkspaceId);
  assert.ok(graph.files.length >= 2, "Expected primary + dependency file in graph");
  assert.ok(graph.byFileId.common, "Expected dependency file in file index");

  const resolved = resolveWorkspaceRoutingTarget({
    workspaceId: projectWorkspaceId,
    operation: "write",
    tableOccurrence: "CM.PERSONS",
    layoutNameHint: "CM.PERSONS"
  });
  assert.equal(resolved.target.databaseName, "Common");
  assert.equal(resolved.target.fileId, "common");
  assert.equal(resolved.target.apiLayoutName, "CM.PERSONS");
  assert.equal(resolved.target.source, "to-index");

  const snapshot = buildWorkspaceRoutingSnapshot(projectWorkspaceId);
  assert.equal(snapshot.workspaceId, projectWorkspaceId);
  assert.ok(snapshot.indexes.toIndexCount >= 1);
});

test("cross-file write without API layout mapping returns actionable routing error", async (t) => {
  const commonWorkspaceId = uniqueWorkspaceId("phase7-common");
  const projectWorkspaceId = uniqueWorkspaceId("phase7-project");

  t.after(async () => {
    await fs.rm(workspaceRootPath(projectWorkspaceId), { recursive: true, force: true });
    await fs.rm(workspaceRootPath(commonWorkspaceId), { recursive: true, force: true });
  });

  await writeWorkspaceConfig(commonWorkspaceId, {
    name: "Common",
    filemaker: {
      host: "https://fm.local",
      database: "Common",
      username: "common-user",
      password: "common-pass"
    }
  });
  await writeWorkspaceConfig(projectWorkspaceId, {
    name: "ProjectTracker",
    filemaker: {
      host: "https://fm.local",
      database: "ProjectTracker",
      username: "project-user",
      password: "project-pass",
      dependsOn: [commonWorkspaceId]
    }
  });

  assert.throws(
    () =>
      resolveWorkspaceRoutingTarget({
        workspaceId: projectWorkspaceId,
        operation: "write",
        tableOccurrence: "Common.Tasks",
        layoutNameHint: "Common.Tasks"
      }),
    (error: unknown) => {
      assert.ok(error instanceof WorkspaceRoutingError);
      assert.equal(error.code, "WORKSPACE_API_LAYOUT_MISSING");
      return true;
    }
  );
});


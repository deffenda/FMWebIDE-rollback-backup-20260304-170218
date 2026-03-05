import assert from "node:assert/strict";
import test from "node:test";
import { readWorkspaceConfig, writeWorkspaceConfig } from "./workspace-context.ts";
import {
  readWorkspaceDatabaseSession,
  updateWorkspaceDatabaseSession
} from "./workspace-database-session.ts";

function uniqueWorkspaceId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

test("database session update switches active file and preserves password when omitted", async () => {
  const workspaceId = uniqueWorkspaceId("db-session-activate");
  await writeWorkspaceConfig(workspaceId, {
    name: workspaceId,
    filemaker: {
      host: "https://fm.example.com",
      database: "Assets",
      username: "admin",
      password: "primary-secret"
    },
    files: [
      {
        fileId: "assets-file",
        displayName: "Assets",
        databaseName: "Assets",
        host: "https://fm.example.com",
        username: "admin",
        password: "primary-secret",
        primary: true,
        status: "connected"
      },
      {
        fileId: "common-file",
        displayName: "Common",
        databaseName: "Common",
        host: "https://fm.example.com",
        username: "common-user",
        password: "common-secret",
        status: "unknown"
      }
    ]
  });

  const updated = await updateWorkspaceDatabaseSession(workspaceId, {
    fileId: "common-file",
    host: "https://fm.example.com",
    username: "common-user-updated",
    activate: true,
    loadLayouts: false
  });

  assert.equal(updated.activeFileId, "common-file");
  const active = updated.files.find((entry) => entry.fileId === "common-file");
  assert.equal(active?.primary, true);

  const stored = await readWorkspaceConfig(workspaceId);
  const storedCommon = stored?.files?.find((entry) => entry.fileId === "common-file");
  assert.equal(storedCommon?.primary, true);
  assert.equal(storedCommon?.username, "common-user-updated");
  assert.equal(storedCommon?.password, "common-secret");
});

test("database session update can clear saved password", async () => {
  const workspaceId = uniqueWorkspaceId("db-session-clear");
  await writeWorkspaceConfig(workspaceId, {
    name: workspaceId,
    filemaker: {
      host: "https://fm.example.com",
      database: "Assets",
      username: "admin",
      password: "primary-secret"
    },
    files: [
      {
        fileId: "assets-file",
        displayName: "Assets",
        databaseName: "Assets",
        host: "https://fm.example.com",
        username: "admin",
        password: "primary-secret",
        primary: true,
        status: "connected"
      }
    ]
  });

  await updateWorkspaceDatabaseSession(workspaceId, {
    fileId: "assets-file",
    clearPassword: true,
    activate: true,
    loadLayouts: false
  });

  const snapshot = await readWorkspaceDatabaseSession(workspaceId);
  assert.equal(snapshot.files[0]?.hasPassword, false);
});

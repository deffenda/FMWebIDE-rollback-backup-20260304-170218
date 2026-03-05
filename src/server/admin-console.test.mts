import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import test from "node:test";
import { appendAuditEvent } from "./audit-log.ts";
import { buildAdminConsolePayload } from "./admin-console.ts";
import { workspaceRootPath, writeWorkspaceConfig } from "./workspace-context.ts";
import { createWorkspaceVersion } from "./workspace-versioning.ts";
import { writeWorkspaceGovernanceConfig } from "./workspace-governance-storage.ts";

function uniqueWorkspaceId(seed: string): string {
  return `${seed}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

test("admin console payload aggregates workspace version/governance status", async (t) => {
  const workspaceId = uniqueWorkspaceId("phase15-admin");
  const rootPath = workspaceRootPath(workspaceId);
  t.after(async () => {
    await fs.rm(rootPath, { recursive: true, force: true });
  });

  await writeWorkspaceConfig(workspaceId, {
    name: "Admin Console Workspace",
    files: [
      {
        fileId: "projecttracker",
        databaseName: "ProjectTracker",
        status: "connected",
        dependencies: ["common"]
      },
      {
        fileId: "common",
        databaseName: "Common",
        status: "connected",
        dependencies: []
      }
    ]
  });

  const version = await createWorkspaceVersion(workspaceId, {
    createdBy: "admin",
    message: "Initial"
  });

  await writeWorkspaceGovernanceConfig(workspaceId, {
    activeEnvironment: "test",
    environments: {
      dev: {
        name: "dev",
        versionId: version.version.versionId,
        featureFlagOverrides: {},
        pluginAllowlist: [],
        updatedAt: new Date().toISOString()
      },
      test: {
        name: "test",
        versionId: version.version.versionId,
        featureFlagOverrides: { featureX: true },
        pluginAllowlist: ["logger-plugin"],
        updatedAt: new Date().toISOString()
      },
      prod: {
        name: "prod",
        versionId: undefined,
        featureFlagOverrides: {},
        pluginAllowlist: [],
        updatedAt: new Date().toISOString()
      }
    }
  });

  await appendAuditEvent({
    eventType: "workspace.manage",
    status: "success",
    userId: "admin",
    workspaceId,
    message: "Admin check"
  });

  const payload = await buildAdminConsolePayload({
    workspaceIds: [workspaceId],
    auditLimit: 50
  });

  assert.equal(payload.workspaceCount, 1);
  assert.equal(payload.workspaces[0]?.workspaceId, workspaceId);
  assert.equal(payload.workspaces[0]?.activeEnvironment, "test");
  assert.equal(payload.workspaces[0]?.currentVersionId, version.version.versionId);
  assert.equal(payload.workspaces[0]?.dependencyHealth.healthy, true);
  assert.ok(payload.audit.count >= 1);
  assert.ok((payload.metrics.counters?.routeCalls ?? 0) >= 0);
});

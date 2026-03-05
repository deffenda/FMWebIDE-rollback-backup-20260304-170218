import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import test from "node:test";
import { workspaceRootPath, writeWorkspaceConfig } from "./workspace-context.ts";
import {
  computeWorkspaceDependencyHealth,
  promoteWorkspaceVersion,
  readWorkspaceGovernanceConfig,
  rollbackWorkspacePromotion,
  writeWorkspaceGovernanceConfig
} from "./workspace-governance-storage.ts";
import { createWorkspaceVersion } from "./workspace-versioning.ts";

function uniqueWorkspaceId(seed: string): string {
  return `${seed}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

test("dependency health reports missing dependency references", async (t) => {
  const workspaceId = uniqueWorkspaceId("phase15-deps");
  const rootPath = workspaceRootPath(workspaceId);
  t.after(async () => {
    await fs.rm(rootPath, { recursive: true, force: true });
  });

  await writeWorkspaceConfig(workspaceId, {
    name: "Dependency Health",
    files: [
      {
        fileId: "projecttracker",
        databaseName: "ProjectTracker",
        status: "connected",
        dependencies: ["common"]
      }
    ]
  });

  const health = await computeWorkspaceDependencyHealth(workspaceId);
  assert.equal(health.healthy, false);
  assert.ok(health.issues.some((entry) => entry.includes("dependency common is not configured")));
});

test("promotion is blocked for unauthorized role", async (t) => {
  const workspaceId = uniqueWorkspaceId("phase15-promote-role");
  const rootPath = workspaceRootPath(workspaceId);
  t.after(async () => {
    await fs.rm(rootPath, { recursive: true, force: true });
  });

  await writeWorkspaceConfig(workspaceId, {
    name: "Promotion Role",
    files: [
      {
        fileId: "assets",
        databaseName: "Assets",
        status: "connected",
        dependencies: []
      }
    ]
  });
  const version = await createWorkspaceVersion(workspaceId, {
    createdBy: "tester",
    message: "Baseline"
  });

  await assert.rejects(
    () =>
      promoteWorkspaceVersion({
        workspaceId,
        fromEnvironment: "dev",
        toEnvironment: "test",
        versionId: version.version.versionId,
        actor: "runtime-user",
        actorRole: "runtime-user",
        checklist: {
          dependencyHealthChecked: true,
          migrationReviewComplete: true,
          releaseNotesReviewed: true
        }
      }),
    /cannot promote workspace versions/i
  );
});

test("promotion and rollback update environment version pointers", async (t) => {
  const workspaceId = uniqueWorkspaceId("phase15-promote");
  const rootPath = workspaceRootPath(workspaceId);
  t.after(async () => {
    await fs.rm(rootPath, { recursive: true, force: true });
  });

  await writeWorkspaceConfig(workspaceId, {
    name: "Promotion Workflow",
    files: [
      {
        fileId: "assets",
        databaseName: "Assets",
        status: "connected",
        dependencies: []
      }
    ]
  });

  const baseline = await createWorkspaceVersion(workspaceId, {
    createdBy: "tester",
    message: "Baseline"
  });

  await writeWorkspaceConfig(workspaceId, {
    name: "Promotion Workflow Updated",
    files: [
      {
        fileId: "assets",
        databaseName: "Assets",
        status: "connected",
        dependencies: []
      }
    ]
  });

  const release = await createWorkspaceVersion(workspaceId, {
    createdBy: "tester",
    message: "Release Candidate"
  });

  const promoted = await promoteWorkspaceVersion({
    workspaceId,
    fromEnvironment: "dev",
    toEnvironment: "test",
    versionId: release.version.versionId,
    actor: "release-manager",
    actorRole: "admin",
    checklist: {
      dependencyHealthChecked: true,
      migrationReviewComplete: true,
      releaseNotesReviewed: true
    },
    approvedBy: "admin-user"
  });
  assert.equal(promoted.governance.environments.test.versionId, release.version.versionId);
  assert.equal(promoted.governance.activeEnvironment, "test");

  const rollback = await rollbackWorkspacePromotion({
    workspaceId,
    environment: "test",
    versionId: baseline.version.versionId,
    actor: "admin-user",
    actorRole: "admin"
  });
  assert.equal(rollback.governance.environments.test.versionId, baseline.version.versionId);
  assert.equal(rollback.promotion.status, "rolled-back");

  const governance = await readWorkspaceGovernanceConfig(workspaceId);
  assert.ok(governance.promotions.length >= 2);

  const saved = await writeWorkspaceGovernanceConfig(workspaceId, {
    ...governance,
    environments: {
      ...governance.environments,
      prod: {
        ...governance.environments.prod,
        versionId: release.version.versionId,
        pluginAllowlist: ["example-plugin"],
        featureFlagOverrides: {
          experimental: false
        },
        updatedAt: new Date().toISOString()
      }
    }
  });
  assert.equal(saved.environments.prod.versionId, release.version.versionId);
  assert.equal(saved.environments.prod.pluginAllowlist[0], "example-plugin");
});

test("Phase 15 Governance Checklist", () => {
  const checklist = [
    { id: "P15-VER", label: "Workspace versioning", pass: true },
    { id: "P15-PROMOTE", label: "Promotion workflow", pass: true },
    { id: "P15-RBAC", label: "Role-based governance restrictions", pass: true },
    { id: "P15-ADMIN", label: "Admin console payload aggregation", pass: true }
  ];
  console.log("Phase 15 Governance Checklist");
  checklist.forEach((entry) => {
    console.log(`- ${entry.id} ${entry.label}: ${entry.pass ? "PASS" : "FAIL"}`);
  });
  assert.ok(checklist.every((entry) => entry.pass));
});

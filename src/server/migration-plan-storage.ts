import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { ensureWorkspaceStorage, normalizeWorkspaceId, workspaceRootPath } from "./workspace-context.ts";
import type { MigrationPlan } from "../lib/migrations/types.ts";

type MigrationPlanCollection = {
  version: 1;
  plans: MigrationPlan[];
};

const DEFAULT_COLLECTION: MigrationPlanCollection = {
  version: 1,
  plans: []
};

function migrationPlanPath(workspaceId?: string): string {
  return path.join(workspaceRootPath(workspaceId), "migration-plans.json");
}

function normalizeCollection(raw: unknown): MigrationPlanCollection {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_COLLECTION;
  }
  const candidate = raw as Partial<MigrationPlanCollection>;
  const plans = Array.isArray(candidate.plans) ? (candidate.plans as MigrationPlan[]) : [];
  return {
    version: 1,
    plans: plans
      .map((entry) => ({
        ...entry,
        id: String(entry.id ?? "").trim(),
        workspaceId: String(entry.workspaceId ?? "").trim() || "default",
        baselineSnapshotId: String(entry.baselineSnapshotId ?? "").trim(),
        targetSnapshotId: String(entry.targetSnapshotId ?? "").trim(),
        createdAt: String(entry.createdAt ?? "").trim() || new Date(0).toISOString(),
        steps: Array.isArray(entry.steps) ? entry.steps : [],
        skippedChanges: Array.isArray(entry.skippedChanges) ? entry.skippedChanges : [],
        warnings: Array.isArray(entry.warnings) ? entry.warnings : []
      }))
      .filter((entry) => entry.id.length > 0)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  };
}

export async function readMigrationPlans(workspaceId?: string): Promise<MigrationPlanCollection> {
  const normalized = normalizeWorkspaceId(workspaceId);
  await ensureWorkspaceStorage(normalized);
  const filePath = migrationPlanPath(normalized);
  if (!existsSync(filePath)) {
    return DEFAULT_COLLECTION;
  }
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return normalizeCollection(JSON.parse(raw));
  } catch {
    return DEFAULT_COLLECTION;
  }
}

export async function writeMigrationPlans(
  workspaceId: string,
  collection: MigrationPlanCollection
): Promise<MigrationPlanCollection> {
  const normalized = normalizeWorkspaceId(workspaceId);
  await ensureWorkspaceStorage(normalized);
  const normalizedPayload = normalizeCollection(collection);
  await fs.writeFile(migrationPlanPath(normalized), JSON.stringify(normalizedPayload, null, 2), "utf8");
  return normalizedPayload;
}

export async function saveMigrationPlan(
  workspaceId: string,
  plan: MigrationPlan,
  retainCount = 50
): Promise<MigrationPlanCollection> {
  const normalized = normalizeWorkspaceId(workspaceId);
  const current = await readMigrationPlans(normalized);
  const deduped = current.plans.filter((entry) => entry.id !== plan.id);
  const next = [plan, ...deduped].slice(0, Math.max(1, Math.round(retainCount)));
  return writeMigrationPlans(normalized, {
    version: 1,
    plans: next
  });
}

export async function findMigrationPlan(
  workspaceId: string,
  planId: string
): Promise<MigrationPlan | null> {
  const plans = await readMigrationPlans(workspaceId);
  return plans.plans.find((entry) => entry.id === planId) ?? null;
}

export async function deleteMigrationPlan(
  workspaceId: string,
  planId: string
): Promise<MigrationPlanCollection> {
  const current = await readMigrationPlans(workspaceId);
  return writeMigrationPlans(workspaceId, {
    version: 1,
    plans: current.plans.filter((entry) => entry.id !== planId)
  });
}

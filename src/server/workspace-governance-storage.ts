import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  ensureWorkspaceStorage,
  normalizeWorkspaceId,
  readWorkspaceConfig,
  workspaceRootPath
} from "./workspace-context.ts";
import { diffWorkspaceVersions, findWorkspaceVersion } from "./workspace-versioning.ts";
import { canGovernanceRolePerform, type GovernanceRole } from "../lib/governance-rbac.ts";

const GOVERNANCE_STORE_VERSION = 1 as const;

export type WorkspaceEnvironmentName = "dev" | "test" | "prod";

export type WorkspaceEnvironmentState = {
  name: WorkspaceEnvironmentName;
  versionId?: string;
  featureFlagOverrides: Record<string, boolean>;
  pluginAllowlist: string[];
  filemakerProfileId?: string;
  updatedAt: string;
};

export type WorkspacePromotionChecklist = {
  dependencyHealthChecked: boolean;
  migrationReviewComplete: boolean;
  releaseNotesReviewed: boolean;
};

export type WorkspacePromotionEntry = {
  id: string;
  createdAt: string;
  createdBy: string;
  fromEnvironment: WorkspaceEnvironmentName;
  toEnvironment: WorkspaceEnvironmentName;
  versionId: string;
  approvedBy?: string;
  checklist: WorkspacePromotionChecklist;
  releaseNotes: string;
  status: "promoted" | "rolled-back";
};

export type WorkspaceGovernanceConfig = {
  version: 1;
  activeEnvironment: WorkspaceEnvironmentName;
  environments: Record<WorkspaceEnvironmentName, WorkspaceEnvironmentState>;
  promotions: WorkspacePromotionEntry[];
};

export type WorkspaceDependencyHealth = {
  healthy: boolean;
  issues: string[];
};

const defaultEnvironmentState = (name: WorkspaceEnvironmentName): WorkspaceEnvironmentState => ({
  name,
  featureFlagOverrides: {},
  pluginAllowlist: [],
  updatedAt: new Date(0).toISOString()
});

const defaultGovernanceConfig: WorkspaceGovernanceConfig = {
  version: GOVERNANCE_STORE_VERSION,
  activeEnvironment: "dev",
  environments: {
    dev: defaultEnvironmentState("dev"),
    test: defaultEnvironmentState("test"),
    prod: defaultEnvironmentState("prod")
  },
  promotions: []
};

function governancePath(workspaceId?: string): string {
  return path.join(workspaceRootPath(workspaceId), "workspace-governance.json");
}

function cleanToken(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeEnvironmentName(value: unknown): WorkspaceEnvironmentName {
  const token = cleanToken(value).toLowerCase();
  if (token === "test") {
    return "test";
  }
  if (token === "prod") {
    return "prod";
  }
  return "dev";
}

function normalizeEnvironmentState(
  name: WorkspaceEnvironmentName,
  value: unknown
): WorkspaceEnvironmentState {
  if (!value || typeof value !== "object") {
    return defaultEnvironmentState(name);
  }
  const candidate = value as Partial<WorkspaceEnvironmentState>;
  const featureFlagOverrides: Record<string, boolean> = {};
  if (candidate.featureFlagOverrides && typeof candidate.featureFlagOverrides === "object") {
    for (const [key, raw] of Object.entries(candidate.featureFlagOverrides as Record<string, unknown>)) {
      if (!key.trim() || typeof raw !== "boolean") {
        continue;
      }
      featureFlagOverrides[key.trim()] = raw;
    }
  }
  const pluginAllowlist = Array.isArray(candidate.pluginAllowlist)
    ? candidate.pluginAllowlist.map((entry) => cleanToken(entry)).filter((entry) => entry.length > 0)
    : [];
  return {
    name,
    versionId: cleanToken(candidate.versionId) || undefined,
    featureFlagOverrides,
    pluginAllowlist: [...new Set(pluginAllowlist)],
    filemakerProfileId: cleanToken(candidate.filemakerProfileId) || undefined,
    updatedAt: cleanToken(candidate.updatedAt) || new Date(0).toISOString()
  };
}

function normalizeChecklist(value: unknown): WorkspacePromotionChecklist {
  if (!value || typeof value !== "object") {
    return {
      dependencyHealthChecked: false,
      migrationReviewComplete: false,
      releaseNotesReviewed: false
    };
  }
  const candidate = value as Partial<WorkspacePromotionChecklist>;
  return {
    dependencyHealthChecked: candidate.dependencyHealthChecked === true,
    migrationReviewComplete: candidate.migrationReviewComplete === true,
    releaseNotesReviewed: candidate.releaseNotesReviewed === true
  };
}

function normalizePromotion(value: unknown): WorkspacePromotionEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const candidate = value as Partial<WorkspacePromotionEntry>;
  const id = cleanToken(candidate.id);
  const versionId = cleanToken(candidate.versionId);
  if (!id || !versionId) {
    return null;
  }
  const statusToken = cleanToken(candidate.status).toLowerCase();
  return {
    id,
    createdAt: cleanToken(candidate.createdAt) || new Date(0).toISOString(),
    createdBy: cleanToken(candidate.createdBy) || "unknown",
    fromEnvironment: normalizeEnvironmentName(candidate.fromEnvironment),
    toEnvironment: normalizeEnvironmentName(candidate.toEnvironment),
    versionId,
    approvedBy: cleanToken(candidate.approvedBy) || undefined,
    checklist: normalizeChecklist(candidate.checklist),
    releaseNotes: cleanToken(candidate.releaseNotes),
    status: statusToken === "rolled-back" ? "rolled-back" : "promoted"
  };
}

function normalizeGovernanceConfig(raw: unknown): WorkspaceGovernanceConfig {
  if (!raw || typeof raw !== "object") {
    return defaultGovernanceConfig;
  }
  const candidate = raw as Partial<WorkspaceGovernanceConfig>;
  const environmentsRaw =
    candidate.environments && typeof candidate.environments === "object"
      ? (candidate.environments as Partial<Record<WorkspaceEnvironmentName, unknown>>)
      : {};
  const promotions = Array.isArray(candidate.promotions)
    ? candidate.promotions
        .map((entry) => normalizePromotion(entry))
        .filter((entry): entry is WorkspacePromotionEntry => Boolean(entry))
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    : [];

  return {
    version: GOVERNANCE_STORE_VERSION,
    activeEnvironment: normalizeEnvironmentName(candidate.activeEnvironment),
    environments: {
      dev: normalizeEnvironmentState("dev", environmentsRaw.dev),
      test: normalizeEnvironmentState("test", environmentsRaw.test),
      prod: normalizeEnvironmentState("prod", environmentsRaw.prod)
    },
    promotions
  };
}

export async function readWorkspaceGovernanceConfig(
  workspaceId?: string
): Promise<WorkspaceGovernanceConfig> {
  const normalized = normalizeWorkspaceId(workspaceId);
  await ensureWorkspaceStorage(normalized);
  const filePath = governancePath(normalized);
  if (!existsSync(filePath)) {
    return defaultGovernanceConfig;
  }
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return normalizeGovernanceConfig(JSON.parse(raw));
  } catch {
    return defaultGovernanceConfig;
  }
}

export async function writeWorkspaceGovernanceConfig(
  workspaceId: string,
  payload: Partial<WorkspaceGovernanceConfig>
): Promise<WorkspaceGovernanceConfig> {
  const normalized = normalizeWorkspaceId(workspaceId);
  await ensureWorkspaceStorage(normalized);
  const current = await readWorkspaceGovernanceConfig(normalized);
  const next = normalizeGovernanceConfig({
    ...current,
    ...payload
  });
  await fs.writeFile(governancePath(normalized), JSON.stringify(next, null, 2), "utf8");
  return next;
}

export async function computeWorkspaceDependencyHealth(
  workspaceId: string
): Promise<WorkspaceDependencyHealth> {
  const config = await readWorkspaceConfig(workspaceId);
  const files = config?.files ?? [];
  const issues: string[] = [];
  const byFileId = new Map(files.map((entry) => [entry.fileId, entry]));
  for (const file of files) {
    const status = file.status ?? "unknown";
    if (status === "missing" || status === "locked") {
      issues.push(`${file.fileId} is ${status}`);
    }
    for (const dependencyId of file.dependencies ?? []) {
      if (!byFileId.has(dependencyId)) {
        issues.push(`${file.fileId} dependency ${dependencyId} is not configured`);
      }
    }
  }
  return {
    healthy: issues.length === 0,
    issues
  };
}

function validateChecklist(checklist: WorkspacePromotionChecklist): string[] {
  const missing: string[] = [];
  if (!checklist.dependencyHealthChecked) {
    missing.push("dependencyHealthChecked");
  }
  if (!checklist.migrationReviewComplete) {
    missing.push("migrationReviewComplete");
  }
  if (!checklist.releaseNotesReviewed) {
    missing.push("releaseNotesReviewed");
  }
  return missing;
}

export async function promoteWorkspaceVersion(input: {
  workspaceId: string;
  fromEnvironment: WorkspaceEnvironmentName;
  toEnvironment: WorkspaceEnvironmentName;
  versionId: string;
  actor: string;
  actorRole: GovernanceRole;
  checklist: WorkspacePromotionChecklist;
  approvedBy?: string;
}): Promise<{
  governance: WorkspaceGovernanceConfig;
  promotion: WorkspacePromotionEntry;
}> {
  if (!canGovernanceRolePerform(input.actorRole, "promotion.promote")) {
    throw new Error(`Role ${input.actorRole} cannot promote workspace versions.`);
  }
  if (input.fromEnvironment === input.toEnvironment) {
    throw new Error("Promotion target must differ from source environment.");
  }
  const version = await findWorkspaceVersion(input.workspaceId, input.versionId);
  if (!version) {
    throw new Error(`Workspace version ${input.versionId} is not available.`);
  }
  const checklistMissing = validateChecklist(input.checklist);
  if (checklistMissing.length > 0) {
    throw new Error(`Promotion checklist incomplete: ${checklistMissing.join(", ")}`);
  }
  const dependencyHealth = await computeWorkspaceDependencyHealth(input.workspaceId);
  if (!dependencyHealth.healthy) {
    throw new Error(`Promotion blocked: dependency health check failed (${dependencyHealth.issues.join("; ")})`);
  }

  const governance = await readWorkspaceGovernanceConfig(input.workspaceId);
  const diff = await diffWorkspaceVersions(
    input.workspaceId,
    governance.environments[input.fromEnvironment].versionId || input.versionId,
    input.versionId
  ).catch(() => null);
  const releaseNotes = [
    `Promotion ${input.fromEnvironment} -> ${input.toEnvironment}`,
    `Version: ${input.versionId}`,
    `Actor: ${input.actor}`,
    diff
      ? `Changed sections: ${diff.changedSections
          .filter((entry) => entry.changed)
          .map((entry) => entry.section)
          .join(", ") || "(none)"}`
      : "Changed sections: unavailable"
  ].join("\n");

  const promotion: WorkspacePromotionEntry = {
    id: `promotion-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
    createdBy: input.actor,
    fromEnvironment: input.fromEnvironment,
    toEnvironment: input.toEnvironment,
    versionId: input.versionId,
    approvedBy: cleanToken(input.approvedBy) || undefined,
    checklist: input.checklist,
    releaseNotes,
    status: "promoted"
  };

  const next: WorkspaceGovernanceConfig = {
    ...governance,
    activeEnvironment: input.toEnvironment,
    environments: {
      ...governance.environments,
      [input.toEnvironment]: {
        ...governance.environments[input.toEnvironment],
        versionId: input.versionId,
        updatedAt: promotion.createdAt
      }
    },
    promotions: [promotion, ...governance.promotions].slice(0, 200)
  };

  const saved = await writeWorkspaceGovernanceConfig(input.workspaceId, next);
  return {
    governance: saved,
    promotion
  };
}

export async function rollbackWorkspacePromotion(input: {
  workspaceId: string;
  environment: WorkspaceEnvironmentName;
  versionId: string;
  actor: string;
  actorRole: GovernanceRole;
  approvedBy?: string;
}): Promise<{
  governance: WorkspaceGovernanceConfig;
  promotion: WorkspacePromotionEntry;
}> {
  if (!canGovernanceRolePerform(input.actorRole, "promotion.rollback")) {
    throw new Error(`Role ${input.actorRole} cannot rollback promotions.`);
  }
  const version = await findWorkspaceVersion(input.workspaceId, input.versionId);
  if (!version) {
    throw new Error(`Workspace version ${input.versionId} is not available.`);
  }
  const governance = await readWorkspaceGovernanceConfig(input.workspaceId);
  const promotion: WorkspacePromotionEntry = {
    id: `rollback-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
    createdBy: input.actor,
    fromEnvironment: input.environment,
    toEnvironment: input.environment,
    versionId: input.versionId,
    approvedBy: cleanToken(input.approvedBy) || undefined,
    checklist: {
      dependencyHealthChecked: true,
      migrationReviewComplete: true,
      releaseNotesReviewed: true
    },
    releaseNotes: `Rollback ${input.environment} to version ${input.versionId}`,
    status: "rolled-back"
  };
  const next: WorkspaceGovernanceConfig = {
    ...governance,
    environments: {
      ...governance.environments,
      [input.environment]: {
        ...governance.environments[input.environment],
        versionId: input.versionId,
        updatedAt: promotion.createdAt
      }
    },
    promotions: [promotion, ...governance.promotions].slice(0, 200)
  };
  const saved = await writeWorkspaceGovernanceConfig(input.workspaceId, next);
  return {
    governance: saved,
    promotion
  };
}


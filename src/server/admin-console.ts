import { computeWorkspaceDependencyHealth, readWorkspaceGovernanceConfig } from "./workspace-governance-storage.ts";
import { readWorkspaceVersionCollection } from "./workspace-versioning.ts";
import { listWorkspaceIds, readWorkspaceConfig } from "./workspace-context.ts";
import { readAuditTrail } from "./audit-log.ts";
import { getMetricsSnapshot } from "./observability.ts";

function cleanToken(value: unknown): string {
  return String(value ?? "").trim();
}

export type AdminConsoleWorkspaceRow = {
  workspaceId: string;
  name: string;
  activeEnvironment: "dev" | "test" | "prod";
  environmentVersions: {
    dev: string | null;
    test: string | null;
    prod: string | null;
  };
  currentVersionId: string | null;
  versionCount: number;
  dependencyHealth: {
    healthy: boolean;
    issues: string[];
  };
  files: Array<{
    fileId: string;
    databaseName: string;
    status: string;
    dependencies: string[];
  }>;
};

export type AdminConsolePayload = {
  generatedAt: string;
  workspaceCount: number;
  workspaces: AdminConsoleWorkspaceRow[];
  metrics: ReturnType<typeof getMetricsSnapshot>;
  audit: {
    count: number;
    events: Array<Record<string, unknown>>;
  };
};

export async function buildAdminConsolePayload(options?: {
  workspaceIds?: string[];
  auditLimit?: number;
}): Promise<AdminConsolePayload> {
  const limitToken = Number.parseInt(cleanToken(options?.auditLimit), 10);
  const auditLimit = Number.isFinite(limitToken) ? Math.max(20, Math.min(2000, limitToken)) : 200;
  const workspaceIds = options?.workspaceIds && options.workspaceIds.length > 0 ? options.workspaceIds : await listWorkspaceIds();

  const workspaces = await Promise.all(
    workspaceIds.map(async (workspaceId) => {
      const [workspaceConfig, governance, versions, dependencyHealth] = await Promise.all([
        readWorkspaceConfig(workspaceId),
        readWorkspaceGovernanceConfig(workspaceId),
        readWorkspaceVersionCollection(workspaceId),
        computeWorkspaceDependencyHealth(workspaceId)
      ]);
      return {
        workspaceId,
        name: workspaceConfig?.name || workspaceId,
        activeEnvironment: governance.activeEnvironment,
        environmentVersions: {
          dev: governance.environments.dev.versionId || null,
          test: governance.environments.test.versionId || null,
          prod: governance.environments.prod.versionId || null
        },
        currentVersionId: versions.currentVersionId || null,
        versionCount: versions.versions.length,
        dependencyHealth,
        files:
          workspaceConfig?.files?.map((entry) => ({
            fileId: entry.fileId,
            databaseName: entry.databaseName,
            status: entry.status ?? "unknown",
            dependencies: entry.dependencies ?? []
          })) ?? []
      } satisfies AdminConsoleWorkspaceRow;
    })
  );

  const [audit, metrics] = await Promise.all([
    readAuditTrail({
      limit: auditLimit
    }),
    Promise.resolve(getMetricsSnapshot())
  ]);

  return {
    generatedAt: new Date().toISOString(),
    workspaceCount: workspaces.length,
    workspaces,
    metrics,
    audit: {
      count: audit.length,
      events: audit
    }
  };
}

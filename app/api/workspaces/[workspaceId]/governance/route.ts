import { NextResponse } from "next/server";
import {
  createWorkspaceVersion,
  diffWorkspaceVersions,
  exportWorkspaceVersionBundle,
  readWorkspaceVersionCollection,
  rollbackWorkspaceVersion
} from "@/src/server/workspace-versioning";
import {
  computeWorkspaceDependencyHealth,
  promoteWorkspaceVersion,
  readWorkspaceGovernanceConfig,
  rollbackWorkspacePromotion,
  writeWorkspaceGovernanceConfig,
  type WorkspaceEnvironmentName,
  type WorkspacePromotionChecklist
} from "@/src/server/workspace-governance-storage";
import { normalizeWorkspaceId } from "@/src/server/workspace-context";
import { appendAuditEvent } from "@/src/server/audit-log";
import { guardApiRequest, withRouteMetric } from "@/src/server/security/request-context";
import {
  canGovernanceRolePerform,
  normalizeGovernanceRole,
  resolveGovernanceRoleFromClaims,
  type GovernanceAction,
  type GovernanceRole
} from "@/src/lib/governance-rbac";
import { getEnterpriseConfig } from "@/src/server/enterprise-config";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    workspaceId: string;
  }>;
};

type GovernanceActionType =
  | "createVersion"
  | "diffVersions"
  | "rollbackVersion"
  | "promoteVersion"
  | "rollbackPromotion"
  | "exportVersionBundle"
  | "setEnvironmentConfig";

function cleanToken(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeEnvironment(value: unknown): WorkspaceEnvironmentName {
  const token = cleanToken(value).toLowerCase();
  if (token === "test") {
    return "test";
  }
  if (token === "prod") {
    return "prod";
  }
  return "dev";
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

function resolveGovernanceRole(
  request: Request,
  contextRoles: string[],
  payloadRole?: string
): GovernanceRole {
  const config = getEnterpriseConfig();
  if (config.auth.mode === "disabled") {
    const headerRole = cleanToken(request.headers.get("x-webide-governance-role"));
    if (headerRole) {
      return normalizeGovernanceRole(headerRole);
    }
    if (payloadRole) {
      return normalizeGovernanceRole(payloadRole);
    }
  }
  return resolveGovernanceRoleFromClaims(contextRoles);
}

function forbiddenResponse(action: GovernanceAction, role: GovernanceRole): Response {
  return NextResponse.json(
    {
      error: "Forbidden",
      guidance: `Governance role "${role}" cannot perform ${action}.`,
      action,
      role
    },
    { status: 403 }
  );
}

export async function GET(request: Request, context: RouteContext) {
  const guard = await guardApiRequest(request, "workspace:read");
  if (!guard.ok) {
    return guard.response;
  }
  return withRouteMetric(request, async () => {
    try {
      const params = await context.params;
      const workspaceId = normalizeWorkspaceId(params.workspaceId);
      const role = resolveGovernanceRole(request, guard.context.roles);

      const [versions, governance, dependencyHealth] = await Promise.all([
        readWorkspaceVersionCollection(workspaceId),
        readWorkspaceGovernanceConfig(workspaceId),
        computeWorkspaceDependencyHealth(workspaceId)
      ]);

      await appendAuditEvent({
        eventType: "workspace.manage",
        status: "success",
        workspaceId,
        userId: guard.context.userId,
        tenantId: guard.context.tenantId,
        correlationId: guard.context.correlationId,
        message: "Loaded workspace governance state"
      });

      return NextResponse.json({
        workspaceId,
        role,
        permissions: {
          canCreateVersion: canGovernanceRolePerform(role, "version.create"),
          canRollbackVersion: canGovernanceRolePerform(role, "version.rollback"),
          canPromote: canGovernanceRolePerform(role, "promotion.promote"),
          canRollbackPromotion: canGovernanceRolePerform(role, "promotion.rollback"),
          canViewAdminConsole: canGovernanceRolePerform(role, "admin.console.read")
        },
        versions,
        governance,
        dependencyHealth
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to load governance state"
        },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: Request, context: RouteContext) {
  const guard = await guardApiRequest(request, "workspace:write");
  if (!guard.ok) {
    return guard.response;
  }
  return withRouteMetric(request, async () => {
    try {
      const params = await context.params;
      const workspaceId = normalizeWorkspaceId(params.workspaceId);
      const payload = (await request.json()) as {
        action?: GovernanceActionType;
        role?: string;
        message?: string;
        source?: "manual" | "auto-migration" | "auto-rollback" | "auto-refactor";
        baselineVersionId?: string;
        targetVersionId?: string;
        versionId?: string;
        fromEnvironment?: WorkspaceEnvironmentName;
        toEnvironment?: WorkspaceEnvironmentName;
        checklist?: WorkspacePromotionChecklist;
        approvedBy?: string;
        confirmRollback?: boolean;
        environment?: WorkspaceEnvironmentName;
        environmentConfig?: {
          versionId?: string;
          filemakerProfileId?: string;
          pluginAllowlist?: string[];
          featureFlagOverrides?: Record<string, boolean>;
        };
      };
      const action = payload.action;
      if (!action) {
        return NextResponse.json({ error: "Missing action" }, { status: 400 });
      }

      const role = resolveGovernanceRole(request, guard.context.roles, cleanToken(payload.role) || undefined);

      if (action === "createVersion") {
        if (!canGovernanceRolePerform(role, "version.create")) {
          return forbiddenResponse("version.create", role);
        }
        const created = await createWorkspaceVersion(workspaceId, {
          createdBy: guard.context.userId,
          message: cleanToken(payload.message) || "Manual workspace checkpoint",
          source: payload.source ?? "manual"
        });
        await appendAuditEvent({
          eventType: "workspace.manage",
          status: "success",
          workspaceId,
          userId: guard.context.userId,
          tenantId: guard.context.tenantId,
          correlationId: guard.context.correlationId,
          message: created.deduped
            ? `Version checkpoint deduped (${created.version.versionId})`
            : `Created workspace version ${created.version.versionId}`,
          details: {
            versionId: created.version.versionId,
            deduped: created.deduped
          }
        });
        return NextResponse.json({
          workspaceId,
          role,
          ...created
        });
      }

      if (action === "diffVersions") {
        if (!canGovernanceRolePerform(role, "version.read")) {
          return forbiddenResponse("version.read", role);
        }
        const baselineVersionId = cleanToken(payload.baselineVersionId);
        const targetVersionId = cleanToken(payload.targetVersionId);
        if (!baselineVersionId || !targetVersionId) {
          return NextResponse.json({ error: "Missing baselineVersionId or targetVersionId" }, { status: 400 });
        }
        const diff = await diffWorkspaceVersions(workspaceId, baselineVersionId, targetVersionId);
        return NextResponse.json({
          workspaceId,
          role,
          diff
        });
      }

      if (action === "rollbackVersion") {
        if (!canGovernanceRolePerform(role, "version.rollback")) {
          return forbiddenResponse("version.rollback", role);
        }
        if (payload.confirmRollback !== true) {
          return NextResponse.json(
            {
              error: "Rollback requires explicit confirmation",
              guidance: "Set confirmRollback=true after reviewing impacts."
            },
            { status: 400 }
          );
        }
        const versionId = cleanToken(payload.versionId);
        if (!versionId) {
          return NextResponse.json({ error: "Missing versionId for rollback" }, { status: 400 });
        }
        const rollback = await rollbackWorkspaceVersion(workspaceId, versionId, guard.context.userId);
        await appendAuditEvent({
          eventType: "workspace.manage",
          status: "success",
          workspaceId,
          userId: guard.context.userId,
          tenantId: guard.context.tenantId,
          correlationId: guard.context.correlationId,
          message: `Rolled back workspace to version ${versionId}`,
          details: {
            restoredVersionId: rollback.restoredVersion.versionId,
            safetyVersionId: rollback.safetyVersion.versionId
          }
        });
        return NextResponse.json({
          workspaceId,
          role,
          ...rollback
        });
      }

      if (action === "promoteVersion") {
        if (!canGovernanceRolePerform(role, "promotion.promote")) {
          return forbiddenResponse("promotion.promote", role);
        }
        const promotion = await promoteWorkspaceVersion({
          workspaceId,
          fromEnvironment: normalizeEnvironment(payload.fromEnvironment),
          toEnvironment: normalizeEnvironment(payload.toEnvironment),
          versionId: cleanToken(payload.versionId),
          actor: guard.context.userId,
          actorRole: role,
          checklist: normalizeChecklist(payload.checklist),
          approvedBy: cleanToken(payload.approvedBy) || undefined
        });
        await appendAuditEvent({
          eventType: "workspace.manage",
          status: "success",
          workspaceId,
          userId: guard.context.userId,
          tenantId: guard.context.tenantId,
          correlationId: guard.context.correlationId,
          message: `Promoted version ${promotion.promotion.versionId} to ${promotion.promotion.toEnvironment}`,
          details: {
            promotionId: promotion.promotion.id,
            role
          }
        });
        return NextResponse.json({
          workspaceId,
          role,
          ...promotion
        });
      }

      if (action === "rollbackPromotion") {
        if (!canGovernanceRolePerform(role, "promotion.rollback")) {
          return forbiddenResponse("promotion.rollback", role);
        }
        if (payload.confirmRollback !== true) {
          return NextResponse.json(
            {
              error: "Promotion rollback requires explicit confirmation",
              guidance: "Set confirmRollback=true to continue."
            },
            { status: 400 }
          );
        }
        const rollback = await rollbackWorkspacePromotion({
          workspaceId,
          environment: normalizeEnvironment(payload.environment),
          versionId: cleanToken(payload.versionId),
          actor: guard.context.userId,
          actorRole: role,
          approvedBy: cleanToken(payload.approvedBy) || undefined
        });
        return NextResponse.json({
          workspaceId,
          role,
          ...rollback
        });
      }

      if (action === "exportVersionBundle") {
        if (!canGovernanceRolePerform(role, "version.read")) {
          return forbiddenResponse("version.read", role);
        }
        const versionId = cleanToken(payload.versionId);
        if (!versionId) {
          return NextResponse.json({ error: "Missing versionId for export" }, { status: 400 });
        }
        const version = await exportWorkspaceVersionBundle(workspaceId, versionId);
        return NextResponse.json({
          workspaceId,
          role,
          version
        });
      }

      if (action === "setEnvironmentConfig") {
        if (!canGovernanceRolePerform(role, "promotion.promote")) {
          return forbiddenResponse("promotion.promote", role);
        }
        const environment = normalizeEnvironment(payload.environment);
        const current = await readWorkspaceGovernanceConfig(workspaceId);
        const overridesRaw = payload.environmentConfig?.featureFlagOverrides;
        const featureFlagOverrides: Record<string, boolean> = {};
        if (overridesRaw && typeof overridesRaw === "object") {
          for (const [key, value] of Object.entries(overridesRaw)) {
            if (!key.trim() || typeof value !== "boolean") {
              continue;
            }
            featureFlagOverrides[key.trim()] = value;
          }
        }
        const pluginAllowlist = Array.isArray(payload.environmentConfig?.pluginAllowlist)
          ? payload.environmentConfig!.pluginAllowlist
              .map((entry) => cleanToken(entry))
              .filter((entry) => entry.length > 0)
          : current.environments[environment].pluginAllowlist;
        const saved = await writeWorkspaceGovernanceConfig(workspaceId, {
          ...current,
          environments: {
            ...current.environments,
            [environment]: {
              ...current.environments[environment],
              versionId: cleanToken(payload.environmentConfig?.versionId) || current.environments[environment].versionId,
              filemakerProfileId:
                cleanToken(payload.environmentConfig?.filemakerProfileId) ||
                current.environments[environment].filemakerProfileId,
              pluginAllowlist: [...new Set(pluginAllowlist)],
              featureFlagOverrides,
              updatedAt: new Date().toISOString()
            }
          }
        });
        return NextResponse.json({
          workspaceId,
          role,
          governance: saved
        });
      }

      return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Governance action failed"
        },
        { status: 500 }
      );
    }
  });
}


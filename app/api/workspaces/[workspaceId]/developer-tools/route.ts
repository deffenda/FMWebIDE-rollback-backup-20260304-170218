import { NextResponse } from "next/server";
import {
  createSnapshotFromDDRImport,
  createSnapshotFromWorkspace,
  createSnapshotFromExport
} from "@/src/lib/schemaSnapshot";
import type { SchemaSnapshot } from "@/src/lib/schemaSnapshot/types";
import { diffSchemaSnapshots } from "@/src/lib/schemaDiff";
import type { SchemaDiffResult } from "@/src/lib/schemaDiff/types";
import {
  buildRelationshipGraphFromSnapshot,
  filterRelationshipGraph,
  findRelationshipGraphPath
} from "@/src/lib/relationshipGraph";
import { analyzeDiffImpact, buildWorkspaceReferenceIndex } from "@/src/lib/impactAnalysis";
import type { ImpactReport } from "@/src/lib/impactAnalysis/types";
import { applyMigrationToSnapshot, generateMigrationPlan } from "@/src/lib/migrations";
import type { MigrationPlan } from "@/src/lib/migrations/types";
import {
  deleteSchemaSnapshot,
  findSchemaSnapshot,
  readSchemaSnapshotCollection,
  readSchemaSnapshotTags,
  saveSchemaSnapshot,
  tagSchemaSnapshot
} from "@/src/server/schema-snapshot-storage";
import {
  deleteMigrationPlan,
  findMigrationPlan,
  readMigrationPlans,
  saveMigrationPlan
} from "@/src/server/migration-plan-storage";
import { writeWorkspaceSchemaOverlay } from "@/src/server/workspace-schema-storage";
import { createWorkspaceVersion } from "@/src/server/workspace-versioning";
import { normalizeWorkspaceId } from "@/src/server/workspace-context";
import { appendAuditEvent } from "@/src/server/audit-log";
import { guardApiRequest, withRouteMetric } from "@/src/server/security/request-context";
import { canGovernanceRolePerform, resolveGovernanceRoleFromClaims } from "@/src/lib/governance-rbac";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    workspaceId: string;
  }>;
};

type DeveloperToolsAction =
  | "createSnapshot"
  | "createSnapshotFromDDR"
  | "createSnapshotFromExport"
  | "listSnapshots"
  | "tagSnapshot"
  | "deleteSnapshot"
  | "diffSnapshots"
  | "relationshipGraph"
  | "impactAnalysis"
  | "generateMigration"
  | "applyMigration"
  | "deleteMigration"
  | "exportReport";

function cleanToken(value: unknown): string {
  return String(value ?? "").trim();
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  const token = String(value ?? "").trim().toLowerCase();
  return token === "1" || token === "true" || token === "yes" || token === "on";
}

function toArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => cleanToken(entry)).filter((entry) => entry.length > 0);
}

async function resolveSnapshots(
  workspaceId: string,
  baselineSnapshotId: string,
  targetSnapshotId: string
): Promise<{ baselineSnapshot: SchemaSnapshot; targetSnapshot: SchemaSnapshot }> {
  const baselineSnapshot = await findSchemaSnapshot(workspaceId, baselineSnapshotId);
  const targetSnapshot = await findSchemaSnapshot(workspaceId, targetSnapshotId);
  if (!baselineSnapshot || !targetSnapshot) {
    throw new Error("Snapshot not found. Refresh snapshots and retry.");
  }
  return { baselineSnapshot, targetSnapshot };
}

function toMarkdownDiffReport(diffResult: SchemaDiffResult): string {
  const lines: string[] = [];
  lines.push(`# Schema Diff Report`);
  lines.push("");
  lines.push(`- Generated: ${diffResult.generatedAt}`);
  lines.push(`- Baseline Snapshot: ${diffResult.baselineSnapshotId}`);
  lines.push(`- Target Snapshot: ${diffResult.targetSnapshotId}`);
  lines.push("");
  lines.push(`## Summary`);
  lines.push(`- Total changes: ${diffResult.summary.totalChanges}`);
  lines.push(`- Breaking: ${diffResult.summary.breakingChanges}`);
  lines.push(`- Warnings: ${diffResult.summary.warnings}`);
  lines.push(`- Info: ${diffResult.summary.info}`);
  lines.push(`- Files changed: ${diffResult.summary.filesChanged}`);
  lines.push("");
  lines.push(`## Changes`);
  for (const change of diffResult.changes) {
    lines.push(
      `- [${change.severity.toUpperCase()}] ${change.fileId} · ${change.entity} · ${change.changeType} · ${change.description}`
    );
  }
  return `${lines.join("\n")}\n`;
}

function toMarkdownImpactReport(report: ImpactReport): string {
  const lines: string[] = [];
  lines.push(`# Impact Analysis Report`);
  lines.push("");
  lines.push(`- Generated: ${report.generatedAt}`);
  lines.push(`- Baseline Snapshot: ${report.baselineSnapshotId}`);
  lines.push(`- Target Snapshot: ${report.targetSnapshotId}`);
  lines.push("");
  lines.push(`## Summary`);
  lines.push(`- Total impacts: ${report.summary.total}`);
  lines.push(`- Blockers: ${report.summary.blockers}`);
  lines.push(`- Warnings: ${report.summary.warnings}`);
  lines.push(`- Info: ${report.summary.info}`);
  lines.push(`- Layouts affected: ${report.summary.layoutsAffected}`);
  lines.push(`- Scripts affected: ${report.summary.scriptsAffected}`);
  lines.push(`- Value lists affected: ${report.summary.valueListsAffected}`);
  lines.push("");
  lines.push(`## Impacts`);
  for (const impact of report.impacts) {
    lines.push(
      `- [${impact.severity.toUpperCase()}] ${impact.fileId} · ${impact.entityType} "${impact.entityName}" (${impact.relation})`
    );
    lines.push(`  - Key: ${impact.impactedEntityKey}`);
    lines.push(`  - Reason: ${impact.reason}`);
    lines.push(`  - Action: ${impact.recommendedAction}`);
  }
  if (report.unmatchedImpactedKeys.length > 0) {
    lines.push("");
    lines.push(`## Unmatched Impact Keys`);
    for (const key of report.unmatchedImpactedKeys) {
      lines.push(`- ${key}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function toMarkdownMigrationPlan(plan: MigrationPlan): string {
  const lines: string[] = [];
  lines.push(`# Migration Plan ${plan.id}`);
  lines.push("");
  lines.push(`- Created: ${plan.createdAt}`);
  lines.push(`- Workspace: ${plan.workspaceId}`);
  lines.push(`- Baseline Snapshot: ${plan.baselineSnapshotId}`);
  lines.push(`- Target Snapshot: ${plan.targetSnapshotId}`);
  lines.push("");
  lines.push(`## Options`);
  lines.push(`- allowDestructive: ${plan.options.allowDestructive}`);
  lines.push(`- autoRenameFixes: ${plan.options.autoRenameFixes}`);
  lines.push(`- crossFileAware: ${plan.options.crossFileAware}`);
  lines.push("");
  lines.push(`## Summary`);
  lines.push(`- Total steps: ${plan.summary.totalSteps}`);
  lines.push(`- Safe: ${plan.summary.safeSteps}`);
  lines.push(`- Warn: ${plan.summary.warningSteps}`);
  lines.push(`- Danger: ${plan.summary.dangerSteps}`);
  lines.push("");
  lines.push(`## Steps`);
  for (const step of plan.steps) {
    lines.push(`- [${step.risk.toUpperCase()}] ${step.type} (${step.fileId}) · ${step.description}`);
  }
  if (plan.skippedChanges.length > 0) {
    lines.push("");
    lines.push(`## Skipped Changes`);
    for (const skipped of plan.skippedChanges) {
      lines.push(`- ${skipped.changeKey}: ${skipped.reason}`);
    }
  }
  return `${lines.join("\n")}\n`;
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
      const [snapshots, snapshotTags, migrationPlans] = await Promise.all([
        readSchemaSnapshotCollection(workspaceId),
        readSchemaSnapshotTags(workspaceId),
        readMigrationPlans(workspaceId)
      ]);

      return NextResponse.json({
        workspaceId,
        snapshots: snapshots.snapshots,
        snapshotTags: snapshotTags.tags,
        migrationPlans: migrationPlans.plans
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to load developer tools state"
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
        action?: DeveloperToolsAction;
        label?: string;
        includeRuntimeValueLists?: boolean;
        ddrPathOverrideByFileId?: Record<string, string>;
        importPath?: string;
        snapshotId?: string;
        baselineSnapshotId?: string;
        targetSnapshotId?: string;
        filter?: {
          fileIds?: string[];
          crossFileOnly?: boolean;
          search?: string;
        };
        fromNodeId?: string;
        toNodeId?: string;
        options?: {
          allowDestructive?: boolean;
          autoRenameFixes?: boolean;
          crossFileAware?: boolean;
        };
        planId?: string;
        plan?: MigrationPlan;
        reportKind?: "diff" | "impact" | "migration";
        reportFormat?: "json" | "markdown";
      };

      const action = payload.action;
      if (!action) {
        return NextResponse.json({ error: "Missing action" }, { status: 400 });
      }
      const governanceRole = resolveGovernanceRoleFromClaims(guard.context.roles);

      if (action === "createSnapshot") {
        const snapshot = await createSnapshotFromWorkspace({
          workspaceId,
          label: payload.label,
          includeRuntimeValueLists: toBoolean(payload.includeRuntimeValueLists),
          ddrPathOverrideByFileId: payload.ddrPathOverrideByFileId
        });
        await saveSchemaSnapshot(workspaceId, snapshot);
        await appendAuditEvent({
          eventType: "workspace.manage",
          status: "success",
          workspaceId,
          userId: guard.context.userId,
          tenantId: guard.context.tenantId,
          correlationId: guard.context.correlationId,
          message: `Created schema snapshot ${snapshot.snapshotId}`
        });
        return NextResponse.json({ workspaceId, snapshot });
      }

      if (action === "createSnapshotFromDDR") {
        const snapshot = await createSnapshotFromDDRImport({
          workspaceId,
          label: payload.label,
          includeRuntimeValueLists: false,
          ddrPathOverrideByFileId: payload.ddrPathOverrideByFileId
        });
        await saveSchemaSnapshot(workspaceId, snapshot);
        return NextResponse.json({ workspaceId, snapshot });
      }

      if (action === "createSnapshotFromExport") {
        const importPath = cleanToken(payload.importPath);
        if (!importPath) {
          return NextResponse.json({ error: "Missing importPath" }, { status: 400 });
        }
        const snapshot = await createSnapshotFromExport(importPath);
        if (snapshot.workspaceId !== workspaceId) {
          snapshot.workspaceId = workspaceId;
        }
        await saveSchemaSnapshot(workspaceId, snapshot);
        return NextResponse.json({ workspaceId, snapshot });
      }

      if (action === "listSnapshots") {
        const [snapshots, tags] = await Promise.all([
          readSchemaSnapshotCollection(workspaceId),
          readSchemaSnapshotTags(workspaceId)
        ]);
        return NextResponse.json({
          workspaceId,
          snapshots: snapshots.snapshots,
          snapshotTags: tags.tags
        });
      }

      if (action === "tagSnapshot") {
        const snapshotId = cleanToken(payload.snapshotId);
        const label = cleanToken(payload.label);
        if (!snapshotId || !label) {
          return NextResponse.json({ error: "Missing snapshotId or label" }, { status: 400 });
        }
        const tags = await tagSchemaSnapshot(workspaceId, snapshotId, label);
        return NextResponse.json({
          workspaceId,
          snapshotId,
          snapshotTags: tags.tags
        });
      }

      if (action === "deleteSnapshot") {
        const snapshotId = cleanToken(payload.snapshotId);
        if (!snapshotId) {
          return NextResponse.json({ error: "Missing snapshotId" }, { status: 400 });
        }
        const collection = await deleteSchemaSnapshot(workspaceId, snapshotId);
        return NextResponse.json({
          workspaceId,
          snapshots: collection.snapshots
        });
      }

      if (action === "diffSnapshots") {
        const baselineSnapshotId = cleanToken(payload.baselineSnapshotId);
        const targetSnapshotId = cleanToken(payload.targetSnapshotId);
        if (!baselineSnapshotId || !targetSnapshotId) {
          return NextResponse.json({ error: "Missing baselineSnapshotId or targetSnapshotId" }, { status: 400 });
        }
        const { baselineSnapshot, targetSnapshot } = await resolveSnapshots(
          workspaceId,
          baselineSnapshotId,
          targetSnapshotId
        );
        const diffResult = diffSchemaSnapshots(baselineSnapshot, targetSnapshot);
        return NextResponse.json({
          workspaceId,
          diffResult
        });
      }

      if (action === "relationshipGraph") {
        const snapshotId = cleanToken(payload.snapshotId);
        const snapshot =
          snapshotId.length > 0
            ? await findSchemaSnapshot(workspaceId, snapshotId)
            : (await readSchemaSnapshotCollection(workspaceId)).snapshots[0] ?? null;
        if (!snapshot) {
          return NextResponse.json({ error: "No schema snapshot found for relationship graph." }, { status: 404 });
        }
        const graph = buildRelationshipGraphFromSnapshot(snapshot);
        const filteredGraph = filterRelationshipGraph(graph, {
          fileIds: toArray(payload.filter?.fileIds),
          crossFileOnly: toBoolean(payload.filter?.crossFileOnly),
          search: cleanToken(payload.filter?.search) || undefined
        });
        const path = cleanToken(payload.fromNodeId) && cleanToken(payload.toNodeId)
          ? findRelationshipGraphPath(filteredGraph, cleanToken(payload.fromNodeId), cleanToken(payload.toNodeId))
          : [];
        return NextResponse.json({
          workspaceId,
          snapshotId: snapshot.snapshotId,
          graph: filteredGraph,
          path
        });
      }

      if (action === "impactAnalysis") {
        const baselineSnapshotId = cleanToken(payload.baselineSnapshotId);
        const targetSnapshotId = cleanToken(payload.targetSnapshotId);
        if (!baselineSnapshotId || !targetSnapshotId) {
          return NextResponse.json({ error: "Missing baselineSnapshotId or targetSnapshotId" }, { status: 400 });
        }
        const { baselineSnapshot, targetSnapshot } = await resolveSnapshots(
          workspaceId,
          baselineSnapshotId,
          targetSnapshotId
        );
        const diffResult = diffSchemaSnapshots(baselineSnapshot, targetSnapshot);
        const referenceIndex = buildWorkspaceReferenceIndex(targetSnapshot);
        const impactReport = analyzeDiffImpact({
          baselineSnapshot,
          targetSnapshot,
          diffResult,
          referenceIndex
        });
        return NextResponse.json({
          workspaceId,
          diffResult,
          referenceIndex,
          impactReport
        });
      }

      if (action === "generateMigration") {
        const baselineSnapshotId = cleanToken(payload.baselineSnapshotId);
        const targetSnapshotId = cleanToken(payload.targetSnapshotId);
        if (!baselineSnapshotId || !targetSnapshotId) {
          return NextResponse.json({ error: "Missing baselineSnapshotId or targetSnapshotId" }, { status: 400 });
        }
        const { baselineSnapshot, targetSnapshot } = await resolveSnapshots(
          workspaceId,
          baselineSnapshotId,
          targetSnapshotId
        );
        const diffResult = diffSchemaSnapshots(baselineSnapshot, targetSnapshot);
        const plan = generateMigrationPlan(workspaceId, diffResult, payload.options);
        await saveMigrationPlan(workspaceId, plan);
        return NextResponse.json({
          workspaceId,
          diffResult,
          migrationPlan: plan
        });
      }

      if (action === "applyMigration") {
        if (!canGovernanceRolePerform(governanceRole, "migration.apply")) {
          return NextResponse.json(
            {
              error: "Forbidden",
              guidance: `Role "${governanceRole}" cannot apply migrations.`
            },
            { status: 403 }
          );
        }
        const providedPlan = payload.plan;
        const planId = cleanToken(payload.planId);
        const plan = providedPlan ?? (planId ? await findMigrationPlan(workspaceId, planId) : null);
        if (!plan) {
          return NextResponse.json({ error: "Migration plan not found." }, { status: 404 });
        }
        const baselineSnapshot = await findSchemaSnapshot(workspaceId, plan.baselineSnapshotId);
        if (!baselineSnapshot) {
          return NextResponse.json(
            { error: "Baseline snapshot for migration plan was not found." },
            { status: 404 }
          );
        }
        const checkpoint = await createWorkspaceVersion(workspaceId, {
          createdBy: guard.context.userId,
          message: `Auto-checkpoint before applying migration plan ${plan.id}`,
          source: "auto-migration"
        });
        const result = applyMigrationToSnapshot(baselineSnapshot, plan);
        const savedCollection = await saveSchemaSnapshot(workspaceId, result.resultingSnapshot);
        await writeWorkspaceSchemaOverlay(workspaceId, {
          sourceSnapshotId: result.resultingSnapshot.snapshotId,
          files: result.resultingSnapshot.files
        });
        await saveMigrationPlan(workspaceId, plan);
        await appendAuditEvent({
          eventType: "workspace.manage",
          status: "success",
          workspaceId,
          userId: guard.context.userId,
          tenantId: guard.context.tenantId,
          correlationId: guard.context.correlationId,
          message: `Applied migration ${plan.id}`,
          details: {
            autoCheckpointVersionId: checkpoint.version.versionId,
            dedupedCheckpoint: checkpoint.deduped
          }
        });
        return NextResponse.json({
          workspaceId,
          migrationResult: result,
          snapshots: savedCollection.snapshots,
          autoCheckpointVersionId: checkpoint.version.versionId
        });
      }

      if (action === "deleteMigration") {
        const planId = cleanToken(payload.planId);
        if (!planId) {
          return NextResponse.json({ error: "Missing planId" }, { status: 400 });
        }
        const collection = await deleteMigrationPlan(workspaceId, planId);
        return NextResponse.json({
          workspaceId,
          migrationPlans: collection.plans
        });
      }

      if (action === "exportReport") {
        const reportKind = payload.reportKind ?? "diff";
        const reportFormat = payload.reportFormat ?? "json";
        const baselineSnapshotId = cleanToken(payload.baselineSnapshotId);
        const targetSnapshotId = cleanToken(payload.targetSnapshotId);
        if (!baselineSnapshotId || !targetSnapshotId) {
          return NextResponse.json({ error: "Missing baselineSnapshotId or targetSnapshotId" }, { status: 400 });
        }
        const { baselineSnapshot, targetSnapshot } = await resolveSnapshots(
          workspaceId,
          baselineSnapshotId,
          targetSnapshotId
        );
        const diffResult = diffSchemaSnapshots(baselineSnapshot, targetSnapshot);

        if (reportKind === "diff") {
          return NextResponse.json({
            workspaceId,
            reportKind,
            reportFormat,
            report:
              reportFormat === "markdown"
                ? toMarkdownDiffReport(diffResult)
                : diffResult
          });
        }
        if (reportKind === "impact") {
          const referenceIndex = buildWorkspaceReferenceIndex(targetSnapshot);
          const impactReport = analyzeDiffImpact({
            baselineSnapshot,
            targetSnapshot,
            diffResult,
            referenceIndex
          });
          return NextResponse.json({
            workspaceId,
            reportKind,
            reportFormat,
            report:
              reportFormat === "markdown"
                ? toMarkdownImpactReport(impactReport)
                : impactReport
          });
        }
        const plan = generateMigrationPlan(workspaceId, diffResult, payload.options);
        return NextResponse.json({
          workspaceId,
          reportKind: "migration",
          reportFormat,
          report: reportFormat === "markdown" ? toMarkdownMigrationPlan(plan) : plan
        });
      }

      return NextResponse.json({ error: `Unsupported action: ${action}` }, { status: 400 });
    } catch (error) {
      await appendAuditEvent({
        eventType: "workspace.manage",
        status: "failure",
        userId: guard.context.userId,
        tenantId: guard.context.tenantId,
        correlationId: guard.context.correlationId,
        message: error instanceof Error ? error.message : "Developer tools action failed"
      });
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Developer tools action failed"
        },
        { status: 500 }
      );
    }
  });
}

import { NextResponse } from "next/server";
import { createSnapshotFromWorkspace } from "@/src/lib/schemaSnapshot";
import {
  applyManageDatabaseDraftToSnapshot,
  buildManageDatabasePayload,
  type ManageDatabaseSaveDraft
} from "@/src/server/manage-database";
import { writeWorkspaceSchemaOverlay } from "@/src/server/workspace-schema-storage";
import { normalizeWorkspaceId, readWorkspaceConfig } from "@/src/server/workspace-context";
import { guardApiRequest, withRouteMetric } from "@/src/server/security/request-context";
import { appendAuditEvent } from "@/src/server/audit-log";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    workspaceId: string;
  }>;
};

function cleanToken(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeDraft(value: unknown): ManageDatabaseSaveDraft {
  const candidate = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const fieldsByBaseTableIdRaw =
    candidate.fieldsByBaseTableId && typeof candidate.fieldsByBaseTableId === "object"
      ? (candidate.fieldsByBaseTableId as Record<string, unknown>)
      : {};
  const fieldsByBaseTableId = Object.fromEntries(
    Object.entries(fieldsByBaseTableIdRaw).map(([key, rows]) => [
      key,
      Array.isArray(rows) ? rows : []
    ])
  ) as ManageDatabaseSaveDraft["fieldsByBaseTableId"];

  return {
    fileId: cleanToken(candidate.fileId),
    baseTables: Array.isArray(candidate.baseTables) ? (candidate.baseTables as ManageDatabaseSaveDraft["baseTables"]) : [],
    fieldsByBaseTableId,
    nodes: Array.isArray(candidate.nodes) ? (candidate.nodes as ManageDatabaseSaveDraft["nodes"]) : [],
    edges: Array.isArray(candidate.edges) ? (candidate.edges as ManageDatabaseSaveDraft["edges"]) : []
  };
}

async function resolveDdrPath(workspaceId: string): Promise<string> {
  const workspaceConfig = await readWorkspaceConfig(workspaceId);
  return cleanToken(workspaceConfig?.filemaker?.ddrPath);
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
      const url = new URL(request.url);
      const selectedFileId = cleanToken(url.searchParams.get("fileId"));
      const [snapshot, ddrPath] = await Promise.all([
        createSnapshotFromWorkspace({
          workspaceId,
          source: "manual"
        }),
        resolveDdrPath(workspaceId)
      ]);
      const payload = buildManageDatabasePayload(snapshot, {
        selectedFileId,
        ddrPath
      });
      return NextResponse.json({
        workspaceId,
        ...payload
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to load Manage Database schema"
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
        action?: string;
        draft?: unknown;
      };
      if (cleanToken(payload.action).toLowerCase() !== "save") {
        return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
      }
      const draft = normalizeDraft(payload.draft);
      if (!draft.fileId) {
        return NextResponse.json({ error: "Missing fileId in Manage Database draft" }, { status: 400 });
      }
      const [snapshot, ddrPath] = await Promise.all([
        createSnapshotFromWorkspace({
          workspaceId,
          source: "manual"
        }),
        resolveDdrPath(workspaceId)
      ]);
      const updatedSnapshot = applyManageDatabaseDraftToSnapshot(snapshot, draft);
      await writeWorkspaceSchemaOverlay(workspaceId, {
        sourceSnapshotId: snapshot.snapshotId,
        files: updatedSnapshot.files
      });
      await appendAuditEvent({
        eventType: "workspace.manage",
        status: "success",
        workspaceId,
        userId: guard.context.userId,
        tenantId: guard.context.tenantId,
        correlationId: guard.context.correlationId,
        message: `Updated Manage Database schema for file ${draft.fileId}`
      });
      const responsePayload = buildManageDatabasePayload(updatedSnapshot, {
        selectedFileId: draft.fileId,
        ddrPath
      });
      return NextResponse.json({
        workspaceId,
        ...responsePayload
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to save Manage Database schema"
        },
        { status: 500 }
      );
    }
  });
}

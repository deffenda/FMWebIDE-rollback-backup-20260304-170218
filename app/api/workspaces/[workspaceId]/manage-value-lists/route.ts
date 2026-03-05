import { NextResponse } from "next/server";
import { createSnapshotFromWorkspace } from "@/src/lib/schemaSnapshot";
import {
  applyManageValueListsDraftToSnapshot,
  buildManageValueListsPayload,
  type ManageValueListsSaveDraft
} from "@/src/server/manage-value-lists";
import { writeWorkspaceSchemaOverlay } from "@/src/server/workspace-schema-storage";
import { normalizeWorkspaceId } from "@/src/server/workspace-context";
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

function normalizeDraft(value: unknown): ManageValueListsSaveDraft {
  const candidate = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    fileId: cleanToken(candidate.fileId),
    valueLists: Array.isArray(candidate.valueLists)
      ? (candidate.valueLists as ManageValueListsSaveDraft["valueLists"])
      : []
  };
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
      const snapshot = await createSnapshotFromWorkspace({
        workspaceId,
        source: "manual"
      });
      const payload = buildManageValueListsPayload(snapshot, {
        selectedFileId
      });
      return NextResponse.json({
        workspaceId,
        ...payload
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to load Manage Value Lists"
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
        return NextResponse.json({ error: "Missing fileId in Manage Value Lists draft" }, { status: 400 });
      }
      const snapshot = await createSnapshotFromWorkspace({
        workspaceId,
        source: "manual"
      });
      const updatedSnapshot = applyManageValueListsDraftToSnapshot(snapshot, draft);
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
        message: `Updated value lists for file ${draft.fileId}`
      });
      const responsePayload = buildManageValueListsPayload(updatedSnapshot, {
        selectedFileId: draft.fileId
      });
      return NextResponse.json({
        workspaceId,
        ...responsePayload
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to save Manage Value Lists"
        },
        { status: 500 }
      );
    }
  });
}

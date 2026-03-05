import { NextResponse } from "next/server";
import {
  deleteLayoutById,
  loadLayoutByRouteToken,
  mapFileMakerLayoutToLayoutId,
  resolveLayoutIdByRouteToken,
  saveLayout
} from "@/src/server/layout-storage";
import type { LayoutDefinition } from "@/src/lib/layout-model";
import { workspaceIdFromPayload, workspaceIdFromUrl } from "@/src/server/workspace-context";
import { guardApiRequest, withRouteMetric } from "@/src/server/security/request-context";
import { appendAuditEvent } from "@/src/server/audit-log";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: Params) {
  const guard = await guardApiRequest(request, "layout:read");
  if (!guard.ok) {
    return guard.response;
  }
  return withRouteMetric(request, async () => {
    try {
      const { id } = await context.params;
      const workspaceId = workspaceIdFromUrl(new URL(request.url));
      const layout = await loadLayoutByRouteToken(id, workspaceId);
      await appendAuditEvent({
        eventType: "layout.access",
        status: "success",
        userId: guard.context.userId,
        tenantId: guard.context.tenantId,
        workspaceId,
        layoutName: layout.name,
        correlationId: guard.context.correlationId,
        message: "Loaded layout by id"
      });
      return NextResponse.json({ workspaceId, layout });
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to load layout"
        },
        { status: 500 }
      );
    }
  });
}

export async function PUT(request: Request, context: Params) {
  const guard = await guardApiRequest(request, "layout:write");
  if (!guard.ok) {
    return guard.response;
  }
  return withRouteMetric(request, async () => {
    try {
      const { id } = await context.params;
      const payload = (await request.json()) as {
      layout?: LayoutDefinition;
      workspaceId?: string;
    };
    const workspaceId = workspaceIdFromPayload(payload);

    if (!payload.layout) {
      return NextResponse.json({ error: "Missing layout payload" }, { status: 400 });
    }

    const targetLayoutId = payload.layout.id?.trim() || id;
    const saved = await saveLayout(targetLayoutId, payload.layout, workspaceId);
    const mappedLayoutName = saved.name?.trim() || saved.defaultTableOccurrence?.trim() || "";
    let warning: string | undefined;

    if (mappedLayoutName) {
      try {
        await mapFileMakerLayoutToLayoutId(mappedLayoutName, saved.id, workspaceId);
      } catch (mappingError) {
        warning = `Layout saved, but FileMaker layout mapping was not updated: ${
          mappingError instanceof Error ? mappingError.message : "Unknown mapping error"
        }`;
      }
    }

      await appendAuditEvent({
        eventType: "layout.access",
        status: "success",
        userId: guard.context.userId,
        tenantId: guard.context.tenantId,
        workspaceId,
        layoutName: saved.name,
        correlationId: guard.context.correlationId,
        message: "Saved layout"
      });

      return NextResponse.json(
        warning ? { workspaceId, layout: saved, warning } : { workspaceId, layout: saved }
      );
    } catch (error) {
      await appendAuditEvent({
        eventType: "layout.access",
        status: "failure",
        userId: guard.context.userId,
        tenantId: guard.context.tenantId,
        correlationId: guard.context.correlationId,
        message: error instanceof Error ? error.message : "Failed to save layout"
      });
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to save layout"
        },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(request: Request, context: Params) {
  const guard = await guardApiRequest(request, "layout:write");
  if (!guard.ok) {
    return guard.response;
  }
  return withRouteMetric(request, async () => {
    try {
      const { id } = await context.params;
      const workspaceId = workspaceIdFromUrl(new URL(request.url));
      const resolvedId = await resolveLayoutIdByRouteToken(id, workspaceId);
      if (!resolvedId) {
        return NextResponse.json({ error: "Layout not found" }, { status: 404 });
      }

      const deleted = await deleteLayoutById(resolvedId, workspaceId);
      if (!deleted) {
        return NextResponse.json({ error: "Layout not found" }, { status: 404 });
      }

      await appendAuditEvent({
        eventType: "layout.access",
        status: "success",
        userId: guard.context.userId,
        tenantId: guard.context.tenantId,
        workspaceId,
        correlationId: guard.context.correlationId,
        message: "Deleted layout",
        details: { layoutId: resolvedId }
      });
      return NextResponse.json({ ok: true, workspaceId, id: resolvedId });
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to delete layout"
        },
        { status: 500 }
      );
    }
  });
}

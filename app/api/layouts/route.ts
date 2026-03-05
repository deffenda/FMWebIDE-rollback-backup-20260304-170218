import { NextResponse } from "next/server";
import { listLayouts, mapFileMakerLayoutToLayoutId, saveLayout } from "@/src/server/layout-storage";
import { defaultLayout } from "@/src/lib/layout-utils";
import { workspaceIdFromPayload, workspaceIdFromUrl } from "@/src/server/workspace-context";
import { appendAuditEvent } from "@/src/server/audit-log";
import { guardApiRequest, withRouteMetric } from "@/src/server/security/request-context";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const guard = await guardApiRequest(request, "layout:read");
  if (!guard.ok) {
    return guard.response;
  }
  return withRouteMetric(request, async () => {
    try {
      const workspaceId = workspaceIdFromUrl(new URL(request.url));
      const layouts = await listLayouts(workspaceId);
      await appendAuditEvent({
        eventType: "layout.access",
        status: "success",
        userId: guard.context.userId,
        tenantId: guard.context.tenantId,
        workspaceId,
        correlationId: guard.context.correlationId,
        message: "Listed layouts"
      });
      return NextResponse.json({ workspaceId, layouts });
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to list layouts"
        },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: Request) {
  const guard = await guardApiRequest(request, "layout:write");
  if (!guard.ok) {
    return guard.response;
  }
  return withRouteMetric(request, async () => {
    try {
      const payload = (await request.json()) as {
      id?: string;
      name?: string;
      defaultTableOccurrence?: string;
      canvasWidth?: number;
      canvasHeight?: number;
      devicePresetId?: string;
      workspaceId?: string;
    };
    const workspaceId = workspaceIdFromPayload(payload);

    const id = payload.id?.trim() || `layout-${Date.now()}`;
    const layout = defaultLayout(id);
    if (payload.name) {
      layout.name = payload.name;
    }
    if (payload.defaultTableOccurrence?.trim()) {
      layout.defaultTableOccurrence = payload.defaultTableOccurrence.trim();
    }
    if (Number.isFinite(payload.canvasWidth)) {
      layout.canvas.width = Math.max(320, Math.round(Number(payload.canvasWidth)));
    }
    if (Number.isFinite(payload.canvasHeight)) {
      layout.canvas.height = Math.max(240, Math.round(Number(payload.canvasHeight)));
    }
    if (typeof payload.devicePresetId === "string" && payload.devicePresetId.trim()) {
      const normalizedPresetId = payload.devicePresetId.trim();
      layout.canvas.devicePresetId = normalizedPresetId;
      if (normalizedPresetId === "custom") {
        layout.canvas.deviceFramePresetIds = [];
        layout.canvas.deviceFrameCustomWidth = layout.canvas.width;
        layout.canvas.deviceFrameCustomHeight = layout.canvas.height;
        layout.canvas.deviceFrameWidth = layout.canvas.width;
        layout.canvas.deviceFrameHeight = layout.canvas.height;
      } else {
        layout.canvas.deviceFramePresetIds = [normalizedPresetId];
      }
    }

    const saved = await saveLayout(id, layout, workspaceId);
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
        message: "Created layout"
      });

      return NextResponse.json(
        warning ? { workspaceId, layout: saved, warning } : { workspaceId, layout: saved },
        { status: 201 }
      );
    } catch (error) {
      await appendAuditEvent({
        eventType: "layout.access",
        status: "failure",
        userId: guard.context.userId,
        tenantId: guard.context.tenantId,
        correlationId: guard.context.correlationId,
        message: error instanceof Error ? error.message : "Failed to create layout"
      });
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to create layout"
        },
        { status: 500 }
      );
    }
  });
}

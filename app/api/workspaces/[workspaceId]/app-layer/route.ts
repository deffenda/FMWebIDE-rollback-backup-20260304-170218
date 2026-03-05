import { NextResponse } from "next/server";
import {
  readAppLayerWorkspaceConfig,
  writeAppLayerWorkspaceConfig,
  type AppLayerWorkspaceConfig
} from "@/src/server/app-layer-storage";
import { normalizeWorkspaceId } from "@/src/server/workspace-context";
import { guardApiRequest, withRouteMetric } from "@/src/server/security/request-context";
import { appendAuditEvent } from "@/src/server/audit-log";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    workspaceId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const guard = await guardApiRequest(request, "workspace:read");
  if (!guard.ok) {
    return guard.response;
  }
  return withRouteMetric(request, async () => {
    try {
      const params = await context.params;
      const workspaceId = normalizeWorkspaceId(params.workspaceId);
      const config = await readAppLayerWorkspaceConfig(workspaceId);
      await appendAuditEvent({
        eventType: "workspace.manage",
        status: "success",
        workspaceId,
        userId: guard.context.userId,
        tenantId: guard.context.tenantId,
        correlationId: guard.context.correlationId,
        message: "Loaded app-layer workspace configuration"
      });
      return NextResponse.json({
        workspaceId,
        ...config
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to load app-layer configuration"
        },
        { status: 500 }
      );
    }
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const guard = await guardApiRequest(request, "workspace:write");
  if (!guard.ok) {
    return guard.response;
  }
  return withRouteMetric(request, async () => {
    try {
      const params = await context.params;
      const workspaceId = normalizeWorkspaceId(params.workspaceId);
      const payload = (await request.json()) as Partial<AppLayerWorkspaceConfig>;
      const saved = await writeAppLayerWorkspaceConfig(workspaceId, payload);
      await appendAuditEvent({
        eventType: "workspace.manage",
        status: "success",
        workspaceId,
        userId: guard.context.userId,
        tenantId: guard.context.tenantId,
        correlationId: guard.context.correlationId,
        message: "Saved app-layer workspace configuration"
      });
      return NextResponse.json({
        workspaceId,
        ...saved
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to save app-layer configuration"
        },
        { status: 500 }
      );
    }
  });
}

import { NextResponse } from "next/server";
import {
  readLayoutViewConfig,
  readWorkspaceViewConfig,
  type LayoutViewConfig,
  writeLayoutViewConfig
} from "@/src/server/view-config-storage";
import { normalizeWorkspaceId } from "@/src/server/workspace-context";
import { guardApiRequest, withRouteMetric } from "@/src/server/security/request-context";

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
    const url = new URL(request.url);
    const layoutId = String(url.searchParams.get("layoutId") ?? "").trim();
    if (layoutId) {
      const config = await readLayoutViewConfig(workspaceId, layoutId);
      return NextResponse.json({
        workspaceId,
        layoutId,
        config
      });
    }
    const workspaceConfig = await readWorkspaceViewConfig(workspaceId);
    return NextResponse.json({
      workspaceId,
      layouts: workspaceConfig.layouts
    });
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to load view configs"
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
    const payload = (await request.json()) as {
      layoutId?: string;
      config?: Partial<LayoutViewConfig>;
    };
    const layoutId = String(payload.layoutId ?? "").trim();
    if (!layoutId) {
      return NextResponse.json({ error: "layoutId is required" }, { status: 400 });
    }
    const saved = await writeLayoutViewConfig(workspaceId, layoutId, payload.config ?? {});
    return NextResponse.json({
      workspaceId,
      layoutId,
      config: saved
    });
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to save view config"
        },
        { status: 500 }
      );
    }
  });
}

import { NextResponse } from "next/server";
import {
  readSavedSearchConfig,
  type SavedSearchConfig,
  writeSavedSearchConfig
} from "@/src/server/saved-search-storage";
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
    const config = await readSavedSearchConfig(workspaceId);
    return NextResponse.json({
      workspaceId,
      savedFinds: config.savedFinds,
      savedFoundSets: config.savedFoundSets
    });
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to load saved searches"
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
    const payload = (await request.json()) as Partial<SavedSearchConfig>;
    const saved = await writeSavedSearchConfig(workspaceId, payload);
    return NextResponse.json({
      workspaceId,
      savedFinds: saved.savedFinds,
      savedFoundSets: saved.savedFoundSets
    });
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to save saved-search payload"
        },
        { status: 500 }
      );
    }
  });
}

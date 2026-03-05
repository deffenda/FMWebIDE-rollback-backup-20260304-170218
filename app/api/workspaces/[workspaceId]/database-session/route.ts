import { NextResponse } from "next/server";
import { ensureWorkspaceStorage, normalizeWorkspaceId } from "@/src/server/workspace-context";
import {
  readWorkspaceDatabaseSession,
  updateWorkspaceDatabaseSession
} from "@/src/server/workspace-database-session";
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
      await ensureWorkspaceStorage(workspaceId);
      const session = await readWorkspaceDatabaseSession(workspaceId);
      return NextResponse.json(session);
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to load database session"
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
      await ensureWorkspaceStorage(workspaceId);
      const payload = (await request.json()) as {
        fileId?: string;
        databaseName?: string;
        displayName?: string;
        host?: string;
        username?: string;
        password?: string;
        clearPassword?: boolean;
        activate?: boolean;
        loadLayouts?: boolean;
      };
      const result = await updateWorkspaceDatabaseSession(workspaceId, payload);
      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to update database session"
        },
        { status: 500 }
      );
    }
  });
}

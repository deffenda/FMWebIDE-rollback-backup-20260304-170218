import { NextResponse } from "next/server";
import { getWorkspaceRoutingDebugState } from "@/src/server/filemaker-client";
import {
  WorkspaceRoutingError,
  resolveWorkspaceRoutingTarget
} from "@/src/server/workspace-multifile";
import { workspaceIdFromUrl } from "@/src/server/workspace-context";
import { guardApiRequest, withRouteMetric } from "@/src/server/security/request-context";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const guard = await guardApiRequest(request, "workspace:read");
  if (!guard.ok) {
    return guard.response;
  }
  return withRouteMetric(request, async () => {
    const url = new URL(request.url);
    const workspaceId = workspaceIdFromUrl(url);
    const tableOccurrence = String(url.searchParams.get("tableOccurrence") ?? "").trim();
    const layoutName = String(url.searchParams.get("layoutName") ?? "").trim();
    const databaseName = String(url.searchParams.get("databaseName") ?? "").trim();
    const fileId = String(url.searchParams.get("fileId") ?? "").trim();

    try {
      const debugState = getWorkspaceRoutingDebugState(workspaceId);
      const target =
        tableOccurrence || layoutName || databaseName || fileId
          ? resolveWorkspaceRoutingTarget({
              workspaceId,
              operation: "metadata",
              tableOccurrence,
              layoutNameHint: layoutName,
              databaseNameHint: databaseName,
              fileIdHint: fileId
            }).target
          : null;
      return NextResponse.json(
        {
          workspaceId,
          debugState,
          target
        },
        { status: 200 }
      );
    } catch (error) {
      if (error instanceof WorkspaceRoutingError) {
        return NextResponse.json(
          {
            code: error.code,
            message: error.message,
            guidance: error.guidance,
            details: error.details,
            workspaceId
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        {
          code: "WORKSPACE_ROUTING_ERROR",
          message: error instanceof Error ? error.message : "Failed to load workspace routing debug snapshot",
          workspaceId
        },
        { status: 500 }
      );
    }
  });
}

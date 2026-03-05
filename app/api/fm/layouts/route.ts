import { NextResponse } from "next/server";
import { describeFileMakerError, getAvailableLayouts, isUsingMockData } from "@/src/server/filemaker-client";
import { workspaceIdFromUrl } from "@/src/server/workspace-context";
import { guardApiRequest, withRouteMetric } from "@/src/server/security/request-context";
import { appendAuditEvent } from "@/src/server/audit-log";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const guard = await guardApiRequest(request, "layout:read");
  if (!guard.ok) {
    return guard.response;
  }
  return withRouteMetric(request, async () => {
    try {
      const url = new URL(request.url);
      const workspaceId = workspaceIdFromUrl(url);
    const payload = await getAvailableLayouts({
      workspaceId,
      fileId: url.searchParams.get("fileId") ?? undefined,
      databaseName: url.searchParams.get("databaseName") ?? undefined,
      layoutName: url.searchParams.get("layoutName") ?? undefined,
      tableOccurrence: url.searchParams.get("tableOccurrence") ?? undefined
    });
    await appendAuditEvent({
      eventType: "layout.access",
      status: "success",
      userId: guard.context.userId,
      tenantId: guard.context.tenantId,
      workspaceId,
      correlationId: guard.context.correlationId,
      message: "Fetched available layouts"
    });

    return NextResponse.json({
      workspaceId,
      source: payload.source,
      layouts: payload.layouts,
      layoutFolders: payload.layoutFolders
    });
  } catch (error) {
    await appendAuditEvent({
      eventType: "layout.access",
      status: "failure",
      userId: guard.context.userId,
      tenantId: guard.context.tenantId,
      correlationId: guard.context.correlationId,
      message: error instanceof Error ? error.message : "Failed to load layouts"
    });
    return NextResponse.json(
      {
        ...describeFileMakerError(error),
        source: isUsingMockData({ workspaceId: workspaceIdFromUrl(new URL(request.url)) }) ? "mock" : "filemaker"
      },
      { status: 500 }
    );
  }
  });
}

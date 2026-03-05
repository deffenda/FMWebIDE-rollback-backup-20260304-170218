import { NextResponse } from "next/server";
import {
  describeFileMakerError,
  getAvailableScripts,
  isUsingMockData,
  runScript
} from "@/src/server/filemaker-client";
import { workspaceIdFromPayload, workspaceIdFromUrl } from "@/src/server/workspace-context";
import { guardApiRequest, withRouteMetric } from "@/src/server/security/request-context";
import { appendAuditEvent } from "@/src/server/audit-log";
import { DEFAULT_ACTIVE_TABLE_OCCURRENCE } from "@/src/lib/default-layout-context";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const guard = await guardApiRequest(request, "script:read");
  if (!guard.ok) {
    return guard.response;
  }
  return withRouteMetric(request, async () => {
    try {
      const url = new URL(request.url);
      const workspaceId = workspaceIdFromUrl(url);
      const payload = await getAvailableScripts({
      workspaceId,
      fileId: url.searchParams.get("fileId") ?? undefined,
      databaseName: url.searchParams.get("databaseName") ?? undefined,
      layoutName: url.searchParams.get("layoutName") ?? undefined,
      tableOccurrence: url.searchParams.get("tableOccurrence") ?? undefined
    });
      return NextResponse.json({
        workspaceId,
        source: payload.source,
        scripts: payload.scripts
      });
    } catch (error) {
      const workspaceId = workspaceIdFromUrl(new URL(request.url));
      return NextResponse.json(
        {
          ...describeFileMakerError(error),
          workspaceId,
          source: isUsingMockData({ workspaceId }) ? "mock" : "filemaker"
        },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: Request) {
  const guard = await guardApiRequest(request, "script:execute");
  if (!guard.ok) {
    return guard.response;
  }
  return withRouteMetric(request, async () => {
    try {
      const payload = (await request.json()) as {
        tableOccurrence?: string;
        script?: string;
      parameter?: string;
      workspaceId?: string;
      fileId?: string;
      databaseName?: string;
      layoutName?: string;
    };
    const workspaceId = workspaceIdFromPayload(payload);

    if (!payload.script) {
      return NextResponse.json({ error: "script is required" }, { status: 400 });
    }

      const result = await runScript(
        payload.tableOccurrence ?? DEFAULT_ACTIVE_TABLE_OCCURRENCE,
        payload.script,
        payload.parameter,
        {
        workspaceId,
        fileId: payload.fileId,
        databaseName: payload.databaseName,
        layoutName: payload.layoutName,
        tableOccurrence: payload.tableOccurrence
        }
      );
      await appendAuditEvent({
        eventType: "script.execute",
        status: "success",
        userId: guard.context.userId,
        tenantId: guard.context.tenantId,
        workspaceId,
        tableOccurrence: payload.tableOccurrence ?? DEFAULT_ACTIVE_TABLE_OCCURRENCE,
        scriptName: payload.script,
        correlationId: guard.context.correlationId
      });
      return NextResponse.json({ workspaceId, result });
    } catch (error) {
      await appendAuditEvent({
        eventType: "script.execute",
        status: "failure",
        userId: guard.context.userId,
        tenantId: guard.context.tenantId,
        correlationId: guard.context.correlationId,
        message: error instanceof Error ? error.message : "Script execution failed"
      });
      return NextResponse.json(
        {
          ...describeFileMakerError(error)
        },
        { status: 500 }
      );
    }
  });
}

import { NextResponse } from "next/server";
import { describeFileMakerError, findRecords, isUsingMockData } from "@/src/server/filemaker-client";
import type { FindRequestState, FileMakerFindSortRule } from "@/src/lib/find-mode";
import { workspaceIdFromPayload } from "@/src/server/workspace-context";
import { guardApiRequest, withRouteMetric } from "@/src/server/security/request-context";
import { DEFAULT_ACTIVE_TABLE_OCCURRENCE } from "@/src/lib/default-layout-context";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const guard = await guardApiRequest(request, "record:read");
  if (!guard.ok) {
    return guard.response;
  }
  return withRouteMetric(request, async () => {
    try {
      const payload = (await request.json()) as {
        tableOccurrence?: string;
        requests?: FindRequestState[];
        limit?: number;
        offset?: number;
        sort?: FileMakerFindSortRule[];
        workspaceId?: string;
        fileId?: string;
        databaseName?: string;
        layoutName?: string;
      };
      const workspaceId = workspaceIdFromPayload(payload);
      const tableOccurrence =
        String(payload.tableOccurrence ?? DEFAULT_ACTIVE_TABLE_OCCURRENCE).trim() ||
        DEFAULT_ACTIVE_TABLE_OCCURRENCE;
      const requests = Array.isArray(payload.requests) ? payload.requests : [];
      const limit = typeof payload.limit === "number" && Number.isFinite(payload.limit) ? payload.limit : undefined;
      const offset = typeof payload.offset === "number" && Number.isFinite(payload.offset) ? payload.offset : undefined;
      const sort = Array.isArray(payload.sort) ? payload.sort : undefined;

      const result = await findRecords({
        tableOccurrence,
        requests,
        limit,
        offset,
        sort,
        workspaceId,
        fileId: payload.fileId,
        databaseName: payload.databaseName,
        layoutName: payload.layoutName
      });

      return NextResponse.json({
        workspaceId,
        tableOccurrence,
        source: result.source,
        records: result.records,
        findPayload: result.findPayload
      });
    } catch (error) {
      return NextResponse.json(
        {
          ...describeFileMakerError(error),
          source: isUsingMockData() ? "mock" : "filemaker"
        },
        { status: 500 }
      );
    }
  });
}

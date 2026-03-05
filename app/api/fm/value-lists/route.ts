import { NextResponse } from "next/server";
import { describeFileMakerError, getValueLists, isUsingMockData } from "@/src/server/filemaker-client";
import { workspaceIdFromUrl } from "@/src/server/workspace-context";
import { guardApiRequest, withRouteMetric } from "@/src/server/security/request-context";

export const runtime = "nodejs";

function getTableOccurrence(url: URL): string | undefined {
  const value = url.searchParams.get("tableOccurrence");
  return value ? value.trim() : undefined;
}

function getScope(url: URL): "database" | "layout" {
  const raw = (url.searchParams.get("scope") ?? "").trim().toLowerCase();
  return raw === "layout" ? "layout" : "database";
}

export async function GET(request: Request) {
  const guard = await guardApiRequest(request, "field:read");
  if (!guard.ok) {
    return guard.response;
  }
  return withRouteMetric(request, async () => {
  const url = new URL(request.url);
  const workspaceId = workspaceIdFromUrl(url);
  try {
    const scope = getScope(url);
    const tableOccurrence = getTableOccurrence(url);
    const payload = await getValueLists({
      scope,
      tableOccurrence,
      workspaceId,
      fileId: url.searchParams.get("fileId") ?? undefined,
      databaseName: url.searchParams.get("databaseName") ?? undefined,
      layoutName: url.searchParams.get("layoutName") ?? undefined
    });

    return NextResponse.json({
      workspaceId,
      scope,
      tableOccurrence,
      source: payload.source,
      valueLists: payload.valueLists
    });
  } catch (error) {
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

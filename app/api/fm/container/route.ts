import { NextResponse } from "next/server";
import {
  describeFileMakerError,
  fetchContainerAsset,
  isUsingMockData
} from "@/src/server/filemaker-client";
import { workspaceIdFromUrl } from "@/src/server/workspace-context";
import { guardApiRequest, withRouteMetric } from "@/src/server/security/request-context";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const guard = await guardApiRequest(request, "record:read");
  if (!guard.ok) {
    return guard.response;
  }
  return withRouteMetric(request, async () => {
  const url = new URL(request.url);
  const workspaceId = workspaceIdFromUrl(url);
  const { searchParams } = url;
  const containerUrl = searchParams.get("url")?.trim();

  if (!containerUrl) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  try {
    const payload = await fetchContainerAsset(containerUrl, {
      workspaceId,
      fileId: searchParams.get("fileId") ?? undefined,
      databaseName: searchParams.get("databaseName") ?? undefined
    });
    if (payload.source === "mock") {
      return NextResponse.json(
        { error: "Container assets are unavailable in mock mode", source: "mock", workspaceId },
        { status: 404 }
      );
    }

    const headers = new Headers();
    headers.set("Content-Type", payload.contentType);
    headers.set("Cache-Control", "no-store");
    if (payload.contentDisposition) {
      headers.set("Content-Disposition", payload.contentDisposition);
    }

    return new NextResponse(payload.body, {
      status: 200,
      headers
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

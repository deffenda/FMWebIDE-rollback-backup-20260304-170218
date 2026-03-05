import { NextResponse } from "next/server";
import { getLayoutFields, isUsingMockData } from "@/src/server/filemaker-client";
import { workspaceIdFromUrl } from "@/src/server/workspace-context";
import {
  buildRuntimeCapabilitiesFromFields,
  normalizeCapabilityRole
} from "@/src/lib/runtime-capabilities";
import { guardApiRequest, withRouteMetric } from "@/src/server/security/request-context";
import { DEFAULT_ACTIVE_LAYOUT_NAME } from "@/src/lib/default-layout-context";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const guard = await guardApiRequest(request, "field:read");
  if (!guard.ok) {
    return guard.response;
  }
  return withRouteMetric(request, async () => {
  const url = new URL(request.url);
  const workspaceId = workspaceIdFromUrl(url);
  const tableOccurrence = String(url.searchParams.get("layout") ?? "").trim() || DEFAULT_ACTIVE_LAYOUT_NAME;
  const source = isUsingMockData({ workspaceId }) ? "mock" : "filemaker";
  const role = source === "mock" ? normalizeCapabilityRole(url.searchParams.get("mockRole")) : "fullAccess";

  try {
    const fieldsPayload = await getLayoutFields(tableOccurrence, {
      workspaceId
    });
    const fieldEntries = Array.isArray(fieldsPayload.fields) ? fieldsPayload.fields : [];
    const fieldNames = fieldEntries.map((entry) => String(entry.name ?? "").trim()).filter((entry) => entry.length > 0);
    return NextResponse.json(
      buildRuntimeCapabilitiesFromFields({
        workspaceId,
        source,
        role,
        fieldNames
      })
    );
  } catch (error) {
    return NextResponse.json(
      buildRuntimeCapabilitiesFromFields({
        workspaceId,
        source,
        role,
        fieldNames: [],
        error: error instanceof Error ? error.message : "Failed to derive runtime capabilities"
      }),
      { status: 200 }
    );
  }
  });
}

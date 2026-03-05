import { NextResponse } from "next/server";
import { guardApiRequest, withRouteMetric } from "@/src/server/security/request-context";
import { readPhase1ParityDiagnostics } from "@/src/server/parity-diagnostics";

export const runtime = "nodejs";

function cleanToken(value: unknown): string {
  return String(value ?? "").trim();
}

export async function GET(request: Request) {
  const guard = await guardApiRequest(request, "workspace:read");
  if (!guard.ok) {
    return guard.response;
  }
  return withRouteMetric(request, async () => {
    try {
      const url = new URL(request.url);
      const workspaceId = cleanToken(url.searchParams.get("workspace")) || "default";
      const payload = await readPhase1ParityDiagnostics(workspaceId);
      const response = NextResponse.json(payload);
      response.headers.set("x-correlation-id", guard.context.correlationId);
      return response;
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to load parity diagnostics"
        },
        { status: 500 }
      );
    }
  });
}

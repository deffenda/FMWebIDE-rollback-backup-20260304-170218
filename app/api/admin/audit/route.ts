import { NextResponse } from "next/server";
import { readAuditTrail } from "@/src/server/audit-log";
import { guardApiRequest } from "@/src/server/security/request-context";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const guard = await guardApiRequest(request, "admin:audit");
  if (!guard.ok) {
    return guard.response;
  }
  const url = new URL(request.url);
  const userId = String(url.searchParams.get("userId") ?? "").trim() || undefined;
  const limitToken = Number.parseInt(String(url.searchParams.get("limit") ?? ""), 10);
  const limit = Number.isFinite(limitToken) ? limitToken : 500;
  const format = String(url.searchParams.get("format") ?? "json").trim().toLowerCase();
  const events = await readAuditTrail({ userId, limit });
  if (format === "ndjson") {
    const body = events.map((entry) => JSON.stringify(entry)).join("\n");
    const response = new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store"
      }
    });
    response.headers.set("x-correlation-id", guard.context.correlationId);
    return response;
  }
  const response = NextResponse.json({
    count: events.length,
    events
  });
  response.headers.set("x-correlation-id", guard.context.correlationId);
  return response;
}

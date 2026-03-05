import { NextResponse } from "next/server";
import { getMetricsSnapshot } from "@/src/server/observability";
import { getCircuitDiagnostics } from "@/src/server/resilience/circuit-breaker";
import { listSessionDiagnostics } from "@/src/server/security/session-store";
import { guardApiRequest } from "@/src/server/security/request-context";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const guard = await guardApiRequest(request, "admin:metrics");
  if (!guard.ok) {
    return guard.response;
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    correlationId: guard.context.correlationId,
    metrics: getMetricsSnapshot(),
    circuitBreaker: getCircuitDiagnostics(),
    sessions: listSessionDiagnostics()
  };

  const response = NextResponse.json(payload);
  response.headers.set("x-correlation-id", guard.context.correlationId);
  return response;
}

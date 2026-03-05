import { NextResponse } from "next/server";
import { getEnterpriseConfig, getPublicEnterpriseCapabilities } from "@/src/server/enterprise-config";
import { readRequestSecurityContext } from "@/src/server/security/request-context";
import { listSessionDiagnostics } from "@/src/server/security/session-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const config = getEnterpriseConfig();
  const context = readRequestSecurityContext(request);

  const response = NextResponse.json({
    authMode: config.auth.mode,
    authenticated: context.userId !== "anonymous",
    user: context.userId === "anonymous" ? null : context.userId,
    displayName: context.userId === "anonymous" ? null : context.displayName,
    roles: context.roles,
    tenantId: context.tenantId ?? null,
    correlationId: context.correlationId,
    capabilities: getPublicEnterpriseCapabilities(),
    sessionDiagnostics: listSessionDiagnostics().slice(0, 5)
  });
  response.headers.set("x-correlation-id", context.correlationId);
  return response;
}

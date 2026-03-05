import { NextResponse } from "next/server";
import { getEnterpriseConfig } from "@/src/server/enterprise-config";
import { appendAuditEvent } from "@/src/server/audit-log";
import { destroySession } from "@/src/server/security/session-store";
import { readRequestSecurityContext } from "@/src/server/security/request-context";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const config = getEnterpriseConfig();
  const context = readRequestSecurityContext(request);
  if (context.sessionId) {
    destroySession(context.sessionId);
  }
  const response = NextResponse.json({
    success: true
  });
  response.cookies.set(config.auth.sessionCookieName, "", {
    httpOnly: true,
    secure: config.profile === "PROD",
    sameSite: "lax",
    maxAge: 0,
    path: "/"
  });
  response.headers.set("x-correlation-id", context.correlationId);

  await appendAuditEvent({
    eventType: "auth.logout",
    status: "success",
    userId: context.userId,
    tenantId: context.tenantId,
    correlationId: context.correlationId,
    message: "Session logged out"
  });

  return response;
}

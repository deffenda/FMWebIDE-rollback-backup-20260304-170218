import { NextResponse } from "next/server";
import { getEnterpriseConfig } from "@/src/server/enterprise-config";
import { generateCsrfToken, resolveCsrfCookieValue } from "@/src/server/security/csrf";
import { readRequestSecurityContext } from "@/src/server/security/request-context";
import { appendAuditEvent } from "@/src/server/audit-log";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const config = getEnterpriseConfig();
  const context = readRequestSecurityContext(request);
  const existing = resolveCsrfCookieValue(request);
  const token = existing ?? generateCsrfToken();

  const response = NextResponse.json({
    csrfEnabled: config.csrf.enabled,
    headerName: config.csrf.headerName,
    token
  });
  response.cookies.set(config.csrf.cookieName, token, {
    httpOnly: false,
    sameSite: "lax",
    secure: config.profile === "PROD",
    path: "/",
    maxAge: config.csrf.cookieMaxAgeSeconds
  });
  response.headers.set("x-correlation-id", context.correlationId);

  await appendAuditEvent({
    eventType: "auth.login",
    status: "success",
    userId: context.userId,
    tenantId: context.tenantId,
    correlationId: context.correlationId,
    message: "Issued CSRF token"
  });

  return response;
}

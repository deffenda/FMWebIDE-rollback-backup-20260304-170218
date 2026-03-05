import { NextResponse } from "next/server";
import { getEnterpriseConfig, getPublicEnterpriseCapabilities } from "@/src/server/enterprise-config";
import { guardApiRequest } from "@/src/server/security/request-context";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const guard = await guardApiRequest(request, "admin:metrics");
  if (!guard.ok) {
    return guard.response;
  }

  const config = getEnterpriseConfig();
  const response = NextResponse.json({
    profile: config.profile,
    capabilities: getPublicEnterpriseCapabilities(),
    limits: {
      rateLimit: config.rateLimit,
      resilience: config.resilience
    },
    governance: {
      authMode: config.auth.mode,
      csrf: {
        enabled: config.csrf.enabled,
        headerName: config.csrf.headerName
      },
      audit: config.audit
    }
  });
  response.headers.set("x-correlation-id", guard.context.correlationId);
  return response;
}

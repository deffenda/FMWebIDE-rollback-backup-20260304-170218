import { NextResponse } from "next/server";
import { guardApiRequest, withRouteMetric } from "@/src/server/security/request-context";
import { buildAdminConsolePayload } from "@/src/server/admin-console";
import { resolveGovernanceRoleFromClaims } from "@/src/lib/governance-rbac";

export const runtime = "nodejs";

function cleanToken(value: unknown): string {
  return String(value ?? "").trim();
}

export async function GET(request: Request) {
  const guard = await guardApiRequest(request, "admin:metrics");
  if (!guard.ok) {
    return guard.response;
  }
  return withRouteMetric(request, async () => {
    try {
      const role = resolveGovernanceRoleFromClaims(guard.context.roles);
      if (role !== "admin") {
        return NextResponse.json(
          {
            error: "Forbidden",
            guidance: "Admin Console is restricted to Admin role."
          },
          { status: 403 }
        );
      }

      const url = new URL(request.url);
      const limitToken = Number.parseInt(cleanToken(url.searchParams.get("auditLimit")), 10);
      const auditLimit = Number.isFinite(limitToken) ? Math.max(20, Math.min(2000, limitToken)) : 200;
      const payload = await buildAdminConsolePayload({
        auditLimit
      });

      return NextResponse.json(payload);
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to load admin console data"
        },
        { status: 500 }
      );
    }
  });
}

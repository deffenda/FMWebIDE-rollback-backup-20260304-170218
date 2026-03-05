import { NextResponse } from "next/server";
import { getEnterpriseConfig } from "@/src/server/enterprise-config";
import { getShutdownState, initGracefulShutdownHooks } from "@/src/server/graceful-shutdown";
import { getMetricsSnapshot } from "@/src/server/observability";

export const runtime = "nodejs";

initGracefulShutdownHooks();

export async function GET() {
  const config = getEnterpriseConfig();
  const shutdown = getShutdownState();
  return NextResponse.json({
    status: shutdown.shuttingDown ? "degraded" : "ok",
    profile: config.profile,
    authMode: config.auth.mode,
    shutdown,
    metricsRouteCount: getMetricsSnapshot().routes.length,
    timestamp: new Date().toISOString()
  });
}

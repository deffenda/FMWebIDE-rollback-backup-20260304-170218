import { getEnterpriseConfig } from "./enterprise-config.ts";

type RouteMetric = {
  count: number;
  errors: number;
  totalDurationMs: number;
  lastStatus: number;
  lastDurationMs: number;
  lastSeenAt: number;
};

const routeMetrics = new Map<string, RouteMetric>();

export function logStructured(
  level: "info" | "warn" | "error",
  event: string,
  payload: Record<string, unknown>
): void {
  const config = getEnterpriseConfig();
  if (!config.observability.structuredLogs) {
    return;
  }
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...payload
  };
  const json = JSON.stringify(entry);
  if (level === "error") {
    console.error(json);
    return;
  }
  if (level === "warn") {
    console.warn(json);
    return;
  }
  console.log(json);
}

export function recordRouteMetric(params: {
  method: string;
  path: string;
  status: number;
  durationMs: number;
}): void {
  const config = getEnterpriseConfig();
  if (!config.observability.metricsEnabled) {
    return;
  }
  const key = `${params.method.toUpperCase()} ${params.path}`;
  const metric = routeMetrics.get(key) ?? {
    count: 0,
    errors: 0,
    totalDurationMs: 0,
    lastStatus: 200,
    lastDurationMs: 0,
    lastSeenAt: 0
  };
  metric.count += 1;
  if (params.status >= 400) {
    metric.errors += 1;
  }
  metric.totalDurationMs += params.durationMs;
  metric.lastStatus = params.status;
  metric.lastDurationMs = params.durationMs;
  metric.lastSeenAt = Date.now();
  routeMetrics.set(key, metric);
}

export function getMetricsSnapshot(): {
  generatedAt: string;
  routes: Array<{
    route: string;
    count: number;
    errors: number;
    errorRate: number;
    avgDurationMs: number;
    lastStatus: number;
    lastDurationMs: number;
    lastSeenAt: number;
  }>;
} {
  const routes = [...routeMetrics.entries()].map(([route, metric]) => ({
    route,
    count: metric.count,
    errors: metric.errors,
    errorRate: metric.count > 0 ? Number((metric.errors / metric.count).toFixed(6)) : 0,
    avgDurationMs: metric.count > 0 ? Number((metric.totalDurationMs / metric.count).toFixed(2)) : 0,
    lastStatus: metric.lastStatus,
    lastDurationMs: metric.lastDurationMs,
    lastSeenAt: metric.lastSeenAt
  }));
  routes.sort((a, b) => a.route.localeCompare(b.route));
  return {
    generatedAt: new Date().toISOString(),
    routes
  };
}

export function resetMetricsForTests(): void {
  routeMetrics.clear();
}

import { getEnterpriseConfig } from "../enterprise-config.ts";
import { appendAuditEvent } from "../audit-log.ts";
import { canPerformAction, type ApiAction } from "./authorization.ts";
import { shouldValidateCsrf, validateCsrfRequest } from "./csrf.ts";
import { recordRouteMetric } from "../observability.ts";

export type RequestSecurityContext = {
  userId: string;
  displayName: string;
  roles: string[];
  tenantId?: string;
  correlationId: string;
  authMode: string;
  sessionId?: string;
};

const USER_HEADER = "x-webide-auth-user";
const DISPLAY_NAME_HEADER = "x-webide-auth-name";
const ROLES_HEADER = "x-webide-auth-roles";
const TENANT_HEADER = "x-webide-auth-tenant";
const CORRELATION_HEADER = "x-correlation-id";
const AUTH_MODE_HEADER = "x-webide-auth-mode";
const SESSION_HEADER = "x-webide-session-id";

export function readRequestSecurityContext(request: Request): RequestSecurityContext {
  const roles = (request.headers.get(ROLES_HEADER) ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
  return {
    userId: (request.headers.get(USER_HEADER) ?? "").trim() || "anonymous",
    displayName: (request.headers.get(DISPLAY_NAME_HEADER) ?? "").trim() || "anonymous",
    roles,
    tenantId: (request.headers.get(TENANT_HEADER) ?? "").trim() || undefined,
    correlationId: (request.headers.get(CORRELATION_HEADER) ?? "").trim() || crypto.randomUUID(),
    authMode: (request.headers.get(AUTH_MODE_HEADER) ?? "").trim() || "disabled",
    sessionId: (request.headers.get(SESSION_HEADER) ?? "").trim() || undefined
  };
}

function isSecurityBypassed(request: Request): boolean {
  const config = getEnterpriseConfig();
  if (config.profile === "DEV") {
    const allow = String(request.headers.get("x-webide-dev-bypass") ?? "").trim().toLowerCase();
    return allow === "1" || allow === "true";
  }
  return false;
}

export async function guardApiRequest(
  request: Request,
  action: ApiAction
): Promise<{ ok: true; context: RequestSecurityContext } | { ok: false; response: Response }> {
  const context = readRequestSecurityContext(request);

  const jsonResponse = (payload: Record<string, unknown>, status: number): Response => {
    const response = new Response(JSON.stringify(payload), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "x-correlation-id": context.correlationId
      }
    });
    return response;
  };

  if (!isSecurityBypassed(request) && getEnterpriseConfig().auth.mode !== "disabled") {
    if (!context.userId || context.userId === "anonymous") {
      const response = jsonResponse(
        {
          error: "Unauthenticated request",
          guidance: "Authenticate through SSO/JWT before calling this endpoint."
        },
        401
      );
      return { ok: false, response };
    }

    if (!canPerformAction(context.roles, action)) {
      await appendAuditEvent({
        eventType: "workspace.manage",
        status: "failure",
        userId: context.userId,
        tenantId: context.tenantId,
        correlationId: context.correlationId,
        message: `Authorization denied for action ${action}`,
        details: {
          action,
          roles: context.roles
        }
      });
      const response = jsonResponse(
        {
          error: "Forbidden",
          action,
          guidance: "Your role does not permit this action."
        },
        403
      );
      return { ok: false, response };
    }
  }

  if (shouldValidateCsrf(request)) {
    const csrfResult = validateCsrfRequest(request);
    if (!csrfResult.ok) {
      const response = jsonResponse(
        {
          error: "CSRF validation failed",
          guidance: csrfResult.message
        },
        403
      );
      return { ok: false, response };
    }
  }

  return {
    ok: true,
    context
  };
}

export async function withRouteMetric<T>(
  request: Request,
  handler: () => Promise<T>
): Promise<T> {
  const startedAt = Date.now();
  try {
    const result = await handler();
    const status = result instanceof Response ? result.status : 200;
    recordRouteMetric({
      method: request.method,
      path: new URL(request.url).pathname,
      status,
      durationMs: Date.now() - startedAt
    });
    return result;
  } catch (error) {
    recordRouteMetric({
      method: request.method,
      path: new URL(request.url).pathname,
      status: 500,
      durationMs: Date.now() - startedAt
    });
    throw error;
  }
}

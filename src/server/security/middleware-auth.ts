import type { NextRequest } from "next/server";
import { getEnterpriseConfig } from "../enterprise-config.ts";
import { extractBearerToken, validateJwt } from "./jwt.ts";
import {
  createSession,
  resolveSessionFromRequest,
  touchSession,
  type AuthenticatedSession
} from "./session-store.ts";
import { generateCsrfToken, resolveCsrfCookieValue } from "./csrf.ts";

export type MiddlewareAuthState =
  | {
      ok: true;
      session: AuthenticatedSession;
      createdSession: boolean;
      refreshedSession: boolean;
      csrfToken: string;
    }
  | {
      ok: false;
      status: 401 | 403;
      code: string;
      message: string;
    };

function parseRoleList(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

function resolveTrustedHeaderIdentity(request: NextRequest): {
  userId: string;
  displayName: string;
  roles: string[];
  tenantId?: string;
} | null {
  const config = getEnterpriseConfig();
  const user = (request.headers.get(config.auth.trustedHeader) ?? "").trim();
  if (!user) {
    return null;
  }
  const displayName = (request.headers.get("x-forwarded-name") ?? user).trim();
  const roles = parseRoleList(request.headers.get("x-forwarded-roles") ?? "developer");
  const tenantId = (request.headers.get(config.tenancy.tenantHeaderName) ?? "").trim() || undefined;
  return {
    userId: user,
    displayName,
    roles: roles.length > 0 ? roles : ["developer"],
    tenantId
  };
}

async function resolveJwtIdentity(request: NextRequest): Promise<{
  userId: string;
  displayName: string;
  roles: string[];
  tenantId?: string;
} | null> {
  const config = getEnterpriseConfig();
  const token = extractBearerToken(request);
  if (!token) {
    return null;
  }
  const result = await validateJwt(token, config.auth.mode);
  if (!result.ok) {
    return null;
  }
  const claims = result.claims;
  const userId =
    String(claims.preferred_username ?? claims.upn ?? claims.email ?? claims.sub ?? "").trim();
  if (!userId) {
    return null;
  }
  const displayName = String(claims.name ?? claims.preferred_username ?? userId).trim() || userId;
  const tenantId = String(claims.tenantId ?? claims.tid ?? "").trim() || undefined;
  const roles =
    (Array.isArray(claims.roles) ? claims.roles : parseRoleList(String(claims.roles ?? ""))).map((entry) =>
      String(entry).trim().toLowerCase()
    );
  return {
    userId,
    displayName,
    roles: roles.length > 0 ? roles : ["readonly"],
    tenantId
  };
}

function ensureCsrfToken(request: NextRequest): string {
  const existing = resolveCsrfCookieValue(request);
  if (existing) {
    return existing;
  }
  return generateCsrfToken();
}

export async function authenticateForMiddleware(request: NextRequest): Promise<MiddlewareAuthState> {
  const config = getEnterpriseConfig();
  const mode = config.auth.mode;
  const csrfToken = ensureCsrfToken(request);

  if (mode === "disabled") {
    const session = createSession({
      userId: "anonymous",
      displayName: "anonymous",
      roles: ["admin"],
      authMode: "disabled"
    });
    return {
      ok: true,
      session,
      createdSession: true,
      refreshedSession: false,
      csrfToken
    };
  }

  const existing = resolveSessionFromRequest(request);
  if (existing) {
    const touched = touchSession(existing.sessionId);
    return {
      ok: true,
      session: touched ?? existing,
      createdSession: false,
      refreshedSession: true,
      csrfToken
    };
  }

  const identity =
    mode === "trusted-header" ? resolveTrustedHeaderIdentity(request) : await resolveJwtIdentity(request);
  if (!identity) {
    return {
      ok: false,
      status: 401,
      code: "AUTH_REQUIRED",
      message: mode === "trusted-header" ? "Missing trusted identity header." : "Missing or invalid bearer token."
    };
  }

  const session = createSession({
    userId: identity.userId,
    displayName: identity.displayName,
    roles: identity.roles,
    tenantId: identity.tenantId,
    authMode: mode
  });
  return {
    ok: true,
    session,
    createdSession: true,
    refreshedSession: false,
    csrfToken
  };
}

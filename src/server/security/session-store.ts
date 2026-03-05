import { getEnterpriseConfig } from "../enterprise-config.ts";

export type AuthenticatedSession = {
  sessionId: string;
  userId: string;
  displayName: string;
  roles: string[];
  tenantId?: string;
  authMode: string;
  expiresAt: number;
  issuedAt: number;
  lastSeenAt: number;
};

const sessions = new Map<string, AuthenticatedSession>();

function cookieDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }
  const result: Record<string, string> = {};
  for (const pair of cookieHeader.split(";")) {
    const [nameRaw, ...rest] = pair.split("=");
    const name = nameRaw.trim();
    if (!name) {
      continue;
    }
    result[name] = cookieDecode(rest.join("=").trim());
  }
  return result;
}

function nowMs(): number {
  return Date.now();
}

function ttlMs(): number {
  return getEnterpriseConfig().auth.sessionTtlSeconds * 1_000;
}

function refreshWindowMs(): number {
  return getEnterpriseConfig().auth.sessionRefreshWindowSeconds * 1_000;
}

export function createSession(params: {
  userId: string;
  displayName?: string;
  roles?: string[];
  tenantId?: string;
  authMode: string;
}): AuthenticatedSession {
  const now = nowMs();
  const session: AuthenticatedSession = {
    sessionId: crypto.randomUUID(),
    userId: params.userId.trim(),
    displayName: params.displayName?.trim() || params.userId.trim(),
    roles: (params.roles ?? []).map((entry) => entry.trim()).filter((entry) => entry.length > 0),
    tenantId: params.tenantId?.trim() || undefined,
    authMode: params.authMode,
    expiresAt: now + ttlMs(),
    issuedAt: now,
    lastSeenAt: now
  };
  sessions.set(session.sessionId, session);
  pruneExpiredSessions();
  return session;
}

export function resolveSessionFromRequest(request: Request): AuthenticatedSession | null {
  const cookieName = getEnterpriseConfig().auth.sessionCookieName;
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  const token = cookies[cookieName]?.trim();
  if (!token) {
    return null;
  }
  const session = sessions.get(token);
  if (!session) {
    return null;
  }
  if (session.expiresAt <= nowMs()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

export function touchSession(sessionId: string): AuthenticatedSession | null {
  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }
  const now = nowMs();
  session.lastSeenAt = now;
  if (session.expiresAt - now <= refreshWindowMs()) {
    session.expiresAt = now + ttlMs();
  }
  sessions.set(sessionId, session);
  return session;
}

export function destroySession(sessionId: string): void {
  sessions.delete(sessionId);
}

export function pruneExpiredSessions(): void {
  const now = nowMs();
  for (const [key, value] of sessions.entries()) {
    if (value.expiresAt <= now) {
      sessions.delete(key);
    }
  }
}

export function listSessionDiagnostics(): Array<{
  sessionId: string;
  userId: string;
  roles: string[];
  tenantId?: string;
  expiresAt: number;
  expiresInMs: number;
}> {
  pruneExpiredSessions();
  const now = nowMs();
  return [...sessions.values()].map((session) => ({
    sessionId: `${session.sessionId.slice(0, 8)}…`,
    userId: session.userId,
    roles: session.roles,
    tenantId: session.tenantId,
    expiresAt: session.expiresAt,
    expiresInMs: Math.max(0, session.expiresAt - now)
  }));
}

export function resetSessionStoreForTests(): void {
  sessions.clear();
}

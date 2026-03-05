import type { NextRequest } from "next/server";
import { getEnterpriseConfig } from "../enterprise-config.ts";

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
    result[name] = rest.join("=").trim();
  }
  return result;
}

export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let text = "";
  for (const byte of bytes) {
    text += String.fromCharCode(byte);
  }
  if (typeof btoa === "function") {
    return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }
  return Buffer.from(bytes).toString("base64url");
}

export function resolveCsrfCookieValue(request: Request | NextRequest): string | undefined {
  const cookieName = getEnterpriseConfig().csrf.cookieName;
  const cookies = parseCookieHeader(request.headers.get("cookie"));
  const token = cookies[cookieName]?.trim();
  return token || undefined;
}

export function isMutatingMethod(method: string): boolean {
  const upper = method.trim().toUpperCase();
  return upper === "POST" || upper === "PUT" || upper === "PATCH" || upper === "DELETE";
}

export function shouldValidateCsrf(request: Request | NextRequest): boolean {
  const config = getEnterpriseConfig();
  if (!config.csrf.enabled) {
    return false;
  }
  if (!isMutatingMethod(request.method)) {
    return false;
  }
  const path = new URL(request.url).pathname;
  if (path === "/api/auth/csrf") {
    return false;
  }
  return path.startsWith("/api/");
}

export function validateCsrfRequest(request: Request | NextRequest): { ok: true } | { ok: false; message: string } {
  const config = getEnterpriseConfig();
  const cookieToken = resolveCsrfCookieValue(request);
  const headerToken = (request.headers.get(config.csrf.headerName) ?? "").trim();
  if (!cookieToken) {
    return {
      ok: false,
      message: `Missing CSRF cookie (${config.csrf.cookieName})`
    };
  }
  if (!headerToken) {
    return {
      ok: false,
      message: `Missing CSRF header (${config.csrf.headerName})`
    };
  }
  if (cookieToken !== headerToken) {
    return {
      ok: false,
      message: "CSRF token mismatch"
    };
  }
  return { ok: true };
}

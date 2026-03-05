export type EnvProfile = "DEV" | "TEST" | "PROD";

export type AuthMode =
  | "disabled"
  | "trusted-header"
  | "jwt-hs256"
  | "jwt-rs256"
  | "oidc";

export type EnterpriseConfig = {
  profile: EnvProfile;
  auth: {
    mode: AuthMode;
    trustedHeader: string;
    jwtIssuer?: string;
    jwtAudience?: string;
    jwtHs256Secret?: string;
    jwtPublicKeyPem?: string;
    jwtJwksJson?: string;
    sessionCookieName: string;
    sessionTtlSeconds: number;
    sessionRefreshWindowSeconds: number;
  };
  csrf: {
    enabled: boolean;
    headerName: string;
    cookieName: string;
    cookieMaxAgeSeconds: number;
  };
  security: {
    csp: string;
    enableSecurityHeaders: boolean;
  };
  audit: {
    enabled: boolean;
    retentionDays: number;
    redactionMode: "none" | "hipaa-basic";
  };
  observability: {
    structuredLogs: boolean;
    metricsEnabled: boolean;
  };
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
  };
  resilience: {
    circuitBreakerEnabled: boolean;
    failureThreshold: number;
    cooldownMs: number;
  };
  tenancy: {
    enabled: boolean;
    tenantHeaderName: string;
  };
};

function readText(name: string): string | undefined {
  const token = String(process.env[name] ?? "").trim();
  return token || undefined;
}

function readNumber(name: string, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(String(process.env[name] ?? ""), 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, min), max);
}

function readBool(name: string, fallback: boolean): boolean {
  const token = String(process.env[name] ?? "").trim().toLowerCase();
  if (!token) {
    return fallback;
  }
  if (token === "1" || token === "true" || token === "yes" || token === "on") {
    return true;
  }
  if (token === "0" || token === "false" || token === "no" || token === "off") {
    return false;
  }
  return fallback;
}

function detectProfile(): EnvProfile {
  const explicit = String(process.env.WEBIDE_ENV_PROFILE ?? "").trim().toUpperCase();
  if (explicit === "DEV" || explicit === "TEST" || explicit === "PROD") {
    return explicit;
  }
  if (process.env.NODE_ENV === "production") {
    return "PROD";
  }
  if (process.env.NODE_ENV === "test") {
    return "TEST";
  }
  return "DEV";
}

function defaultAuthMode(profile: EnvProfile): AuthMode {
  const explicit = String(process.env.WEBIDE_AUTH_MODE ?? "").trim().toLowerCase();
  if (
    explicit === "disabled" ||
    explicit === "trusted-header" ||
    explicit === "jwt-hs256" ||
    explicit === "jwt-rs256" ||
    explicit === "oidc"
  ) {
    return explicit;
  }
  return profile === "PROD" ? "trusted-header" : "disabled";
}

function defaultCsp(): string {
  const fromEnv = readText("WEBIDE_CSP");
  if (fromEnv) {
    return fromEnv;
  }
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: blob:",
    "media-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  ].join("; ");
}

let cachedConfig: EnterpriseConfig | null = null;

export function getEnterpriseConfig(): EnterpriseConfig {
  if (cachedConfig) {
    return cachedConfig;
  }
  const profile = detectProfile();
  const csrfEnabledDefault = profile === "PROD";
  const rateLimitDefault = profile !== "DEV";
  const auditDefault = profile !== "DEV";
  const structuredLogDefault = profile !== "DEV";
  const config: EnterpriseConfig = {
    profile,
    auth: {
      mode: defaultAuthMode(profile),
      trustedHeader: readText("WEBIDE_SSO_HEADER")?.toLowerCase() || "x-forwarded-user",
      jwtIssuer: readText("WEBIDE_JWT_ISSUER"),
      jwtAudience: readText("WEBIDE_JWT_AUDIENCE"),
      jwtHs256Secret: readText("WEBIDE_JWT_HS256_SECRET"),
      jwtPublicKeyPem: readText("WEBIDE_JWT_PUBLIC_KEY_PEM"),
      jwtJwksJson: readText("WEBIDE_JWT_JWKS_JSON") ?? readText("WEBIDE_OIDC_JWKS_JSON"),
      sessionCookieName: readText("WEBIDE_SESSION_COOKIE_NAME") || "webide_session",
      sessionTtlSeconds: readNumber("WEBIDE_SESSION_TTL_SECONDS", 8 * 60 * 60, 300, 7 * 24 * 60 * 60),
      sessionRefreshWindowSeconds: readNumber("WEBIDE_SESSION_REFRESH_WINDOW_SECONDS", 30 * 60, 60, 4 * 60 * 60)
    },
    csrf: {
      enabled: readBool("WEBIDE_CSRF_ENABLED", csrfEnabledDefault),
      headerName: readText("WEBIDE_CSRF_HEADER_NAME")?.toLowerCase() || "x-csrf-token",
      cookieName: readText("WEBIDE_CSRF_COOKIE_NAME") || "webide_csrf",
      cookieMaxAgeSeconds: readNumber("WEBIDE_CSRF_MAX_AGE_SECONDS", 24 * 60 * 60, 60, 30 * 24 * 60 * 60)
    },
    security: {
      csp: defaultCsp(),
      enableSecurityHeaders: readBool("WEBIDE_SECURITY_HEADERS_ENABLED", true)
    },
    audit: {
      enabled: readBool("WEBIDE_AUDIT_ENABLED", auditDefault),
      retentionDays: readNumber("WEBIDE_AUDIT_RETENTION_DAYS", 30, 1, 3650),
      redactionMode: readText("WEBIDE_AUDIT_REDACTION_MODE") === "hipaa-basic" ? "hipaa-basic" : "none"
    },
    observability: {
      structuredLogs: readBool("WEBIDE_STRUCTURED_LOGS", structuredLogDefault),
      metricsEnabled: readBool("WEBIDE_METRICS_ENABLED", true)
    },
    rateLimit: {
      enabled: readBool("WEBIDE_RATE_LIMIT_ENABLED", rateLimitDefault),
      windowMs: readNumber("WEBIDE_RATE_LIMIT_WINDOW_MS", 60_000, 1_000, 3_600_000),
      maxRequests: readNumber("WEBIDE_RATE_LIMIT_MAX_REQUESTS", profile === "PROD" ? 120 : 400, 20, 100_000)
    },
    resilience: {
      circuitBreakerEnabled: readBool("WEBIDE_CIRCUIT_BREAKER_ENABLED", true),
      failureThreshold: readNumber("WEBIDE_CIRCUIT_BREAKER_FAILURE_THRESHOLD", 5, 2, 100),
      cooldownMs: readNumber("WEBIDE_CIRCUIT_BREAKER_COOLDOWN_MS", 15_000, 1_000, 300_000)
    },
    tenancy: {
      enabled: readBool("WEBIDE_MULTI_TENANT_ENABLED", false),
      tenantHeaderName: readText("WEBIDE_TENANT_HEADER")?.toLowerCase() || "x-tenant-id"
    }
  };
  cachedConfig = config;
  return config;
}

export function resetEnterpriseConfigForTests(): void {
  cachedConfig = null;
}

export function getPublicEnterpriseCapabilities(): Record<string, unknown> {
  const config = getEnterpriseConfig();
  return {
    profile: config.profile,
    authMode: config.auth.mode,
    csrfEnabled: config.csrf.enabled,
    securityHeaders: config.security.enableSecurityHeaders,
    auditEnabled: config.audit.enabled,
    observabilityEnabled: config.observability.metricsEnabled,
    rateLimitEnabled: config.rateLimit.enabled,
    tenantIsolationEnabled: config.tenancy.enabled
  };
}

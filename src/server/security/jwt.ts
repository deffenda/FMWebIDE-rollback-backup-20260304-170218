import { getEnterpriseConfig, type AuthMode } from "../enterprise-config.ts";

type JwtHeader = {
  alg?: string;
  typ?: string;
  kid?: string;
};

export type JwtClaims = {
  sub?: string;
  iss?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  roles?: string[] | string;
  groups?: string[] | string;
  tenantId?: string;
  [key: string]: unknown;
};

export type JwtValidationResult =
  | {
      ok: true;
      header: JwtHeader;
      claims: JwtClaims;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

function toBase64(input: string): string {
  const padded = `${input}${"=".repeat((4 - (input.length % 4 || 4)) % 4)}`;
  return padded.replace(/-/g, "+").replace(/_/g, "/");
}

function decodeBase64UrlToBytes(value: string): Uint8Array {
  const base64 = toBase64(value);
  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }
  const nodeBuffer = Buffer.from(base64, "base64");
  return new Uint8Array(nodeBuffer);
}

function decodeBase64UrlToText(value: string): string {
  return new TextDecoder().decode(decodeBase64UrlToBytes(value));
}

function normalizeAudience(aud: unknown): string[] {
  if (typeof aud === "string") {
    const cleaned = aud.trim();
    return cleaned ? [cleaned] : [];
  }
  if (!Array.isArray(aud)) {
    return [];
  }
  return aud
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

function parseJwks(jwksJson: string | undefined): Array<Record<string, unknown>> {
  if (!jwksJson) {
    return [];
  }
  try {
    const parsedUnknown = JSON.parse(jwksJson) as unknown;
    if (Array.isArray(parsedUnknown)) {
      return parsedUnknown as Array<Record<string, unknown>>;
    }
    const parsed = parsedUnknown as { keys?: Array<Record<string, unknown>> };
    if (Array.isArray(parsed?.keys)) {
      return parsed.keys;
    }
  } catch {
    return [];
  }
  return [];
}

function pickRsaJwk(
  jwks: Array<Record<string, unknown>>,
  kid?: string
): Record<string, unknown> | undefined {
  if (jwks.length === 0) {
    return undefined;
  }
  const filtered = jwks.filter((entry) => String(entry.kty ?? "").toUpperCase() === "RSA");
  if (filtered.length === 0) {
    return undefined;
  }
  if (kid) {
    const byKid = filtered.find((entry) => String(entry.kid ?? "") === kid);
    if (byKid) {
      return byKid;
    }
  }
  return filtered[0];
}

async function verifyHs256(signingInput: string, signature: Uint8Array, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    signature as BufferSource,
    new TextEncoder().encode(signingInput) as BufferSource
  );
}

function pemBodyToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PUBLIC KEY-----/g, "")
    .replace(/-----END PUBLIC KEY-----/g, "")
    .replace(/\s+/g, "");
  const bytes = decodeBase64UrlToBytes(base64.replace(/\+/g, "-").replace(/\//g, "_"));
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function verifyRs256WithPem(signingInput: string, signature: Uint8Array, pem: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "spki",
    pemBodyToArrayBuffer(pem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  return crypto.subtle.verify(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    signature as BufferSource,
    new TextEncoder().encode(signingInput) as BufferSource
  );
}

async function verifyRs256WithJwk(
  signingInput: string,
  signature: Uint8Array,
  jwk: Record<string, unknown>
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk as JsonWebKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  return crypto.subtle.verify(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    signature as BufferSource,
    new TextEncoder().encode(signingInput) as BufferSource
  );
}

function extractRoles(claims: JwtClaims): string[] {
  const raw = claims.roles ?? claims.groups ?? [];
  if (Array.isArray(raw)) {
    return raw.map((entry) => String(entry).trim()).filter((entry) => entry.length > 0);
  }
  if (typeof raw === "string") {
    return raw
      .split(/[,\s]+/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  return [];
}

function validateClaims(claims: JwtClaims, mode: AuthMode): JwtValidationResult | null {
  const config = getEnterpriseConfig();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const exp = Number(claims.exp ?? NaN);
  if (Number.isFinite(exp) && exp <= nowSeconds) {
    return {
      ok: false,
      code: "JWT_EXPIRED",
      message: "JWT has expired"
    };
  }
  const nbf = Number(claims.nbf ?? NaN);
  if (Number.isFinite(nbf) && nbf > nowSeconds + 30) {
    return {
      ok: false,
      code: "JWT_NOT_ACTIVE",
      message: "JWT is not active yet"
    };
  }
  if ((mode === "oidc" || mode === "jwt-rs256" || mode === "jwt-hs256") && config.auth.jwtIssuer) {
    const issuer = String(claims.iss ?? "").trim();
    if (!issuer || issuer !== config.auth.jwtIssuer) {
      return {
        ok: false,
        code: "JWT_ISSUER_MISMATCH",
        message: "JWT issuer mismatch"
      };
    }
  }
  if ((mode === "oidc" || mode === "jwt-rs256" || mode === "jwt-hs256") && config.auth.jwtAudience) {
    const audList = normalizeAudience(claims.aud);
    if (!audList.includes(config.auth.jwtAudience)) {
      return {
        ok: false,
        code: "JWT_AUDIENCE_MISMATCH",
        message: "JWT audience mismatch"
      };
    }
  }
  return null;
}

export async function validateJwt(token: string, mode: AuthMode): Promise<JwtValidationResult> {
  const trimmed = token.trim();
  if (!trimmed) {
    return { ok: false, code: "JWT_MISSING", message: "Missing JWT token" };
  }

  const parts = trimmed.split(".");
  if (parts.length !== 3) {
    return { ok: false, code: "JWT_FORMAT", message: "Invalid JWT format" };
  }

  let header: JwtHeader;
  let claims: JwtClaims;
  try {
    header = JSON.parse(decodeBase64UrlToText(parts[0])) as JwtHeader;
    claims = JSON.parse(decodeBase64UrlToText(parts[1])) as JwtClaims;
  } catch {
    return { ok: false, code: "JWT_PARSE", message: "Failed to parse JWT payload" };
  }

  const algorithm = String(header.alg ?? "").trim().toUpperCase();
  const signingInput = `${parts[0]}.${parts[1]}`;
  const signatureBytes = decodeBase64UrlToBytes(parts[2]);
  const config = getEnterpriseConfig();
  let signatureValid = false;

  if (mode === "jwt-hs256") {
    if (algorithm !== "HS256" || !config.auth.jwtHs256Secret) {
      return {
        ok: false,
        code: "JWT_ALGORITHM",
        message: "JWT algorithm or HMAC secret is invalid"
      };
    }
    signatureValid = await verifyHs256(signingInput, signatureBytes, config.auth.jwtHs256Secret);
  } else if (mode === "jwt-rs256" || mode === "oidc") {
    if (algorithm !== "RS256") {
      return {
        ok: false,
        code: "JWT_ALGORITHM",
        message: "JWT algorithm is invalid for RS256/OIDC mode"
      };
    }
    const jwks = parseJwks(config.auth.jwtJwksJson);
    const jwk = pickRsaJwk(jwks, typeof header.kid === "string" ? header.kid : undefined);
    if (jwk) {
      signatureValid = await verifyRs256WithJwk(signingInput, signatureBytes, jwk);
    } else if (config.auth.jwtPublicKeyPem) {
      signatureValid = await verifyRs256WithPem(signingInput, signatureBytes, config.auth.jwtPublicKeyPem);
    } else {
      return {
        ok: false,
        code: "JWT_KEY_MISSING",
        message: "No RS256 verification key configured (JWKS or PEM required)"
      };
    }
  } else {
    return {
      ok: false,
      code: "JWT_MODE_INVALID",
      message: `Auth mode ${mode} does not use JWT validation`
    };
  }

  if (!signatureValid) {
    return {
      ok: false,
      code: "JWT_SIGNATURE",
      message: "JWT signature verification failed"
    };
  }

  const claimError = validateClaims(claims, mode);
  if (claimError) {
    return claimError;
  }

  return {
    ok: true,
    header,
    claims: {
      ...claims,
      roles: extractRoles(claims)
    }
  };
}

export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader) {
    return null;
  }
  const [scheme, token] = authHeader.split(/\s+/, 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }
  return token.trim() || null;
}

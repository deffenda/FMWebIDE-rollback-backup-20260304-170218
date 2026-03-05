import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, generateKeyPairSync, createSign } from "node:crypto";
import { resetEnterpriseConfigForTests } from "../enterprise-config.ts";
import { validateJwt } from "./jwt.ts";
import { validateCsrfRequest } from "./csrf.ts";
import { canPerformAction, inferActionFromRoute } from "./authorization.ts";
import { guardApiRequest } from "./request-context.ts";
import { checkRateLimit, resetRateLimiterForTests } from "./rate-limit.ts";

function b64url(input: Buffer | string): string {
  const raw = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return raw.toString("base64url");
}

function makeHsToken(secret: string, payload: Record<string, unknown>): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify(payload));
  const signingInput = `${header}.${claims}`;
  const signature = createHmac("sha256", secret).update(signingInput).digest("base64url");
  return `${signingInput}.${signature}`;
}

function makeRsToken(
  privateKeyPem: string,
  payload: Record<string, unknown>,
  kid = "unit-test-key"
): string {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT", kid }));
  const claims = b64url(JSON.stringify(payload));
  const signingInput = `${header}.${claims}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(privateKeyPem).toString("base64url");
  return `${signingInput}.${signature}`;
}

test("jwt-hs256 validates and surfaces roles", async () => {
  process.env.WEBIDE_AUTH_MODE = "jwt-hs256";
  process.env.WEBIDE_JWT_HS256_SECRET = "unit-secret";
  process.env.WEBIDE_JWT_ISSUER = "unit-issuer";
  process.env.WEBIDE_JWT_AUDIENCE = "unit-aud";
  resetEnterpriseConfigForTests();

  const token = makeHsToken("unit-secret", {
    sub: "alice",
    iss: "unit-issuer",
    aud: "unit-aud",
    exp: Math.floor(Date.now() / 1000) + 60,
    roles: ["developer"]
  });

  const result = await validateJwt(token, "jwt-hs256");
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.claims.sub, "alice");
    assert.deepEqual(result.claims.roles, ["developer"]);
  }
});

test("jwt-rs256/oidc validates with jwks config", async () => {
  const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const publicJwk = keys.publicKey.export({ format: "jwk" }) as unknown as Record<string, unknown>;
  publicJwk.kid = "oidc-key";

  process.env.WEBIDE_AUTH_MODE = "oidc";
  process.env.WEBIDE_JWT_ISSUER = "https://issuer.example";
  process.env.WEBIDE_JWT_AUDIENCE = "fm-web-ide";
  process.env.WEBIDE_OIDC_JWKS_JSON = JSON.stringify({ keys: [publicJwk] });
  resetEnterpriseConfigForTests();

  const token = makeRsToken(
    keys.privateKey.export({ format: "pem", type: "pkcs1" }).toString(),
    {
      sub: "bob",
      iss: "https://issuer.example",
      aud: "fm-web-ide",
      exp: Math.floor(Date.now() / 1000) + 60,
      roles: ["readonly"]
    },
    "oidc-key"
  );
  const result = await validateJwt(token, "oidc");
  assert.equal(result.ok, true);
});

test("csrf rejects mismatched token", () => {
  process.env.WEBIDE_CSRF_ENABLED = "true";
  resetEnterpriseConfigForTests();

  const request = new Request("http://localhost/api/fm/records", {
    method: "PATCH",
    headers: {
      cookie: "webide_csrf=abc123",
      "x-csrf-token": "not-the-same"
    }
  });

  const result = validateCsrfRequest(request);
  assert.equal(result.ok, false);
});

test("authorization policy gates route actions", () => {
  assert.equal(canPerformAction(["developer"], "record:write"), true);
  assert.equal(canPerformAction(["readonly"], "record:write"), false);
  assert.equal(inferActionFromRoute("/api/fm/records", "PATCH"), "record:write");
  assert.equal(inferActionFromRoute("/api/workspaces/import", "POST"), "workspace:import");
});

test("guardApiRequest denies unauthorized role", async () => {
  process.env.WEBIDE_AUTH_MODE = "trusted-header";
  process.env.WEBIDE_CSRF_ENABLED = "false";
  resetEnterpriseConfigForTests();

  const request = new Request("http://localhost/api/fm/records", {
    method: "DELETE",
    headers: {
      "x-webide-auth-user": "tester",
      "x-webide-auth-name": "Tester",
      "x-webide-auth-roles": "readonly",
      "x-correlation-id": "corr-1"
    }
  });

  const result = await guardApiRequest(request, "record:delete");
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.response.status, 403);
  }
});

test("rate limiter throttles excess requests", () => {
  resetRateLimiterForTests();
  const key = "127.0.0.1::/api/fm/records";
  const first = checkRateLimit(key, 2, 1_000);
  const second = checkRateLimit(key, 2, 1_000);
  const third = checkRateLimit(key, 2, 1_000);
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(third.ok, false);
});

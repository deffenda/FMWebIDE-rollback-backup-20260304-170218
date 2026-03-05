import test from "node:test";
import assert from "node:assert/strict";
import { getEnterpriseConfig, resetEnterpriseConfigForTests } from "./enterprise-config.ts";

test("enterprise config defaults to DEV profile in non-production", () => {
  delete process.env.WEBIDE_ENV_PROFILE;
  delete process.env.NODE_ENV;
  resetEnterpriseConfigForTests();
  const config = getEnterpriseConfig();
  assert.equal(config.profile, "DEV");
});

test("enterprise config supports explicit PROD profile and strict defaults", () => {
  process.env.WEBIDE_ENV_PROFILE = "PROD";
  delete process.env.WEBIDE_RATE_LIMIT_ENABLED;
  delete process.env.WEBIDE_CSRF_ENABLED;
  resetEnterpriseConfigForTests();
  const config = getEnterpriseConfig();
  assert.equal(config.profile, "PROD");
  assert.equal(config.rateLimit.enabled, true);
  assert.equal(config.csrf.enabled, true);
});

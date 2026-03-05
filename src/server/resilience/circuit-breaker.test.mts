import test from "node:test";
import assert from "node:assert/strict";
import { resetEnterpriseConfigForTests } from "../enterprise-config.ts";
import {
  assertCircuitClosed,
  circuitKey,
  recordCircuitFailure,
  recordCircuitSuccess,
  resetCircuitBreakerForTests
} from "./circuit-breaker.ts";

test("circuit breaker opens after threshold failures and closes after success reset", () => {
  process.env.WEBIDE_CIRCUIT_BREAKER_ENABLED = "true";
  process.env.WEBIDE_CIRCUIT_BREAKER_FAILURE_THRESHOLD = "2";
  process.env.WEBIDE_CIRCUIT_BREAKER_COOLDOWN_MS = "1000";
  resetEnterpriseConfigForTests();
  resetCircuitBreakerForTests();

  const key = circuitKey("https://fm.local", "Assets");
  assert.doesNotThrow(() => assertCircuitClosed(key));
  recordCircuitFailure(key);
  assert.doesNotThrow(() => assertCircuitClosed(key));
  recordCircuitFailure(key);
  assert.throws(() => assertCircuitClosed(key));
  recordCircuitSuccess(key);
  assert.doesNotThrow(() => assertCircuitClosed(key));
});

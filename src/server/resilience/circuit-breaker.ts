import { getEnterpriseConfig } from "../enterprise-config.ts";

type CircuitState = {
  failures: number;
  openedAt?: number;
};

const circuits = new Map<string, CircuitState>();

export class CircuitOpenError extends Error {
  readonly retryAfterMs: number;
  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = "CircuitOpenError";
    this.retryAfterMs = retryAfterMs;
  }
}

export function circuitKey(host: string, database: string): string {
  return `${host.trim().toLowerCase()}::${database.trim().toLowerCase()}`;
}

export function assertCircuitClosed(key: string): void {
  const config = getEnterpriseConfig();
  if (!config.resilience.circuitBreakerEnabled) {
    return;
  }
  const state = circuits.get(key);
  if (!state?.openedAt) {
    return;
  }
  const elapsed = Date.now() - state.openedAt;
  if (elapsed >= config.resilience.cooldownMs) {
    circuits.delete(key);
    return;
  }
  throw new CircuitOpenError(
    `Circuit breaker open for ${key}; retry later`,
    Math.max(0, config.resilience.cooldownMs - elapsed)
  );
}

export function recordCircuitSuccess(key: string): void {
  circuits.delete(key);
}

export function recordCircuitFailure(key: string): void {
  const config = getEnterpriseConfig();
  if (!config.resilience.circuitBreakerEnabled) {
    return;
  }
  const state = circuits.get(key) ?? { failures: 0 };
  state.failures += 1;
  if (state.failures >= config.resilience.failureThreshold) {
    state.openedAt = Date.now();
  }
  circuits.set(key, state);
}

export function getCircuitDiagnostics(): Array<{
  key: string;
  failures: number;
  open: boolean;
  retryAfterMs: number;
}> {
  const config = getEnterpriseConfig();
  const now = Date.now();
  return [...circuits.entries()].map(([key, state]) => {
    const retryAfterMs = state.openedAt
      ? Math.max(0, state.openedAt + config.resilience.cooldownMs - now)
      : 0;
    return {
      key,
      failures: state.failures,
      open: Boolean(state.openedAt && retryAfterMs > 0),
      retryAfterMs
    };
  });
}

export function resetCircuitBreakerForTests(): void {
  circuits.clear();
}

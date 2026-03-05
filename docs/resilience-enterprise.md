# Enterprise Resilience (Phase 9)

Phase 9 introduces API edge throttling and backend circuit-breaker protections.

## Rate limiting

Module:
- `/Users/deffenda/Code/FMWebIDE/src/server/security/rate-limit.ts`

Middleware integration:
- `/Users/deffenda/Code/FMWebIDE/middleware.ts`

Config:
- `WEBIDE_RATE_LIMIT_ENABLED`
- `WEBIDE_RATE_LIMIT_WINDOW_MS`
- `WEBIDE_RATE_LIMIT_MAX_REQUESTS`

Behavior:
- Applies to `/api/*` requests.
- Returns `429` with `Retry-After` when exceeded.

## Circuit breaker for FileMaker backend

Module:
- `/Users/deffenda/Code/FMWebIDE/src/server/resilience/circuit-breaker.ts`

FileMaker client integration:
- `/Users/deffenda/Code/FMWebIDE/src/server/filemaker-client.ts`

Config:
- `WEBIDE_CIRCUIT_BREAKER_ENABLED`
- `WEBIDE_CIRCUIT_BREAKER_FAILURE_THRESHOLD`
- `WEBIDE_CIRCUIT_BREAKER_COOLDOWN_MS`

Behavior:
- Tracks repeated failures per `host::database`.
- Opens circuit after threshold and blocks additional calls during cooldown.
- Resets on successful calls.

Diagnostics:
- Exposed in admin metrics endpoint (`/api/admin/metrics`).

## Test coverage

Files:
- `/Users/deffenda/Code/FMWebIDE/src/server/security/security-hardening.test.mts`
- `/Users/deffenda/Code/FMWebIDE/src/server/resilience/circuit-breaker.test.mts`

Run:
```bash
npm run test:security
```

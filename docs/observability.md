# Observability (Phase 9)

## Overview

Phase 9 adds foundational observability:
- structured JSON logs
- correlation IDs
- route metrics aggregation
- diagnostics endpoints

Core module:
- `/Users/deffenda/Code/FMWebIDE/src/server/observability.ts`

## Correlation IDs

Middleware behavior:
- Creates/propagates `x-correlation-id` per request.
- Returns correlation id in API responses where guard/route emits it.

## Structured logs

`logStructured(level, event, payload)` writes JSON logs when enabled.

Config:
- `WEBIDE_STRUCTURED_LOGS` (default true in TEST/PROD)

## Route metrics

`recordRouteMetric` captures:
- route key (`METHOD path`)
- total count
- errors
- average duration
- last status and last duration

Routes can be wrapped with:
- `withRouteMetric(request, handler)`

## Admin metrics endpoint

Endpoint:
- `GET /api/admin/metrics`

Includes:
- route metrics snapshot
- circuit breaker diagnostics
- session diagnostics (redacted)

## Debug and security posture

Production-safe diagnostics:
- no secret values are emitted.
- only capability/health/metric metadata exposed.

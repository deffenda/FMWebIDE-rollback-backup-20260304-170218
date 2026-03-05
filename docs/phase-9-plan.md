# Phase 9 Plan: Enterprise Hardening and Operational Readiness

Date: 2026-03-01

## Current security posture summary

What exists now:
- Basic auth gate:
  - `/Users/deffenda/Code/FMWebIDE/middleware.ts`
  - Supports `WEBIDE_AUTH_MODE=trusted-header` with a single trusted identity header check.
- Workspace and runtime privilege concepts (functional/runtime-level):
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-capabilities.ts`
  - Used primarily for UI/runtime gating in browse mode, not full API authorization enforcement.
- Multi-file routing guardrails:
  - `/Users/deffenda/Code/FMWebIDE/src/server/workspace-multifile.ts`
  - Provides actionable routing errors for missing files/layout mappings.
- Server-side FileMaker token cache:
  - `/Users/deffenda/Code/FMWebIDE/src/server/filemaker-client.ts`
  - Tokens are server-side only.

Key posture gaps:
- No centralized JWT/OIDC validation layer.
- No CSRF protection on mutating API routes.
- No unified server-side authorization policy enforcement per route/action.
- No structured audit logging pipeline.
- No environment profile governance (DEV/TEST/PROD).
- No health/metrics/admin observability endpoints.
- No request correlation IDs and structured application logs.
- No rate limiting or circuit-breaker safeguards.
- No deployment automation assets (`Dockerfile`, `docker-compose`, CI workflow) in-repo.

## Attack surface inventory

Primary surfaces:
- API routes under:
  - `/Users/deffenda/Code/FMWebIDE/app/api/fm/*`
  - `/Users/deffenda/Code/FMWebIDE/app/api/layouts/*`
  - `/Users/deffenda/Code/FMWebIDE/app/api/workspaces/*`
- DDR import upload surface:
  - `/Users/deffenda/Code/FMWebIDE/app/api/workspaces/import/route.ts`
- Workspace management and solution deletion:
  - `/Users/deffenda/Code/FMWebIDE/app/api/workspaces/route.ts`
  - `/Users/deffenda/Code/FMWebIDE/app/api/workspaces/solution/route.ts`
- Script execution bridge:
  - `/Users/deffenda/Code/FMWebIDE/app/api/fm/scripts/route.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/filemaker-client.ts` (`runScript`)
- Cross-file routing debug exposure:
  - `/Users/deffenda/Code/FMWebIDE/app/api/fm/workspace-routing/route.ts`
- Container upload and retrieval:
  - `/Users/deffenda/Code/FMWebIDE/app/api/fm/container/route.ts`
  - `/Users/deffenda/Code/FMWebIDE/app/api/fm/container/upload/route.ts`

Threat categories:
- Unauthorized API access / privilege escalation.
- CSRF on mutating routes.
- XSS/CSP weaknesses from dynamic content and calc-driven rendering.
- Credential/secret leakage through config APIs or logs.
- High request volume causing FM backend saturation.
- Insufficient operational visibility for incident response and compliance.

## Enterprise requirements checklist (Phase 9)

- [ ] Centralized security config and environment profile governance.
- [ ] OIDC/JWT-capable auth (plus existing trusted-header mode).
- [ ] Server-side authorization checks at API layer.
- [ ] CSRF tokens for mutating requests (profile-aware enforcement).
- [ ] Strict security headers (CSP, frame protections, referrer policy).
- [ ] Structured audit log events with retention policy.
- [ ] Per-user audit export endpoint.
- [ ] Health endpoint and admin metrics endpoint.
- [ ] Request correlation IDs and structured request logs.
- [ ] Rate limiting at API boundary.
- [ ] Circuit breaker/backoff path for FileMaker API instability.
- [ ] Docker + compose + CI sample for deployment automation.
- [ ] Documentation updates for security/deployment/ops.

## P0 / P1 / P2 roadmap

### P0 (must implement)

1. Security foundation modules
- Deliverables:
  - Central config loader with profile defaults and safe validation.
  - Auth validator (`trusted-header`, `jwt-hs256`, `jwt-rs256/oidc jwks env`).
  - Session manager with TTL/rolling refresh.
  - Authorization policy module and route helpers.
  - CSRF module + bootstrap endpoint.
- Acceptance:
  - Mutating API routes can enforce auth + CSRF + action authorization.
  - No secrets are emitted in API responses/logs.
- Tests:
  - Auth token validation tests.
  - Authorization denial tests.
  - CSRF rejection tests.

2. Audit logging + compliance baseline
- Deliverables:
  - Structured append-only audit log writer (JSON lines).
  - Event taxonomy: auth, layout access, script execution, CRUD, routing.
  - Retention policy pruning.
  - Export endpoint for per-user trail.
- Acceptance:
  - Core sensitive operations create auditable events.
- Tests:
  - Event write + redaction tests.
  - Retention pruning tests.

3. Deployment/environment hardening
- Deliverables:
  - Environment profile support DEV/TEST/PROD.
  - Health endpoint.
  - Graceful shutdown state.
  - Dockerfile + docker-compose + CI workflow sample.
- Acceptance:
  - Production profile has hardened defaults.
  - Health endpoint reflects shutdown state.
- Tests:
  - Config profile tests.
  - Health endpoint logic tests.

### P1 (high-value follow-up)

1. Optional tenant isolation
- Deliverables:
  - Tenant context in request auth.
  - Workspace filtering by tenant (feature-flagged).
- Acceptance:
  - Cross-tenant workspace data is blocked by policy.
- Tests:
  - Tenant isolation unit tests.

2. Observability
- Deliverables:
  - Correlation IDs in middleware.
  - JSON request logging and timing.
  - Admin metrics endpoint.
- Acceptance:
  - Diagnostics can trace request-to-request across API stack.
- Tests:
  - Metrics aggregation tests.

### P2 (resilience hardening)

1. Rate limiting + circuit breaker/backoff
- Deliverables:
  - API rate limiter middleware.
  - FileMaker client circuit breaker with cooldown.
- Acceptance:
  - Burst abuse is throttled.
  - Repeated FM failures do not continuously hammer backend.
- Tests:
  - Rate limit tests.
  - Circuit breaker state transition tests.

## Backward compatibility risks

- Enabling strict auth/CSRF in existing local flows can break current dev UX.
  - Mitigation: profile-based defaults (`DEV` relaxed, `PROD` strict) and explicit feature flags.
- Authorization policy could block existing scripts/layout tooling if roles are missing.
  - Mitigation: default permissive role mapping in DEV and clear denial messages.
- CSP hardening can break current inline/dynamic UI behavior.
  - Mitigation: phase-in with configurable policy and report-oriented defaults first.
- Rate limits could interfere with high-frequency runtime polling/debug.
  - Mitigation: profile-aware thresholds and route-level exemptions where needed.

## Migration strategy

1. Add security modules with feature flags and profile-aware defaults.
2. Wire route-level guards incrementally on highest-risk endpoints first (`/api/fm/records`, `/api/fm/scripts`, `/api/layouts`, `/api/workspaces/import`), then propagate.
3. Add audit events for critical operations first (auth + CRUD + script + layout access), then broaden.
4. Add observability endpoints and docs.
5. Validate with new security/regression tests in CI and local `npm test`.
6. Rollout guidance:
  - DEV: auth optional, csrf optional, relaxed rate limits.
  - TEST: auth on, csrf on, moderate limits.
  - PROD: strict auth+csrf+csp+rate limit, audit retention policy enabled.

# Security Audit: Phase 9

Date: 2026-03-01

## Attack surface checklist

Reviewed route groups:
- `/api/fm/*` (records/find/scripts/layouts/fields/value-lists/container/routing)
- `/api/layouts/*`
- `/api/workspaces/*`
- `/api/auth/*`
- `/api/admin/*`

Reviewed high-risk flows:
- script execution
- record CRUD
- workspace import/delete
- cross-file routing diagnostics
- container upload and fetch

## Security controls audit status

1. Authentication
- Status: Implemented
- Controls:
  - trusted-header mode
  - JWT HS256 and RS256/OIDC validation
  - server session TTL/refresh
  - auth cookies are server-managed

2. Authorization
- Status: Implemented (core routes)
- Controls:
  - role/action policy map
  - route guard helper
  - middleware action checks for `/api/*`

3. CSRF
- Status: Implemented
- Controls:
  - token cookie + header validation
  - profile-aware enforcement
  - bootstrap endpoint `/api/auth/csrf`

4. XSS/CSP and security headers
- Status: Implemented (baseline)
- Controls:
  - CSP
  - frame and MIME protections
  - permissions/referrer/cross-origin headers

5. Audit logging
- Status: Implemented
- Controls:
  - structured audit events
  - retention and redaction
  - admin export endpoint

6. Observability
- Status: Implemented (baseline)
- Controls:
  - correlation IDs
  - route metrics
  - admin metrics/config endpoints

7. Resilience
- Status: Implemented (baseline)
- Controls:
  - API rate limiter
  - FM circuit breaker

## Endpoint review summary

- Guarded by auth/authorization helper:
  - `app/api/fm/records/route.ts`
  - `app/api/fm/scripts/route.ts`
  - `app/api/fm/find/route.ts`
  - `app/api/fm/fields/route.ts`
  - `app/api/fm/layouts/route.ts`
  - `app/api/fm/value-lists/route.ts`
  - `app/api/fm/styles/route.ts`
  - `app/api/fm/relationships/route.ts`
  - `app/api/fm/script-workspace/route.ts`
  - `app/api/fm/container/route.ts`
  - `app/api/fm/container/upload/route.ts`
  - `app/api/fm/workspace-routing/route.ts`
  - `app/api/layouts/route.ts`
  - `app/api/layouts/[id]/route.ts`
  - `app/api/layouts/by-fm-layout/route.ts`
  - `app/api/workspaces/route.ts`
  - `app/api/workspaces/[workspaceId]/route.ts`
  - `app/api/workspaces/[workspaceId]/saved-searches/route.ts`
  - `app/api/workspaces/[workspaceId]/view-configs/route.ts`
  - `app/api/workspaces/import/route.ts`
  - `app/api/workspaces/solution/route.ts`
  - `app/api/admin/metrics/route.ts`
  - `app/api/admin/audit/route.ts`
  - `app/api/admin/config/route.ts`

## Feature flags / profile controls documented

Key profile/env controls:
- `WEBIDE_ENV_PROFILE`
- `WEBIDE_AUTH_MODE`
- `WEBIDE_JWT_*`
- `WEBIDE_CSRF_*`
- `WEBIDE_AUDIT_*`
- `WEBIDE_RATE_LIMIT_*`
- `WEBIDE_CIRCUIT_BREAKER_*`
- `WEBIDE_MULTI_TENANT_ENABLED`

## Unsafe pattern elimination check

- Client-side secret exposure:
  - Improved: workspace endpoints now redact username (password never returned).
- Direct credential use in browser:
  - FM auth tokens remain server-only.
- Missing route auth:
  - Core enterprise-sensitive routes now guarded.

## Remaining risks

- OIDC refresh-token exchange flow is not implemented.
- Full tenant workspace hard partitioning remains partial.
- Some legacy/auxiliary routes may still rely primarily on middleware-level policy and should be migrated to explicit per-action guards over time.

## Security test summary

Security-focused tests:
- `src/server/security/security-hardening.test.mts`
- `src/server/enterprise-config.test.mts`
- `src/server/audit-log.test.mts`
- `src/server/resilience/circuit-breaker.test.mts`

Command:
```bash
npm run test:security
```

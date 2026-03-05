# Security Hardening (Phase 9)

## Scope

Phase 9 introduces enterprise security controls across authentication, authorization, CSRF, headers, and runtime config governance.

Primary implementation files:
- `/Users/deffenda/Code/FMWebIDE/src/server/enterprise-config.ts`
- `/Users/deffenda/Code/FMWebIDE/src/server/security/jwt.ts`
- `/Users/deffenda/Code/FMWebIDE/src/server/security/session-store.ts`
- `/Users/deffenda/Code/FMWebIDE/src/server/security/csrf.ts`
- `/Users/deffenda/Code/FMWebIDE/src/server/security/authorization.ts`
- `/Users/deffenda/Code/FMWebIDE/src/server/security/request-context.ts`
- `/Users/deffenda/Code/FMWebIDE/middleware.ts`

## Authentication modes

Configured by `WEBIDE_AUTH_MODE`:
- `disabled`
- `trusted-header`
- `jwt-hs256`
- `jwt-rs256`
- `oidc` (RS256 JWT + issuer/audience checks + JWKS support)

JWT/OIDC validation:
- Signature verification:
  - HS256 secret (`WEBIDE_JWT_HS256_SECRET`)
  - RS256 key from:
    - `WEBIDE_JWT_JWKS_JSON` / `WEBIDE_OIDC_JWKS_JSON`
    - or `WEBIDE_JWT_PUBLIC_KEY_PEM`
- Claim checks:
  - `iss` against `WEBIDE_JWT_ISSUER` (if set)
  - `aud` against `WEBIDE_JWT_AUDIENCE` (if set)
  - `exp` / `nbf`

Session handling:
- Server-side session map with rolling TTL.
- Cookie: `WEBIDE_SESSION_COOKIE_NAME` (default `webide_session`).
- Session refresh window controlled by:
  - `WEBIDE_SESSION_TTL_SECONDS`
  - `WEBIDE_SESSION_REFRESH_WINDOW_SECONDS`

## Authorization policy

Role-based action checks are enforced server-side:
- Action mapping:
  - `/api/fm/records` -> `record:*`
  - `/api/fm/scripts` -> `script:*`
  - `/api/layouts` -> `layout:*`
  - `/api/workspaces/*` -> `workspace:*`
  - `/api/admin/*` -> `admin:*`
- Role matrix is defined in:
  - `/Users/deffenda/Code/FMWebIDE/src/server/security/authorization.ts`

Route-level guards:
- `guardApiRequest(request, action)` is used in high-risk APIs.
- Returns 401/403 with guidance and correlation id.

## CSRF protection

CSRF implementation:
- Double-submit token style:
  - cookie: `WEBIDE_CSRF_COOKIE_NAME` (default `webide_csrf`)
  - header: `WEBIDE_CSRF_HEADER_NAME` (default `x-csrf-token`)
- Validation enabled by profile:
  - default `true` in `PROD`
  - default `false` in `DEV/TEST` (can be overridden by env)

Bootstrap endpoint:
- `GET /api/auth/csrf`
- Issues/refreshes token and cookie.

## Security headers (CSP + browser hardening)

Middleware applies:
- `Content-Security-Policy` (`WEBIDE_CSP` override supported)
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: same-origin`
- `Permissions-Policy`
- `Cross-Origin-Opener-Policy`
- `Cross-Origin-Resource-Policy`

## Secure configuration governance

All enterprise controls are centralized in:
- `/Users/deffenda/Code/FMWebIDE/src/server/enterprise-config.ts`

Profiles:
- `WEBIDE_ENV_PROFILE=DEV|TEST|PROD`

Admin safe config view:
- `GET /api/admin/config`
- returns redacted capability-oriented settings, not secrets.

## Testing

Security tests:
- `/Users/deffenda/Code/FMWebIDE/src/server/security/security-hardening.test.mts`
- `/Users/deffenda/Code/FMWebIDE/src/server/enterprise-config.test.mts`

Run:
```bash
npm run test:security
```

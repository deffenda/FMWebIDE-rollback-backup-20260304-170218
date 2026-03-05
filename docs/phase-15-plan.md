# Phase 15 Plan: App-Level Governance, Versioning, Admin UX, Stability, and Polish

Date: 2026-03-02

## A) Current State Inventory

### Workspace storage model (snapshots, diffs, migrations)
- Workspace core config and multi-file routing:
  - `/Users/deffenda/Code/FMWebIDE/src/server/workspace-context.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/workspace-multifile.ts`
- Schema snapshots:
  - `/Users/deffenda/Code/FMWebIDE/src/server/schema-snapshot-storage.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/schemaSnapshot/*`
- Schema diff / impact / migrations:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/schemaDiff/*`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/impactAnalysis/*`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/migrations/*`
  - `/Users/deffenda/Code/FMWebIDE/src/server/migration-plan-storage.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/workspace-schema-storage.ts`
- Saved finds/found sets:
  - `/Users/deffenda/Code/FMWebIDE/src/server/saved-search-storage.ts`

### Audit logging (Phase 9)
- Audit append/read + redaction:
  - `/Users/deffenda/Code/FMWebIDE/src/server/audit-log.ts`
- Audit API:
  - `/Users/deffenda/Code/FMWebIDE/app/api/admin/audit/route.ts`

### Developer tools (Phase 13)
- API:
  - `/Users/deffenda/Code/FMWebIDE/app/api/workspaces/[workspaceId]/developer-tools/route.ts`
- UI:
  - `/Users/deffenda/Code/FMWebIDE/components/developer-tools-panel.tsx`

### Feature flags / capabilities (Phases 11–12)
- Runtime feature flags:
  - `/Users/deffenda/Code/FMWebIDE/src/config/featureFlags.ts`
- App-layer capability registry:
  - `/Users/deffenda/Code/FMWebIDE/src/config/appLayerCapabilities.ts`

### Admin diagnostics
- Config, metrics, audit APIs:
  - `/Users/deffenda/Code/FMWebIDE/app/api/admin/config/route.ts`
  - `/Users/deffenda/Code/FMWebIDE/app/api/admin/metrics/route.ts`
  - `/Users/deffenda/Code/FMWebIDE/app/api/admin/audit/route.ts`
- Health endpoint:
  - `/Users/deffenda/Code/FMWebIDE/app/api/health/route.ts`

### Error handling boundaries
- Route guard + authorization/csrf:
  - `/Users/deffenda/Code/FMWebIDE/src/server/security/request-context.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/security/authorization.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/security/csrf.ts`
- App-layer errors:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/app-layer-errors.ts`
  - `/Users/deffenda/Code/FMWebIDE/components/app-layer-error-banner.tsx`

## B) Risks and Safety Gaps

1. No first-class workspace version checkpoints/rollback objects today.
2. Promotion workflow is not formalized (no env pointers or approval metadata).
3. Dangerous operations are guarded by coarse roles (`workspace:write`) but not app-governance-specific policies.
4. No central admin console endpoint aggregating workspace health/dependency state.
5. No safe-mode session toggle to disable plugins/experimental behavior after runtime crashes.
6. Capability docs are broad, but no consolidated governance/capability statement artifact for teams.

## C) Backlog

## P0

1. Workspace versioning + rollback
- Add version storage with checkpoints, rollback, and diff summary.
- Auto-checkpoint before migration apply and workspace destructive operations.
- Acceptance:
  - create/list/rollback versions via API.
  - rollback restores workspace config, app-layer config, saved-search config, schema overlay.
  - includes safety confirmation token for rollback call.

2. Change governance + publish/promote
- Add environment pointers (`dev`, `test`, `prod`) and release bundles.
- Add promotion approval policy (role-gated).
- Acceptance:
  - promote updates environment pointer only for permitted roles.
  - blocked when dependency health is failing.
  - rollback-promotion supported.

3. RBAC for app-layer governance
- Introduce governance role model:
  - `admin`, `developer`, `power-user`, `runtime-user`.
- Map roles to governance capabilities and enforce server-side on dangerous routes.
- Acceptance:
  - runtime-user blocked from migration apply/rollback/promote.
  - explicit 403 with guidance and audit event.

4. Admin console API + UI
- Add consolidated admin operations endpoint and modal screen.
- Acceptance:
  - exposes workspace/env/version/dependency status.
  - includes audit explorer and health summaries.
  - admin-only.

## P1

1. UX/accessibility polish for governance screens
- Standard dialog structure + keyboard handling + focus trap consistency.

2. Stability/recovery UX
- Global safe-mode support (disable plugins/experimental flags per session).
- Report issue bundle export.

## P2

1. Capability/flag hygiene
- Add consolidated capabilities statement with status and links.
- Remove or mark stale toggles.

## D) Test Plan

Add test suites:
- `npm run test:versioning`
- `npm run test:governance`
- `npm run test:admin-console`

Extend:
- `npm run test:app-layer`
- `npm run test:security`

Checklist output:
- `Phase 15 Governance Checklist` emitted by governance tests.


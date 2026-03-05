# FM Web IDE Testing Guide

## Prerequisites
- Node/npm installed.
- Dependencies installed: `npm install`.
- Optional live FileMaker config in `.env.local`:
  - `FILEMAKER_HOST`
  - `FILEMAKER_DATABASE`
  - `FILEMAKER_USERNAME`
  - `FILEMAKER_PASSWORD`

## Fast Local Checks
1. Type safety:
   - `npm run typecheck`
2. Lint:
   - `npm run lint`
3. Regression tests:
   - `npm test`
4. Runtime parity suite only:
   - `npm run test:runtime-parity`
5. Focused phase-2 parity suites:
  - `npm run test:tabs`
  - `npm run test:tab-order`
  - `npm run test:list-table-runtime`
  - `npm run test:triggers`
  - `npm run test:trigger-policy`
  - `npm run test:value-lists`
  - `npm run test:saved-searches`
  - `npm run test:privileges`
6. Multi-file workspace routing suite:
  - `npm run test:workspace-multifile`
7. Phase 8 advanced runtime suites:
  - `npm run test:summary-engine`
  - `npm run test:script-advanced`
  - `npm run test:transactions`
8. Phase 9 enterprise hardening suite:
  - `npm run test:security`
9. Phase 10 plugin SDK suite:
  - `npm run test:plugin-sdk`

## One-command Quality Gate
- Run all baseline checks plus production build:
  - `npm run quality`

This command runs:
1. `typecheck`
2. `lint`
3. `test`
4. `build`

## Integration Tests (Live FileMaker)
- Run:
  - `npm run test:fm-regression`

Notes:
- This suite targets real CRUD/portal/value-list/find flows against FileMaker.
- It skips when live FileMaker config is not available unless explicitly allowed.
- The suite now prints an end-of-run parity checklist summary.
- Current integration footer label: `FM Integration Parity Checklist v8`.

## Security Hardening Tests
- Run:
  - `npm run test:security`

Covers:
- enterprise config profile defaults and overrides
- JWT/OIDC validation behavior
- CSRF rejection behavior
- authorization denial paths
- audit log write/read path
- circuit breaker state transitions

## Multi-file Workspace Tests
- Run:
  - `npm run test:workspace-multifile`

Covers:
- workspace v1->v2 migration safety
- dependency graph routing resolution
- cross-file CRUD routing into mapped target DB/layout
- cross-file script routing into mapped target DB/layout
- per-database token cache + 401 re-auth behavior
- cross-file write guardrail errors (missing API layout mapping)

## Recommended Manual Smoke Matrix
Run these before releases:
1. Layout Mode:
   - place field/button/portal/web viewer/chart objects
   - save + reload layout
   - switch workspaces/layouts
2. Browse Mode:
   - first/prev/next/last/new/delete
   - inline field edit save
   - portal row edit/save
   - container open/upload/download flow
3. Find Mode:
   - create find, modify last find, perform find, cancel find
4. Table/List/Form views:
   - view switching
   - sort popover actions
   - value-list-backed controls display human-readable values

## Troubleshooting
- If runtime chunks/module errors occur in dev:
  - `npm run clean`
  - restart `npm run dev`
- If Data API requests fail:
  - verify host/database credentials
  - verify Data API enabled on FileMaker Server
  - verify layout/table context used by request is valid and writable

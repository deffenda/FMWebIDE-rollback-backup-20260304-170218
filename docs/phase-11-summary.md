# Phase 11 Summary: App Layer Parity

Date: 2026-03-01

## Delivered

### 1) App-layer audit and parity tracking
- Added full app-layer audit:
  - `/Users/deffenda/Code/FMWebIDE/docs/phase-11-app-layer-audit.md`
- Added parity matrix with `APP-###` tracking IDs:
  - `/Users/deffenda/Code/FMWebIDE/docs/app-layer-parity-matrix.md`

### 2) Centralized app-layer capability registry
- Added:
  - `/Users/deffenda/Code/FMWebIDE/src/config/appLayerCapabilities.ts`
- Registry includes:
  - capability key
  - status (`implemented` / `partial` / `missing` / `not-feasible`)
  - enable/disable
  - rationale
  - docs link to parity matrix
  - optional experimental gating
- Added dev override support (localStorage-based in Layout Mode capabilities modal).

### 3) Manage submenu parity routing
- Updated Layout Mode menubar/manage action routing in:
  - `/Users/deffenda/Code/FMWebIDE/components/layout-mode.tsx`
- File > Manage now includes first-class entries for:
  - Database
  - Security
  - Value Lists
  - Layouts
  - Scripts
  - External Data Sources
  - Containers
  - Custom Functions
  - Custom Menus
  - Themes
- All entries now pass through capability checks and show rationale UX when blocked.

### 4) App-layer manager shell
- Added unified manager shell sections in Layout Mode for all required manage entries.
- Added workspace file context selection and search/filter support for manager sections.
- Added persisted workspace app-layer configuration support via:
  - `/Users/deffenda/Code/FMWebIDE/src/server/app-layer-storage.ts`
  - `/Users/deffenda/Code/FMWebIDE/app/api/workspaces/[workspaceId]/app-layer/route.ts`

### 5) Graceful app-layer errors
- Added standardized app-layer error model:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/app-layer-errors.ts`
- Added reusable error banner:
  - `/Users/deffenda/Code/FMWebIDE/components/app-layer-error-banner.tsx`
- Added clearer unsupported/configuration guidance through blocked-capability modal and status text.

### 6) Regression output uplift
- Updated integration parity output in:
  - `/Users/deffenda/Code/FMWebIDE/src/server/filemaker-regression.test.mts`
- Added:
  - `FM Integration Parity Checklist v11`
  - `Parity Checklist App Layer` summary line

## Feature-Toggled / Limited by Design
- `APP-114 Recover`: disabled (`not-feasible`) in web runtime.
- `APP-113 Sharing`: disabled/limited to rationale (no live hosting mutation from client).
- `APP-106 External Data Sources`: registry/placeholder parity only (no ESS/ODBC runtime execution parity).
- `APP-110 Themes`: workspace theme management supported, native FileMaker theme import parity remains partial.
- `APP-102 Security`: read-only/summary parity; no live account/privilege-set mutation in FileMaker server.

## Tests Added / Expanded
- New/updated tests:
  - `/Users/deffenda/Code/FMWebIDE/src/config/appLayerCapabilities.test.mts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/app-layer-menu.test.mts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/app-layer-storage.test.mts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/filemaker-regression.test.mts` (app-layer checklist integration)
- Scripts:
  - `npm run test:app-layer`
  - `npm run test:fm-regression`

## Remaining Gaps / Phase 12 Suggestions
1. Add dedicated app-layer routes/pages (`/manage/...`) for deep-linking and direct QA automation outside Layout Mode modal state.
2. Expand Manage Security with role/privilege graph and import from DDR privilege metadata.
3. Add manager-level dependency linting:
   - missing external-file dependencies
   - missing API layout mapping by TO
   - broken script/layout/menu references.
4. Add cross-mode app-layer panel reuse in Browse/Preview to improve parity discoverability.
5. Add richer CI assertions for app-layer disabled-state tooltips and rationale links via browser integration tests.

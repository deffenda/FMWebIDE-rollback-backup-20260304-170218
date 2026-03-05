# FM Web IDE (MVP Foundation)

A web-based IDE for FileMaker developers with two modes:

- `Layout Mode`: visual canvas editor that saves layout metadata as JSON.
- `Browse Mode`: runtime form renderer that reads the same layout JSON and works with live records.

This repository is a practical MVP scaffold aligned to the product spec.

## Tech Stack

- Next.js App Router
- TypeScript
- React
- Server route handlers for FileMaker Data API proxying
- JSON layout persistence (`data/layouts/*.json`)
- Local mock record storage fallback (`data/mock-records/*.json`)

## Audit + Parity Generator

The repository includes an automated baseline/parity audit pipeline that discovers the current codebase and generates a deterministic audit package under `docs/audit/`.

- Run locally:
  - `npm run audit`
- CI validation mode:
  - `npm run audit:ci`

Generated artifacts:
- `docs/audit/FMWebIDE_Baseline_Report.md`
- `docs/audit/Parity_Matrix_FileMaker_vs_FMWebIDE.csv`
- `docs/audit/Parity_Matrix_FileMaker_vs_FMWebIDE.json`
- `docs/audit/Parity_Matrix_FileMaker_vs_FMWebIDE.schema.json`
- `docs/audit/Backlog_Parity_Improvements.md` (75+ items)
- `docs/audit/Top_20_Parity_Wins_This_Week.md`
- `docs/audit/Test_Plan_Parity.md`
- `docs/audit/issues/*` (Top 50 local issue markdowns when GitHub issue creation is not configured)

Pipeline sources:
- Runner: `scripts/audit/run-audit.ts`
- Extractors/generators: `scripts/audit/extractors/*`, `scripts/audit/generators/*`

Phase 1 diagnostics endpoint/page:
- `GET /api/admin/parity`
- `/diagnostics/parity`

Phase 2 geometry diagnostics:
- Runtime route supports viewport-driven geometry and zoom:
  - `/layouts/<layoutId>/runtime?workspace=<workspaceId>&diag=1`
- Anchor override escape hatch:
  - `data/anchorsOverride.json`

### UI Native Parity Tests

UI behavior parity smoke tests live under `tests/ui/native-parity/` and are executed with:

- `npm run test:ui`
- `npm run test:ui:headed`
- `npm run test:ui:trace`

Artifacts and coverage report:
- `docs/audit/UI_Command_Coverage_Report.md`
- `test-results/` and `playwright-report/` (when Playwright is available)

### UI Parity Execution Engine

Phase 3 adds a parity execution runner that consumes UI test output, computes a parity score, and enforces regression gates.

- Run parity gate:
  - `npm run parity:ui`
- Report only (no regression failure):
  - `npm run parity:ui:report`
- Update parity baseline (explicit opt-in):
  - `ALLOW_PARITY_BASELINE_UPDATE=true npm run parity:ui:update-baseline`

Generated parity artifacts:
- `docs/audit/Parity_UI_Scorecard.md`
- `docs/audit/Parity_UI_Failure_Triage.md`
- `docs/audit/Parity_UI_Backlog_Auto.md`
- `docs/audit/Parity_UI_Coverage_Map.md`
- `docs/audit/Parity_UI_Flakes.md`
- `docs/audit/Parity_UI_Baseline.json`

## Implemented MVP Scope

### Layout Mode

- Drag/drop component creation: `field`, `label`, `button`, `webViewer`
- Canvas positioning with grid snap
- Move + resize interactions
- Layer (`z`) editing
- Inspector for:
  - layout metadata
  - field binding
  - control type
  - button script binding
  - web viewer URL template
- Save/load layout JSON via API

### Browse Mode

- Dynamic renderer from layout JSON
- Record navigation: first/prev/next/last
- New / Delete / Edit / Save / Cancel
- Field editing
- Script execution endpoint (`runScript`)
- Web viewer URL templating from current record

### Backend/API

- Server-side layout APIs:
  - `GET /api/layouts`
  - `POST /api/layouts`
  - `GET /api/layouts/:id`
  - `PUT /api/layouts/:id`
- Server-side FileMaker APIs:
  - `GET /api/fm/layouts`
  - `GET /api/fm/fields?tableOccurrence=...`
  - `GET /api/fm/records?tableOccurrence=...`
  - `POST /api/fm/find`
  - `POST /api/fm/records`
  - `PATCH /api/fm/records`
  - `DELETE /api/fm/records`
  - `POST /api/fm/scripts`
  - `GET /api/fm/workspace-routing`
- FileMaker token login lifecycle handled server-side
- Automatic mock-mode fallback when FileMaker env vars are not set

## Phase 2 Runtime Parity

### Phase 1 foundations retained
- FMCalc-lite evaluation for:
  - `hideObjectWhen`
  - tooltips
  - portal filter calculations
- Edit-session lifecycle (`begin/stage/commit/revert`) with dirty prompts.
- Portal active-row/filter/sort/reset foundations.

### Phase 2 additions
- Repeating fields:
  - stacked browse controls in form mode
  - compact rendering in list/table
  - per-repetition edit-session staging
- Tab runtime:
  - interactive switching
  - calc-based labels/visibility
  - active-tab URL state (`tabs=...`)
- Trigger system expansion:
  - layout/mode/record/object trigger markers
  - `OnRecordCommitRequest` veto support before commit
  - trigger history + outcomes in debug overlay
- Value-list runtime hardening:
  - scoped value-list cache utility
  - display/stored mapping improvements
- Privilege-aware runtime gating:
  - new runtime capabilities API
  - field/layout/portal action gating
  - mock role simulation (`mockRole` query param)
- Debug overlay enhancements (`?debugRuntime=1`):
  - active tabs
  - repeating dirty summary
  - trigger history with request/outcome status
  - value-list cache state
  - privilege role
  - copy debug snapshot action
- Minimal popover/card parity:
  - feature-flagged runtime popover/card window support
  - `NEXT_PUBLIC_RUNTIME_ENABLE_POPOVERS=1`
  - `NEXT_PUBLIC_RUNTIME_ENABLE_CARD_WINDOWS=1`

## Phase 3 Runtime Parity

### Runtime kernel foundations
- Added runtime kernel coordination layer:
  - found sets
  - windows/card windows
  - context stack
  - variable scopes (`$` / `$$`)
  - script run state + history
- Core modules:
  - `src/lib/runtime-kernel/kernel.ts`
  - `src/lib/runtime-kernel/foundset-store.ts`
  - `src/lib/runtime-kernel/window-manager.ts`
  - `src/lib/runtime-kernel/context-stack.ts`
  - `src/lib/runtime-kernel/variable-store.ts`
  - `src/lib/runtime-kernel/script-engine.ts`

### Runtime script support
- FM Script-lite subset executor (feature-flagged):
  - `NEXT_PUBLIC_RUNTIME_ENABLE_SCRIPT_ENGINE=1`
- Script workspace mapper for DDR/script-workspace payload:
  - `src/lib/runtime-kernel/script-workspace-mapper.ts`
- Browse mode attempts runtime script execution when enabled and mapped script steps are available, then falls back to server execution if runtime execution fails.

### Debug/runtime diagnostics
- `?debugRuntime=1` now includes kernel snapshot details:
  - window stack
  - found set pointers
  - context stack depth
  - active script run
  - variable scope summaries
- Copy Debug Snapshot includes `runtimeKernel` state snapshot.

### New runtime-kernel tests
- Added `npm run test:runtime-kernel`:
  - foundset-store
  - window-manager
  - variable-store
  - context-stack
  - script-workspace-mapper
  - script-engine
  - kernel integration

## Phase 4 Runtime Parity

### Find mode parity (P0)
- Added reusable find engine:
  - `src/lib/find-mode.ts`
- Added server find proxy route:
  - `app/api/fm/find/route.ts`
- Added Data API `_find` support and mock fallback in:
  - `src/server/filemaker-client.ts`
- Browse runtime now supports:
  - multi-request include/omit handling
  - constrain found set
  - extend found set
  - debug replay of last find payload

### Sort/group/subsummary parity (P0)
- Added deterministic reporting engine:
  - `src/lib/sort-reporting.ts`
- Browse table/list rendering now uses:
  - shared sort rules
  - grouped rows
  - leading/trailing/grand summary rows
  - summary operations: `count`, `sum`, `avg`, `min`, `max`

### Field engine parity (P0)
- Added centralized field behavior engine:
  - `src/lib/field-engine.ts`
- Added support for layout-model field metadata:
  - validation flags (`required`, strict type, range, pattern, calc)
  - auto-enter flags (create/modify timestamp + account, serial, calc)
- Browse runtime integrates field engine for:
  - create defaults (auto-enter on create)
  - commit-time validation
  - modify defaults (auto-enter on modify)

### Debug/runtime diagnostics
- `?debugRuntime=1` includes Phase 4 diagnostics:
  - find request/session summary
  - last find payload JSON
  - sort/group spec snapshot
  - field validation error summary
  - actions:
    - `Replay Find`
    - `Copy Parity Snapshot`

### Phase 4 tests
- Added unit suites:
  - `npm run test:find-mode`
  - `npm run test:sort-reporting`
  - `npm run test:field-engine`
- Expanded:
  - `npm run test:runtime-parity`
  - `npm run test:fm-regression` parity checklist (`v6`)

## Phase 5 Parity (Developer & Power-User Baseline)

### Tab order parity
- Added canonical layout-level tab order support with backward-compatible migration from legacy per-object numeric tab order.
- Layout mode Set Tab Order now edits canonical order with reorder helpers (move up/down, reverse, clear).
- Browse mode now enforces runtime tab traversal (`Tab`/`Shift+Tab`) using resolved tab order and skip logic for hidden/non-entry targets.

### Saved finds + saved found sets
- Added workspace-backed saved-search persistence:
  - `GET/PUT /api/workspaces/:workspaceId/saved-searches`
- Browse mode now hydrates/saves:
  - saved finds (criteria)
  - saved found sets (record-id snapshots)
- Added saved found set management actions:
  - save/open/rename/duplicate/delete/export JSON
- Added safe snapshot cap handling for large found sets.

### Regression updates
- Added:
  - `npm run test:tab-order`
  - `npm run test:saved-searches`
- Expanded FileMaker integration regression output:
  - `FM Integration Parity Checklist v8`

## Phase 6 Parity (List/Table/Preview + Status/Menubar)

### List view parity uplift
- Added workspace/layout list-row field persistence via:
  - `GET/PUT /api/workspaces/:workspaceId/view-configs`
- Added list-row configuration UX:
  - `View > List Row Fields...`
  - status-area `List Fields` button in List view

### Table view parity uplift
- Added per-layout table column persistence (order/visibility/width presets).
- Added header sort parity behavior:
  - click toggles single-field sort cycle
  - shift+click appends/toggles multi-sort keys
- Added table cell edit mode foundation:
  - passive display state
  - double-click/Enter activates cell
  - Esc exits active cell

### Preview mode + status/menubar audit
- Added preview renderer guardrails and status-area Preview toggle/Print action.
- Added feature-gated menubar parity actions with unsupported capability reporting.
- Added Runtime Capabilities dialog (`View > Runtime Capabilities...`).

### Phase 6 tests
- Added:
  - `npm run test:list-table-runtime`
- Expanded:
  - `npm run test:feature-flags`
  - `npm run test:view-configs`
  - `npm run test:menu-actions`
  - `npm run test:fm-regression` parity checklist (`v8`)

## Phase 7 Multi-file Workspace Support

### Workspace model upgrades
- Workspace config now supports explicit multi-file shape (`version: 2`):
  - `files[]`
  - `routing.layoutIndex`
  - `routing.toIndex`
  - `routing.relationshipGraph`
- Legacy v1 workspace configs are auto-migrated on read.

### Cross-file runtime routing
- FileMaker server client now resolves target database/layout per operation:
  - records CRUD
  - find
  - fields
  - value lists
  - scripts
  - container fetch/upload
- Cross-file writes require an API layout mapping for the target TO.
- Missing mapping returns actionable errors (for example `WORKSPACE_API_LAYOUT_MISSING`).

### Multi-file diagnostics
- New debug endpoint:
  - `GET /api/fm/workspace-routing?workspace=<id>`
- Browse debug overlay (`?debugRuntime=1`) now shows:
  - active routed DB/file/layout
  - routing path summary
  - token cache summary
  - routing warnings

### New test suite
- Added:
  - `npm run test:workspace-multifile`
- Covers:
  - workspace v1->v2 migration
  - dependency file routing
  - cross-file API layout guardrails
  - per-database token behavior and 401 re-auth
  - cross-file create/update/delete routing
  - cross-file script routing

## Phase 8 Advanced Runtime Fidelity

### Advanced script engine parity
- Runtime script engine now supports deeper FileMaker-like script behavior:
  - loop flow (`Loop`, `Exit Loop If`, `End Loop`)
  - `Else If`
  - mode steps (`Enter Browse/Find/Preview Mode`)
  - found-set script actions (`Show All Records`, `Omit Record`, `Show Omitted Only`)
  - dynamic setters (`Set Field By Name`, `Set Variable By Name`)
  - `Replace Field Contents`
  - transaction steps (`Begin/Commit/Revert Transaction`)
- Error fidelity updates:
  - `Get(LastError)` + `Get(LastMessage)` support in script evaluation
  - `Set Error Capture` continue/halt semantics
- Script step trace is now available in runtime snapshots/debug overlay.

### Transaction model
- Added runtime transaction staging and commit/revert orchestration.
- Script transactions now stage field updates and commit as a batch in runtime emulation mode.
- Kernel snapshots expose active transaction state.

### Summary + aggregate engine
- Added shared summary engine for:
  - count/sum/avg/min/max
  - grouped summary evaluation
- Reporting helper now consumes shared summary calculations for deterministic table/list summaries.

### Debug overlay expansion
- Browse runtime debug overlay now shows:
  - active transaction status
  - script call stack and trace tail
  - summary diagnostics
  - local record-lock diagnostics
  - render/script perf counters
- Added `Copy Runtime Deep Snapshot`.

### Phase 8 tests
- Added:
  - `npm run test:summary-engine`
  - `npm run test:script-advanced`
  - `npm run test:transactions`
- Expanded:
  - `npm run test:workspace-multifile`
  - `npm run test:fm-regression` (`v8` checklist + parity level output)

## Phase 9 Enterprise Hardening

### Security + authn/authz baseline
- Added centralized enterprise config/profiles (`DEV/TEST/PROD`):
  - `src/server/enterprise-config.ts`
- Added auth/session hardening:
  - trusted-header and JWT/OIDC validation
  - server-side session TTL/refresh
  - CSRF token support
- Middleware now enforces:
  - correlation IDs
  - security headers/CSP
  - API rate limiting
  - route permission gating
- Core API routes now use explicit server-side guards for authorization and CSRF checks.

### Audit, observability, and resilience
- Structured audit logging:
  - `src/server/audit-log.ts`
  - `GET /api/admin/audit`
- Metrics and diagnostics:
  - `src/server/observability.ts`
  - `GET /api/admin/metrics`
  - `GET /api/admin/config`
  - `GET /api/health`
- Resilience controls:
  - in-memory API rate limiter
  - FileMaker circuit breaker integration (`src/server/resilience/circuit-breaker.ts`)

### Deployment assets
- `Dockerfile`
- `docker-compose.yml`
- GitHub Actions sample pipeline:
  - `.github/workflows/ci.yml`
- Production build script:
  - `npm run build:prod`

### Enterprise deployment quick start

```bash
cp .env.example .env.local
# set WEBIDE_ENV_PROFILE=PROD and your auth settings
docker compose up --build
```

Health check:
- `GET /api/health`

## Phase 10 Plugin SDK

### Core plugin architecture
- Added a versioned plugin subsystem:
  - `src/plugins/types.ts`
  - `src/plugins/registry.ts`
  - `src/plugins/manager.ts`
  - `src/plugins/runtime.ts`
  - `src/plugins/manifest.ts`
  - `src/plugins/versioning.ts`
- Plugin contract:
  - `FMPlugin` with `activate` / `deactivate`
  - `PluginContext` capability-based registration APIs

### Runtime extension points
- Script-step extension API:
  - custom steps now execute through plugin manager bridge in runtime kernel/script engine.
- Layout object extension API:
  - browse runtime can render plugin-registered layout component types.
- Runtime hook subscriptions:
  - `OnRecordLoad`, `OnRecordCommit`, `OnLayoutEnter`, `OnScriptStart`, `OnScriptEnd`, `OnTransactionStart`, `OnTransactionEnd`.
- Data adapters:
  - server data client supports interception pipeline for read/find/create/write/delete.

### Packaging and examples
- CLI scaffold:
  - `node scripts/fmweb-plugin.mjs init my-plugin`
  - `npx fmweb-plugin init my-plugin` (bin configured)
- Example plugins:
  - `examples/plugins/custom-script-step-plugin`
  - `examples/plugins/custom-layout-object-plugin`
  - `examples/plugins/runtime-hook-logger-plugin`

### Phase 10 tests
- Added:
  - `npm run test:plugin-sdk`

## Phase 11 App Layer Parity (Menus, Managers, Capability Gating)

### App-layer audit + parity matrix
- Added explicit app-layer audit docs:
  - `docs/phase-11-app-layer-audit.md`
  - `docs/app-layer-parity-matrix.md`
- Matrix now tracks FileMaker-style app-layer entries with `APP-###` IDs and feasibility status.

### Capability registry + graceful disabled UX
- Added centralized capability registry:
  - `src/config/appLayerCapabilities.ts`
- Menubar/manage actions now resolve capabilities before execution.
- Disabled/unsupported actions now open rationale messaging tied to parity docs instead of failing silently.
- Added app-layer capabilities panel (search + status + docs links) from Layout Mode.

### Manage submenu parity uplift
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
- Entries open the unified app-layer manage shell (or disabled rationale if unsupported by capability policy).
- Added workspace-level app-layer persistence API:
  - `GET/PUT /api/workspaces/:workspaceId/app-layer`

### App-layer error model
- Added standardized app-layer error codes and banner component:
  - `CONFIG_MISSING`
  - `NOT_AUTHORIZED`
  - `NOT_SUPPORTED`
  - `DEPENDENCY_MISSING`

### Phase 11 tests
- Added:
  - `npm run test:app-layer`
- Expanded:
  - `npm run test:fm-regression` now prints:
    - `FM Integration Parity Checklist v11`
    - `Parity Checklist App Layer`

## Phase 12 App Layer Extras

### Coverage expansion (APPX-201..APPX-212)
- Added and enforced app-layer extras capability coverage in:
  - `src/config/appLayerCapabilities.ts`
  - `docs/app-layer-parity-matrix.md`
- Items now covered:
  - Preferences
  - Sharing/Hosting diagnostics
  - File Options
  - Recover/Clone/Compact (explicitly toggled as not feasible in-browser)
  - Import/Export center
  - Script Debugger/Data Viewer routing
  - File References
  - Auth Profiles
  - Plugin Manager
  - Window management extras
  - Help/About/Diagnostics

### Implemented app-layer extras
- `components/layout-mode.tsx` manage shell now includes:
  - Preferences panel (General/Runtime/Debug/Security)
  - Sharing/Hosting diagnostics with `Test Connection`
  - File Options editor (default layout + open/close scripts per file)
  - Import/Export center (CSV/JSON export + CSV import preview/batch create)
  - File References manager (dependency mapping + validation summary)
  - Auth Profiles manager (per-file profile mapping + connection tests)
  - Plugin Manager (runtime plugin state + persisted enable/disable)
  - Help/Diagnostics panel (JSON snapshot export)

### App-layer storage and compatibility
- Workspace app-layer config schema extended in:
  - `src/server/app-layer-storage.ts`
  - `app/api/workspaces/[workspaceId]/app-layer/route.ts`
- Existing workspaces auto-default missing Phase 12 fields safely.

### Phase 12 tests
- `npm run test:app-layer`
  - validates APPX capability wiring, menu routing, disabled rationale behavior, and parity checklist output.
- `npm run test:menu-actions`
  - validates menu action dispatch + capability-aware behavior.
- `npm run typecheck`
  - validates strict TypeScript compatibility for app-layer additions.

## Phase 13 Developer Tools

### Snapshot + diff + impact + migration stack
- Added schema snapshot model and deterministic normalization:
  - `src/lib/schemaSnapshot/*`
- Added snapshot persistence and tags:
  - `src/server/schema-snapshot-storage.ts`
- Added deterministic diff engine with probable rename confidence:
  - `src/lib/schemaDiff/*`
- Added impact analysis + workspace reference indexing:
  - `src/lib/impactAnalysis/*`
- Added migration plan generation/apply (workspace-first, safe-by-default):
  - `src/lib/migrations/*`
  - `src/server/migration-plan-storage.ts`
  - `src/server/workspace-schema-storage.ts`

### Developer Tools hub
- Added new Developer Tools API endpoint:
  - `POST/GET /api/workspaces/[workspaceId]/developer-tools`
- Added Layout Mode hub panel:
  - `Tools > Developer Utilities...`
  - component: `components/developer-tools-panel.tsx`
- Supported workflows:
  - create/tag/delete snapshots
  - diff snapshots
  - relationship graph exploration with cross-file filters + path tracing
  - impact analysis
  - migration plan generation/apply
  - report export (JSON/Markdown)

### Phase 13 tests
- `npm run test:dev-tools`
  - validates snapshot normalization, diff correctness, graph pathing, impact analysis, and migration generation/apply.
- `npm run typecheck`
  - validates strict TypeScript compatibility.

## Phase 14 Performance at 100k+ Scale

### Runtime scalability upgrades
- Found set model upgraded with page-aware state:
  - `src/lib/runtime-kernel/foundset-store.ts`
  - `src/lib/runtime-kernel/types.ts`
- Browse runtime now supports virtualization for:
  - list view rows
  - table view rows
  - portal rows
  - integrated in `components/browse-mode.tsx` with feature-flag guards.

### Data-access performance hardening
- Added bounded request caches with in-flight dedup:
  - `src/server/performance/request-cache.ts`
- Added read-path caching and retry/backoff in:
  - `src/server/filemaker-client.ts`
- Added paging and field projection support in:
  - `app/api/fm/records/route.ts`

### Feature flags
- `NEXT_PUBLIC_RUNTIME_ENABLE_VIEW_VIRTUALIZATION=1`
- `NEXT_PUBLIC_RUNTIME_ENABLE_PORTAL_VIRTUALIZATION=1`
- `NEXT_PUBLIC_RUNTIME_ENABLE_PERF_REQUEST_CACHING=1`
- `NEXT_PUBLIC_RUNTIME_ENABLE_PERF_BENCHMARK_GATE=1`

### Benchmark harness
- Command:
  - `npm run bench:perf`
- Latest baseline report:
  - `data/perf/bench-latest.json`
- Current baseline (local deterministic run):
  - virtual-window-sweep-100k: `0.99ms` (budget `120ms`)
  - table-display-build: `104.51ms` (budget `2000ms`)
  - find-and-sort-100k: `118.88ms` (budget `1600ms`)
  - portal-virtual-window-sweep-10k: `0.15ms` (budget `100ms`)

## Phase 15 Governance & Versioning

### Workspace versioning and rollback
- Added workspace checkpoints with:
  - create checkpoint
  - baseline/target diff
  - rollback with safety checkpoint
  - export version bundle
- Core modules:
  - `src/server/workspace-versioning.ts`
  - `app/api/workspaces/[workspaceId]/governance/route.ts`
  - `components/layout-mode.tsx` (`Manage > Version History`)

### Publish / promote workflow
- Added environment-pointer governance flow for `dev/test/prod`:
  - checklist-gated promote actions
  - dependency-health validation
  - environment rollback
- Core module:
  - `src/server/workspace-governance-storage.ts`

### Role-based governance and admin console
- Added governance RBAC for app-layer and server routes:
  - `src/lib/governance-rbac.ts`
- Added Admin Console aggregation + API:
  - `src/server/admin-console.ts`
  - `app/api/admin/console/route.ts`
  - surfaced in `Manage > Admin Console`

### Recovery / Safe Mode
- Added safe-mode controls and UX:
  - query/local-storage activation (`?safeMode=1`)
  - visible banner
  - blocked risky capabilities with rationale
  - diagnostics export from recovery panel

### Phase 15 tests
- Added:
  - `npm run test:versioning`
  - `npm run test:governance`
  - `npm run test:admin-console`
- Extended:
  - `npm run test:app-layer` with `Phase 15 Governance Checklist` coverage

## Phase 16 DDR Layout Fidelity

### Importer and model fidelity upgrades
- DDR importer now captures richer object metadata for layout fidelity:
  - geometry (float precision), arrange order, style hints, portal columns/headers, button bar segments, popover metadata, and fidelity warnings.
- Files:
  - `scripts/import-ddr-layouts.mjs`
  - `src/lib/layout-model.ts`

### Runtime rendering fidelity upgrades
- Browse renderer now includes:
  - unknown-object placeholders (feature-flagged)
  - richer surface style mapping
  - portal header/column shell rendering
  - button-bar segment shell rendering
  - fidelity warnings in debug overlay (`?debugRuntime=1`).
- Files:
  - `components/browse-mode.tsx`
  - `app/globals.css`

### Layout fidelity harness
- Added fixture manifest and harness scripts:
  - `docs/layout-fidelity-fixtures.json`
  - `scripts/layout-fidelity.mts`
  - `scripts/layout-fidelity-update-baselines.mts`
- Added parser regression fixture test:
  - `src/lib/layout-fidelity-import.test.mts`

Commands:
- `npm run test:layout-fidelity`
- `npm run test:layout-fidelity:update-baselines`

### Phase 16 feature flags
- `NEXT_PUBLIC_RUNTIME_ENABLE_LAYOUT_FIDELITY_UNKNOWN_OBJECTS=1`
- `NEXT_PUBLIC_RUNTIME_ENABLE_LAYOUT_FIDELITY_DYNAMIC_CONDITIONAL_FORMATTING=1`

## Phase 17 Layout Fidelity v2 (Anchors + Styles + Interaction)

### Anchoring/autosize parity foundations
- Added deterministic anchor engine with DDR flag decoding and container-aware runtime frame computation:
  - `src/lib/layout-fidelity/anchor-engine.ts`
- Importer now persists DDR anchor metadata (`ddrObjectFlags`, `ddrAnchorSource`) and normalized autosize booleans:
  - `scripts/import-ddr-layouts.mjs`
  - `src/lib/layout-model.ts`

### Style stack parity foundations
- Style stack resolution is now wired into browse renderer:
  - theme defaults -> style variant -> local overrides -> conditional fallback
  - `src/lib/layout-fidelity/style-resolver.ts`
  - `components/browse-mode.tsx`

### Object identity interaction routing
- Added objectId-based interaction router and browse wiring for:
  - object enter/exit/click
  - button click
  - portal row click
  - field commit
- Files:
  - `src/lib/layout-fidelity/interaction-router.ts`
  - `components/browse-mode.tsx`

### Phase 17 diagnostics + tests
- Browse debug overlay (`?debugRuntime=1`) now includes:
  - active object interaction event
  - style stack layers
  - anchor source/flags and computed frame/container data
- Added fidelity engine tests:
  - `npm run test:layout-fidelity-engines`

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Default layout path:

- Layout Mode: `/layouts/default/edit`
- Browse Mode: `/layouts/default/browse`

## FileMaker Integration

Set values in `.env.local` (see `.env.example`).

When `FILEMAKER_*` vars are present, server routes call FileMaker Data API.
When they are absent, the app uses local mock JSON data to let you continue development.

### Import Native FileMaker Themes

To load installed FileMaker themes/styles into the inspector:

```bash
npm run import:themes
```

This generates a catalog at `data/filemaker-theme-catalog.json` and mirrors theme assets to `data/filemaker-themes/`.

### DDR Import + Inspector Coverage Audit

Import layouts from DDR XML:

```bash
npm run import:ddr /Users/deffenda/Downloads/Assets.xml
```

Import a multi-file DDR solution (data-separation model) from `Summary.xml`:

```bash
npm run import:ddr -- --summary /Users/deffenda/Downloads/PJ/Summary.xml
```

This creates one workspace per file (for example `assets`, `common`, `projecttracker`) under `data/workspaces/`.
Each workspace stores:
- its own layout JSON files and map
- DDR source path metadata
- solution/dependency metadata (when file references exist)
- multi-file routing metadata (`workspace.json` v2) when configured

Open a workspace by adding `?workspace=<id>` to layout/browse URLs, for example:

- `/layouts/Asset%20Details/edit?workspace=assets`
- `/layouts/Home/browse?workspace=projecttracker`

Generate DDR-to-inspector mapping coverage report:

```bash
npm run audit:ddr-inspector
```

This writes `data/ddr-inspector-mapping-report.json`.

### Integration Regression Suite

Run FileMaker CRUD/find/value-list/portal regression checks:

```bash
npm run test:fm-regression
```

Notes:
- Requires `FM_INTEGRATION_TESTS=1` (set by the script).
- Uses real FileMaker config when `FILEMAKER_*` vars are present.
- Skips when FileMaker config is absent (unless `FM_TEST_ALLOW_MOCK=1` is set).

### Optional SSO (Trusted Header)

You can gate the IDE and API with reverse-proxy SSO headers:

```bash
WEBIDE_AUTH_MODE=trusted-header
WEBIDE_SSO_HEADER=x-forwarded-user
```

When enabled, requests without the trusted identity header are blocked.
Use `GET /api/auth/me` to verify the active auth mode and current user.

### Enterprise auth helpers

- Get CSRF token:
  - `GET /api/auth/csrf`
- Logout server session:
  - `POST /api/auth/logout`

## Project Structure

- `app/` Next.js routes, pages, API handlers
- `components/layout-mode.tsx` Layout editor UI
- `components/browse-mode.tsx` Runtime renderer UI
- `src/lib/layout-model.ts` Shared metadata types
- `src/lib/layout-utils.ts` Layout helpers + templating
- `src/server/layout-storage.ts` Layout JSON persistence
- `src/server/filemaker-client.ts` FileMaker Data API + mock fallback
- `src/server/mock-record-storage.ts` Mock record persistence
- `data/layouts/` Saved layout JSON files
- `data/mock-records/` Mock records by table occurrence

## Engineering Docs

- Architecture: `docs/architecture.md`
- Testing guide: `docs/testing.md`
- FM regression matrix: `docs/filemaker-regression-matrix.md`
- Runtime gap report: `docs/runtime-gap-report.md`
- Phase 2 plan: `docs/phase-2-plan.md`
- Phase 2 summary: `docs/phase-2-summary.md`
- Phase 3 plan: `docs/phase-3-plan.md`
- FMCalc-lite: `docs/fmcalc-lite.md`
- Commit/revert semantics: `docs/commit-revert.md`
- Portal runtime notes: `docs/portals.md`
- Repeating fields: `docs/repeating-fields.md`
- Tabs runtime: `docs/tabs.md`
- Value lists runtime: `docs/value-lists.md`
- Script triggers: `docs/script-triggers.md`
- Security + privileges: `docs/security-privileges.md`
- Windows + popovers: `docs/windows-popovers.md`
- Found set model: `docs/foundset.md`
- Runtime windows/card stack: `docs/windows.md`
- Script engine: `docs/scripts-engine.md`
- Script bridge: `docs/script-bridge.md`
- Variables: `docs/variables.md`
- Context stack: `docs/context-stack.md`
- Relationships traversal notes: `docs/relationships.md`
- Phase 1 plan: `docs/phase-1-plan.md`
- Phase 1 summary: `docs/phase-1-summary.md`
- Phase 3 summary: `docs/phase-3-summary.md`
- Phase 4 plan: `docs/phase-4-plan.md`
- Phase 4 summary: `docs/phase-4-summary.md`
- Phase 5 plan: `docs/phase-5-plan.md`
- Phase 5 summary: `docs/phase-5-summary.md`
- Phase 6 plan: `docs/phase-6-plan.md`
- Phase 6 summary: `docs/phase-6-summary.md`
- Phase 7 plan: `docs/phase-7-plan.md`
- Phase 7 summary: `docs/phase-7-summary.md`
- Phase 8 plan: `docs/phase-8-plan.md`
- Phase 8 summary: `docs/phase-8-summary.md`
- Phase 8 parity audit: `docs/parity-audit-phase-8.md`
- Phase 9 plan: `docs/phase-9-plan.md`
- Phase 9 summary: `docs/phase-9-summary.md`
- Phase 9 security audit: `docs/security-audit-phase-9.md`
- Phase 10 plan: `docs/phase-10-plan.md`
- Phase 10 summary: `docs/phase-10-summary.md`
- Phase 13 plan: `docs/phase-13-plan.md`
- Phase 13 summary: `docs/phase-13-summary.md`
- Phase 14 plan: `docs/phase-14-plan.md`
- Phase 14 summary: `docs/phase-14-summary.md`
- Phase 15 plan: `docs/phase-15-plan.md`
- Phase 15 summary: `docs/phase-15-summary.md`
- Phase 16 plan: `docs/phase-16-plan.md`
- Phase 16 summary: `docs/phase-16-summary.md`
- Phase 17 plan: `docs/phase-17-plan.md`
- Phase 17 summary: `docs/phase-17-summary.md`
- Performance benchmarks: `docs/performance-benchmarks.md`
- App-layer parity matrix: `docs/app-layer-parity-matrix.md`
- Workspace versioning: `docs/workspace-versioning.md`
- Publish/promote workflow: `docs/publish-promote.md`
- Governance RBAC: `docs/rbac.md`
- Admin Console: `docs/admin-console.md`
- Recovery/Safe Mode: `docs/recovery-safe-mode.md`
- Capabilities reference: `docs/capabilities.md`
- Schema snapshots: `docs/schema-snapshots.md`
- Schema diff: `docs/schema-diff.md`
- Impact analysis: `docs/impact-analysis.md`
- Migration engine: `docs/migration-engine.md`
- Relationship graph: `docs/relationship-graph.md`
- Developer tools hub: `docs/developer-tools.md`
- Multi-file workspaces: `docs/workspaces-multifile.md`
- Find mode parity notes: `docs/find-mode.md`
- Sort/reporting parity notes: `docs/sort-and-reporting.md`
- Summary engine notes: `docs/summary-fields.md`
- Field engine parity notes: `docs/field-engine.md`
- Script engine advanced notes: `docs/script-engine-advanced.md`
- Transactions notes: `docs/transactions.md`
- List view parity notes: `docs/list-view.md`
- Table view parity notes: `docs/table-view.md`
- Preview mode parity notes: `docs/preview-mode.md`
- Status/Menubar parity notes: `docs/status-menubar-parity.md`
- Security hardening notes: `docs/security.md`
- Audit logging notes: `docs/audit-logging.md`
- Deployment notes: `docs/deployment.md`
- Observability notes: `docs/observability.md`
- Multi-tenancy notes: `docs/multitenancy.md`
- Enterprise resilience notes: `docs/resilience-enterprise.md`
- Plugin SDK: `docs/plugin-sdk.md`
- Plugin API reference: `docs/plugin-api-reference.md`
- Plugin versioning: `docs/plugin-versioning.md`
- Plugin script steps: `docs/plugin-script-steps.md`
- Plugin layout objects: `docs/plugin-layout-objects.md`
- Plugin hooks: `docs/plugin-hooks.md`
- Plugin data adapters: `docs/plugin-data-adapters.md`
- Plugin sandbox: `docs/plugin-sandbox.md`
- Plugin packaging: `docs/plugin-packaging.md`
- Plugin examples: `docs/plugin-examples.md`

## Next Phase Recommendations

- FMCalc-lite dependency extraction + evaluator-level memoization for heavy conditional/tooltip/filter layouts.
- Preview-mode progressive rendering and print artifact caching for large grouped reports.
- Real-server benchmark matrix (latency/rate-limit profiles) with threshold gates per environment.
- Portal sort/filter invalidation tuned by dependency hashes for large related edits.

# Runtime Gap Report (FM Web IDE)

Date: 2026-03-02

Phase 1 planning status (14-phase parity program):
- Planning complete in:
  - `/Users/deffenda/Code/FMWebIDE/docs/phase-1-plan.md`
- Phase 1 target area:
  - parity foundation for architecture/data model visibility + parity measurement diagnostics
- Phase 1 implementation status:
  - parity matrix typed JSON model + schema shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/lib/parity-matrix-report.ts`
  - audit pipeline now emits parity matrix JSON + schema:
    - `/Users/deffenda/Code/FMWebIDE/scripts/audit/run-audit.ts`
    - `/Users/deffenda/Code/FMWebIDE/docs/audit/Parity_Matrix_FileMaker_vs_FMWebIDE.json`
    - `/Users/deffenda/Code/FMWebIDE/docs/audit/Parity_Matrix_FileMaker_vs_FMWebIDE.schema.json`
  - internal diagnostics aggregation shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/server/parity-diagnostics.ts`
    - `/Users/deffenda/Code/FMWebIDE/app/api/admin/parity/route.ts`
    - `/Users/deffenda/Code/FMWebIDE/app/diagnostics/parity/page.tsx`
  - Phase 1 tests shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/lib/parity-matrix-report.test.mts`
    - `/Users/deffenda/Code/FMWebIDE/src/server/parity-diagnostics.test.mts`
    - `/Users/deffenda/Code/FMWebIDE/tests/ui/native-parity/phase1-foundation.spec.mts`

Phase 2 planning status (14-phase parity program):
- Planning and implementation complete in:
  - `/Users/deffenda/Code/FMWebIDE/docs/parity/phase2-notes.md`
- Phase 2 target area:
  - high-fidelity layout geometry and anchoring behavior (parts, z-order, resize, zoom)
- Phase 2 implementation status:
  - geometry engine shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/fm/layout/geometry/types.ts`
    - `/Users/deffenda/Code/FMWebIDE/src/fm/layout/geometry/computePartMetrics.ts`
    - `/Users/deffenda/Code/FMWebIDE/src/fm/layout/geometry/computeObjectGeometry.ts`
    - `/Users/deffenda/Code/FMWebIDE/src/fm/layout/geometry/applyAnchors.ts`
    - `/Users/deffenda/Code/FMWebIDE/src/fm/layout/geometry/buildRenderTree.ts`
  - runtime integration shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/server/runtime/render-tree.ts`
    - `/Users/deffenda/Code/FMWebIDE/src/server/runtime/session-store.ts`
    - `/Users/deffenda/Code/FMWebIDE/src/server/runtime/types.ts`
    - `/Users/deffenda/Code/FMWebIDE/components/webdirect-runtime.tsx`
  - diagnostics overlay + render surface shipped:
    - `/Users/deffenda/Code/FMWebIDE/components/fm/RenderSurface.tsx`
    - `/Users/deffenda/Code/FMWebIDE/components/fm/DiagnosticsOverlay.tsx`
  - anchor override escape hatch shipped:
    - `/Users/deffenda/Code/FMWebIDE/data/anchorsOverride.json`
  - anchor inference heuristic shipped:
    - missing DDR anchor metadata now defaults to top-left anchors with deterministic wide-object (`left+right`) inference for body objects spanning most of part width.
  - phase 2 parity matrix updates shipped:
    - `/Users/deffenda/Code/FMWebIDE/docs/parity/parity-matrix.json`
  - phase 2 tests shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/fm/layout/geometry/__tests__/anchors.test.ts`
    - `/Users/deffenda/Code/FMWebIDE/src/fm/layout/geometry/__tests__/parts.test.ts`
    - `/Users/deffenda/Code/FMWebIDE/src/fm/layout/geometry/__tests__/render-tree.test.ts`
    - `/Users/deffenda/Code/FMWebIDE/tests/ui/native-parity/layout-visual.spec.mts`

Phase 3 planning status (14-phase parity program):
- Planning and implementation complete in:
  - `/Users/deffenda/Code/FMWebIDE/docs/parity/phase3-notes.md`
- Phase 3 target area:
  - theme/style fidelity, typography rules, fill/border/padding rendering, and style diagnostics.
- Phase 3 implementation status:
  - style token + resolver pipeline shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/fm/styles/tokens.ts`
    - `/Users/deffenda/Code/FMWebIDE/src/fm/styles/fmFontMap.ts`
    - `/Users/deffenda/Code/FMWebIDE/src/fm/styles/resolveStyleStack.ts`
    - `/Users/deffenda/Code/FMWebIDE/src/fm/styles/resolveStyle.ts`
    - `/Users/deffenda/Code/FMWebIDE/src/fm/styles/cssFromTokens.ts`
  - runtime renderer integration shipped:
    - `/Users/deffenda/Code/FMWebIDE/components/fm/RenderSurface.tsx`
    - `/Users/deffenda/Code/FMWebIDE/components/fm/FmObject.tsx`
    - `/Users/deffenda/Code/FMWebIDE/components/fm/FmText.tsx`
    - `/Users/deffenda/Code/FMWebIDE/components/fm/DiagnosticsOverlay.tsx`
  - runtime style context wiring shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/server/runtime/render-tree.ts`
  - scoped fm surface style baseline shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/styles/fmSurface.css`
  - phase 3 tests shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/fm/styles/__tests__/resolveStyle.test.ts`
    - `/Users/deffenda/Code/FMWebIDE/src/fm/styles/__tests__/cssFromTokens.test.ts`
    - `/Users/deffenda/Code/FMWebIDE/tests/ui/native-parity/layout-style-visual.spec.mts`

Phase 4 planning status (14-phase parity program):
- Planning and implementation complete in:
  - `/Users/deffenda/Code/FMWebIDE/docs/parity/phase4-notes.md`
- Phase 4 target area:
  - core object renderer parity (fields, text, button, image, rectangle) and field interaction semantics.
- Phase 4 implementation status:
  - FM object component set shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/fm/objects/FmField.tsx`
    - `/Users/deffenda/Code/FMWebIDE/src/fm/objects/FmTextObject.tsx`
    - `/Users/deffenda/Code/FMWebIDE/src/fm/objects/FmButton.tsx`
    - `/Users/deffenda/Code/FMWebIDE/src/fm/objects/FmImage.tsx`
    - `/Users/deffenda/Code/FMWebIDE/src/fm/objects/FmRectangle.tsx`
    - `/Users/deffenda/Code/FMWebIDE/src/fm/objects/FieldAdapter.ts`
  - runtime object classification + metadata wiring shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/server/runtime/render-tree.ts`
  - field validation commit gate shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/server/runtime/session-store.ts`
  - renderer integration + field error surfacing shipped:
    - `/Users/deffenda/Code/FMWebIDE/components/fm/RenderSurface.tsx`
    - `/Users/deffenda/Code/FMWebIDE/components/webdirect-runtime.tsx`
  - phase 4 tests shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/server/runtime/render-tree-objects.test.mts`
    - `/Users/deffenda/Code/FMWebIDE/src/server/runtime/session-store.test.mts`
    - `/Users/deffenda/Code/FMWebIDE/tests/ui/native-parity/layout-object-types.spec.mts`

Phase 16 planning status:
- Planning complete in:
  - `/Users/deffenda/Code/FMWebIDE/docs/phase-16-plan.md`
- Phase 16 target area:
  - DDR (FMPReport XML) layout import and high-fidelity layout rendering only.
- Phase 16 implementation status:
  - importer fidelity upgrades shipped:
    - `/Users/deffenda/Code/FMWebIDE/scripts/import-ddr-layouts.mjs`
  - layout model fidelity fields shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/lib/layout-model.ts`
  - browse-mode fidelity renderer upgrades shipped:
    - `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`
    - `/Users/deffenda/Code/FMWebIDE/app/globals.css`
  - fidelity feature flags shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/config/featureFlags.ts`
    - `/Users/deffenda/Code/FMWebIDE/src/config/featureFlags.test.mts`
  - fixture manifest and fidelity harness shipped:
    - `/Users/deffenda/Code/FMWebIDE/docs/layout-fidelity-fixtures.json`
    - `/Users/deffenda/Code/FMWebIDE/scripts/layout-fidelity.mts`
    - `/Users/deffenda/Code/FMWebIDE/scripts/layout-fidelity-update-baselines.mts`
  - Phase 16 parser/fidelity regression coverage shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/lib/layout-fidelity-import.test.mts`
  - current fixture coverage snapshot (latest harness run):
    - fixtures: `5`
    - layouts measured: `35`
    - avg object-count match: `0.989`
    - avg object-type coverage: `0.911`
    - remaining unresolved high-volume DDR tokens: `popover`, `rect`, `tab panel`, `graphic`, `slide panel`, `external object`

Phase 15 planning status:
- Planning complete in:
  - `/Users/deffenda/Code/FMWebIDE/docs/phase-15-plan.md`
- Phase 15 target areas:
  - workspace versioning history + rollback
  - publish/promote governance workflow
  - role-based app-layer governance controls
  - admin console aggregation UX
  - recovery/safe-mode stability controls
- Phase 15 implementation status:
  - capability registry extended for governance surfaces:
    - `/Users/deffenda/Code/FMWebIDE/src/config/appLayerCapabilities.ts`
    - includes `APP-119..APP-123`
  - governance RBAC model + tests shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/lib/governance-rbac.ts`
    - `/Users/deffenda/Code/FMWebIDE/src/lib/governance-rbac.test.mts`
  - workspace versioning tests shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/server/workspace-versioning.test.mts`
  - promote/rollback governance tests shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/server/workspace-governance-storage.test.mts`
  - admin console aggregation module + tests shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/server/admin-console.ts`
    - `/Users/deffenda/Code/FMWebIDE/src/server/admin-console.test.mts`
    - `/Users/deffenda/Code/FMWebIDE/app/api/admin/console/route.ts`
  - layout mode app-layer manager expanded with sections:
    - `Version History`
    - `Publish / Promote`
    - `Admin Console`
    - `Recovery / Safe Mode`
    - implemented in `/Users/deffenda/Code/FMWebIDE/components/layout-mode.tsx`
  - recovery safe-mode visual/status UX shipped:
    - `/Users/deffenda/Code/FMWebIDE/app/globals.css`
    - `/Users/deffenda/Code/FMWebIDE/components/layout-mode.tsx`
  - parity docs updated:
    - `/Users/deffenda/Code/FMWebIDE/docs/app-layer-parity-matrix.md`
    - `/Users/deffenda/Code/FMWebIDE/docs/phase-15-summary.md`

Phase 14 planning status:
- Planning complete in:
  - `/Users/deffenda/Code/FMWebIDE/docs/phase-14-plan.md`
- Phase 14 target areas:
  - found set paging and 100k-scale navigation
  - list/table/portal virtualization
  - request dedup + bounded caching + retry/backoff
  - benchmark harness + perf gates
- Phase 14 implementation status:
  - performance virtualization primitive shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/lib/performance/virtual-window.ts`
  - browse list/table/portal virtual rendering integration shipped:
    - `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`
    - `/Users/deffenda/Code/FMWebIDE/app/globals.css`
  - scalable request caching + in-flight dedup shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/server/performance/request-cache.ts`
    - `/Users/deffenda/Code/FMWebIDE/src/server/filemaker-client.ts`
  - records API paging/projection route shaping shipped:
    - `/Users/deffenda/Code/FMWebIDE/app/api/fm/records/route.ts`
  - found set page-map model uplift shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/foundset-store.ts`
    - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/types.ts`
  - benchmark harness + command shipped:
    - `/Users/deffenda/Code/FMWebIDE/scripts/bench-perf.mts`
    - `npm run bench:perf`
  - dedicated Phase 14 summary docs shipped:
    - `/Users/deffenda/Code/FMWebIDE/docs/phase-14-summary.md`
    - `/Users/deffenda/Code/FMWebIDE/docs/performance-benchmarks.md`

Phase 13 planning status:
- Planning complete in:
  - `/Users/deffenda/Code/FMWebIDE/docs/phase-13-plan.md`
- Phase 13 target areas:
  - schema snapshot/versioning across multi-file workspaces
  - deterministic schema diff + probable rename confidence scoring
  - snapshot-driven visual relationship graph and path tracing
  - impact analysis for layouts/scripts/value lists/menus/portals
  - migration plan generation + workspace-safe apply engine
  - developer report export + dedicated `test:dev-tools` suite
- Phase 13 implementation status:
  - snapshot model + deterministic normalization shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/lib/schemaSnapshot/types.ts`
    - `/Users/deffenda/Code/FMWebIDE/src/lib/schemaSnapshot/normalize.ts`
    - `/Users/deffenda/Code/FMWebIDE/src/lib/schemaSnapshot/create.ts`
  - snapshot persistence/tagging shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/server/schema-snapshot-storage.ts`
  - diff engine with probable rename confidence shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/lib/schemaDiff/diff.ts`
  - relationship graph builder/filter/path shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/lib/relationshipGraph/index.ts`
  - impact analysis + reference indexing shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/lib/impactAnalysis/index.ts`
  - migration plan generation/apply shipped (workspace-first):
    - `/Users/deffenda/Code/FMWebIDE/src/lib/migrations/generate.ts`
    - `/Users/deffenda/Code/FMWebIDE/src/lib/migrations/apply.ts`
  - migration + workspace schema overlay persistence shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/server/migration-plan-storage.ts`
    - `/Users/deffenda/Code/FMWebIDE/src/server/workspace-schema-storage.ts`
  - developer tools API + UI hub shipped:
    - `/Users/deffenda/Code/FMWebIDE/app/api/workspaces/[workspaceId]/developer-tools/route.ts`
    - `/Users/deffenda/Code/FMWebIDE/components/developer-tools-panel.tsx`
  - dedicated phase suite shipped:
    - `npm run test:dev-tools`
    - `/Users/deffenda/Code/FMWebIDE/src/lib/dev-tools.test.mts`

Phase 12 planning status:
- Planning complete in:
  - `/Users/deffenda/Code/FMWebIDE/docs/phase-12-plan.md`
- Phase 12 implementation status:
  - APPX app-layer extras capability registry shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/config/appLayerCapabilities.ts`
    - includes `APPX-201..APPX-212` with rationale + doc links.
  - app-layer manager persistence schema expanded for extras:
    - `/Users/deffenda/Code/FMWebIDE/src/server/app-layer-storage.ts`
    - `/Users/deffenda/Code/FMWebIDE/app/api/workspaces/[workspaceId]/app-layer/route.ts`
  - Layout Mode app-layer shell expanded with Phase-12 sections:
    - `/Users/deffenda/Code/FMWebIDE/components/layout-mode.tsx`
    - covers Preferences, Sharing/Hosting, File Options, Import/Export, File References, Auth Profiles, Plugin Manager, and Help/Diagnostics.
  - Menubar gating/disabled rationale behavior expanded for APPX items:
    - `/Users/deffenda/Code/FMWebIDE/components/layout-mode.tsx`
    - disabled features always surface rationale instead of silent no-op.
  - App-layer capability regression checks expanded:
    - `/Users/deffenda/Code/FMWebIDE/src/config/appLayerCapabilities.test.mts`
    - `/Users/deffenda/Code/FMWebIDE/src/lib/app-layer-menu.test.mts`
    - `/Users/deffenda/Code/FMWebIDE/src/server/app-layer-storage.test.mts`
  - New app-layer parity test command available:
    - `npm run test:app-layer`
    - prints `App Layer Parity Checklist` output for APPX coverage.

Phase 11 planning status:
- App-layer audit complete in:
  - `/Users/deffenda/Code/FMWebIDE/docs/phase-11-app-layer-audit.md`
  - `/Users/deffenda/Code/FMWebIDE/docs/app-layer-parity-matrix.md`
- Phase 11 implementation status:
  - centralized app-layer capability registry shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/config/appLayerCapabilities.ts`
  - app-layer capability tests shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/config/appLayerCapabilities.test.mts`
  - app-layer manager workspace persistence shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/server/app-layer-storage.ts`
    - `/Users/deffenda/Code/FMWebIDE/app/api/workspaces/[workspaceId]/app-layer/route.ts`
  - app-layer errors/UX guards shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/lib/app-layer-errors.ts`
    - `/Users/deffenda/Code/FMWebIDE/components/app-layer-error-banner.tsx`
  - layout-mode menubar/manage integration shipped:
    - `/Users/deffenda/Code/FMWebIDE/components/layout-mode.tsx`
    - all File > Manage entries now route via capability gating with rationale dialogs
  - parity regression output expanded:
    - `/Users/deffenda/Code/FMWebIDE/src/server/filemaker-regression.test.mts`
    - includes `FM Integration Parity Checklist v11` + `Parity Checklist App Layer` summary.

Phase 10 planning status:
- Planning complete in:
  - `/Users/deffenda/Code/FMWebIDE/docs/phase-10-plan.md`
- Phase 10 implementation status (plugin extensibility achieved):
  - plugin SDK core shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/plugins/types.ts`
    - `/Users/deffenda/Code/FMWebIDE/src/plugins/registry.ts`
    - `/Users/deffenda/Code/FMWebIDE/src/plugins/manager.ts`
    - `/Users/deffenda/Code/FMWebIDE/src/plugins/manifest.ts`
    - `/Users/deffenda/Code/FMWebIDE/src/plugins/versioning.ts`
    - `/Users/deffenda/Code/FMWebIDE/src/plugins/runtime.ts`
  - script-step extension bridge integrated:
    - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/script-engine.ts`
    - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/kernel.ts`
  - runtime hook extension bridge integrated:
    - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/kernel.ts`
  - custom layout object rendering extension bridge integrated:
    - `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`
  - data-adapter interception bridge integrated:
    - `/Users/deffenda/Code/FMWebIDE/src/server/filemaker-client.ts`
  - plugin packaging scaffold shipped:
    - `/Users/deffenda/Code/FMWebIDE/scripts/fmweb-plugin.mjs`
  - example plugins shipped:
    - `/Users/deffenda/Code/FMWebIDE/examples/plugins/*`
  - dedicated test suite shipped:
    - `/Users/deffenda/Code/FMWebIDE/src/plugins/plugin-sdk.test.mts`

Phase 9 planning status:
- Planning complete in:
  - `/Users/deffenda/Code/FMWebIDE/docs/phase-9-plan.md`
- Phase 9 target areas:
  - enterprise security hardening (authn/authz/csrf/csp)
  - audit/compliance logging
  - deployment/environment readiness
  - observability and resilience controls

Phase 9 implementation status:
- Security/config foundation shipped:
  - `/Users/deffenda/Code/FMWebIDE/src/server/enterprise-config.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/security/jwt.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/security/session-store.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/security/csrf.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/security/authorization.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/security/request-context.ts`
  - `/Users/deffenda/Code/FMWebIDE/middleware.ts`
- Auth/CSRF/admin endpoints added:
  - `/Users/deffenda/Code/FMWebIDE/app/api/auth/csrf/route.ts`
  - `/Users/deffenda/Code/FMWebIDE/app/api/auth/logout/route.ts`
  - `/Users/deffenda/Code/FMWebIDE/app/api/admin/config/route.ts`
  - `/Users/deffenda/Code/FMWebIDE/app/api/admin/metrics/route.ts`
  - `/Users/deffenda/Code/FMWebIDE/app/api/admin/audit/route.ts`
  - `/Users/deffenda/Code/FMWebIDE/app/api/health/route.ts`
- Audit/compliance/logging shipped:
  - `/Users/deffenda/Code/FMWebIDE/src/server/audit-log.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/observability.ts`
- Resilience controls shipped:
  - `/Users/deffenda/Code/FMWebIDE/src/server/security/rate-limit.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/resilience/circuit-breaker.ts`
  - circuit-breaker integration in `/Users/deffenda/Code/FMWebIDE/src/server/filemaker-client.ts`.
- Deployment assets shipped:
  - `/Users/deffenda/Code/FMWebIDE/Dockerfile`
  - `/Users/deffenda/Code/FMWebIDE/docker-compose.yml`
  - `/Users/deffenda/Code/FMWebIDE/.github/workflows/ci.yml`

Phase 8 planning status:
- Planning complete in:
  - `/Users/deffenda/Code/FMWebIDE/docs/phase-8-plan.md`
- Phase 8 target areas:
  - advanced script engine parity and trace diagnostics
  - transaction semantics for staged script-driven field updates
  - dedicated summary/aggregate engine for reporting parity
  - debug overlay expansion for transaction/script/summary/lock/perf diagnostics

Phase 8 implementation status:
- Advanced script engine uplift shipped:
  - `src/lib/runtime-kernel/script-engine.ts`
  - adds support for:
    - `Loop`, `Exit Loop If`, `End Loop`
    - `Else If`
    - `Enter Browse Mode`, `Enter Preview Mode`
    - `Go to Related Record`
    - `Show All Records`, `Omit Record`, `Show Omitted Only`
    - `Replace Field Contents`, `Set Field By Name`, `Set Variable By Name`
    - `Begin Transaction`, `Commit Transaction`, `Revert Transaction`
  - error fidelity improvements:
    - `Get(LastError)`, `Get(LastMessage)` token resolution
    - expanded `Set Error Capture` flow control
  - script trace diagnostics:
    - step trace history and optional step-mode pacing hooks.
- Transaction manager module shipped:
  - `src/lib/runtime-kernel/transaction-manager.ts`
  - kernel/script integration wired in:
    - `src/lib/runtime-kernel/kernel.ts`
    - `src/lib/runtime-kernel/types.ts`
- Summary engine module shipped:
  - `src/lib/summary-engine.ts`
  - reporting helper now uses shared summary calculations:
    - `src/lib/sort-reporting.ts`
- Debug overlay expansion shipped:
  - `components/browse-mode.tsx`
  - now shows transaction status, script stack/trace, summary diagnostics, record-lock diagnostics, and perf counters.

Phase 6 planning status:
- Planning complete in:
  - `/Users/deffenda/Code/FMWebIDE/docs/phase-6-plan.md`
- Phase 6 P0 baseline is implemented for:
  - list/table runtime parity uplift with per-layout view config persistence
  - preview renderer/read-only behavior uplift
  - status/menubar feature-gated parity audit and capabilities modal
  - regression checklist v6 uplift

Phase 7 planning status:
- Planning complete in:
  - `/Users/deffenda/Code/FMWebIDE/docs/phase-7-plan.md`
- Phase 7 target areas:
  - explicit multi-file workspace graph (`files`, TO/layout ownership indexes, dependency graph)
  - database-aware cross-file routing for read/find/CRUD/script operations
  - per-file session/token handling and cross-file privilege/error mapping
  - ProjectTracker -> Common runtime scenario hardening

Phase 7 implementation status:
- Multi-file workspace model normalization shipped:
  - `src/server/workspace-context.ts` now parses/writes workspace config v2 with:
    - `files[]`
    - `routing.layoutIndex`
    - `routing.toIndex`
    - `routing.relationshipGraph`
  - v1 workspace configs auto-migrate on read.
- Multi-file routing resolver shipped:
  - `src/server/workspace-multifile.ts`
  - resolves workspace graph + dependency files
  - resolves TO/layout CRUD targets to database-aware routing targets
  - emits actionable routing errors (missing API layout, locked/missing file).
- Database-aware FileMaker routing shipped:
  - `src/server/filemaker-client.ts`
  - all key operations now route through workspace resolver:
    - records/find/fields/value-lists/layouts/scripts
    - container fetch/upload
  - per-database token cache diagnostics added.
- FM API routes upgraded for multi-file hints and error mapping:
  - `app/api/fm/records/route.ts`
  - `app/api/fm/find/route.ts`
  - `app/api/fm/fields/route.ts`
  - `app/api/fm/value-lists/route.ts`
  - `app/api/fm/layouts/route.ts`
  - `app/api/fm/scripts/route.ts`
  - `app/api/fm/container/route.ts`
  - `app/api/fm/container/upload/route.ts`
- New workspace routing debug endpoint shipped:
  - `app/api/fm/workspace-routing/route.ts`
  - exposes file graph, index counts, token diagnostics, and last CRUD routing target.
- Browse runtime debug overlay now surfaces routing diagnostics from that endpoint:
  - `components/browse-mode.tsx`.

## A) What Exists Today

### Layout Mode
- Layout editor, inspector, object tooling, status/menu bars:
  - `/Users/deffenda/Code/FMWebIDE/components/layout-mode.tsx`
- Layout model/types (components, portal/tab/container/repeating/trigger metadata):
  - `/Users/deffenda/Code/FMWebIDE/src/lib/layout-model.ts`
- Layout persistence + workspace-aware storage:
  - `/Users/deffenda/Code/FMWebIDE/src/server/layout-storage.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/workspace-context.ts`
  - `/Users/deffenda/Code/FMWebIDE/app/api/layouts/*`

### Browse Runtime
- Runtime renderer, mode/view state, CRUD, find, table/list/form rendering:
  - `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`
- FMCalc-lite runtime integration:
  - hide-object, tooltips, portal filter calculations, tab label/visibility calc.
- Find mode parity engine (requests/omit/constrain/extend + payload translation):
  - `/Users/deffenda/Code/FMWebIDE/src/lib/find-mode.ts`
- Edit-session runtime:
  - staged field edits, commit/revert, dirty navigation prompts.
- Field engine (validation + auto-enter):
  - `/Users/deffenda/Code/FMWebIDE/src/lib/field-engine.ts`
- Sort/group/subsummary runtime helpers:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/sort-reporting.ts`
- Portal runtime:
  - active row, portal sort/filter, delete gating, initial row + reset-on-exit behavior.
- Repeating fields:
  - stacked controls in form mode, compact display in list/table, staged edits per repetition.
- Trigger runtime:
  - lifecycle/object events + commit-request veto path with trigger history.
- Value list runtime:
  - display/stored mapping + cache-backed catalog load.
- Privilege-aware gating:
  - runtime capability map drives visibility/editability/delete access.
- Debug runtime overlay (`?debugRuntime=1`):
  - layout/workspace/mode/record, dirty state, active tab, repeating summary, trigger history, calc errors, cache state, privilege role.
  - kernel window/found-set/context/script/variable summaries.
- Runtime kernel foundations:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/kernel.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/foundset-store.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/window-manager.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/script-engine.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/variable-store.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/context-stack.ts`

### Server APIs (FileMaker proxy + mock fallback)
- Existing FileMaker proxy routes:
  - `/Users/deffenda/Code/FMWebIDE/app/api/fm/layouts/route.ts`
  - `/Users/deffenda/Code/FMWebIDE/app/api/fm/fields/route.ts`
  - `/Users/deffenda/Code/FMWebIDE/app/api/fm/records/route.ts`
  - `/Users/deffenda/Code/FMWebIDE/app/api/fm/find/route.ts`
  - `/Users/deffenda/Code/FMWebIDE/app/api/fm/value-lists/route.ts`
  - `/Users/deffenda/Code/FMWebIDE/app/api/fm/scripts/route.ts`
  - `/Users/deffenda/Code/FMWebIDE/app/api/fm/container/route.ts`
  - `/Users/deffenda/Code/FMWebIDE/app/api/fm/container/upload/route.ts`
- New runtime capabilities route:
  - `/Users/deffenda/Code/FMWebIDE/app/api/fm/capabilities/route.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-capabilities.ts`
  - mock role simulation (`fullAccess`, `readOnly`, `restricted`, `noAccess`) via query param.

### DDR Import + Workspace System
- DDR import pipeline:
  - `/Users/deffenda/Code/FMWebIDE/scripts/import-ddr-layouts.mjs`
- DDR inspector mapping audit:
  - `/Users/deffenda/Code/FMWebIDE/scripts/audit-ddr-inspector-mapping.mjs`
- Workspace context and per-workspace data separation:
  - `/Users/deffenda/Code/FMWebIDE/src/server/workspace-context.ts`

### Regression/Test Coverage
- Unit/runtime parity foundations:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/fmcalc/fmcalc.test.mts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/edit-session/edit-session.test.mts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-parity.test.mts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/find-mode.test.mts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/sort-reporting.test.mts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/field-engine.test.mts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/portal-utils.test.mts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/tabs-runtime.test.mts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/triggers/triggers.test.mts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/trigger-policy.test.mts`
- `/Users/deffenda/Code/FMWebIDE/src/lib/value-list-cache.test.mts`
- `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-capabilities.test.mts`
- Runtime kernel coverage:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/foundset-store.test.mts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/window-manager.test.mts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/variable-store.test.mts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/context-stack.test.mts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/script-workspace-mapper.test.mts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/script-engine.test.mts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/kernel.test.mts`
- URL/menu/import regression coverage:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/browse-url-state.test.mts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/menu-action-coverage.test.mts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/layout-import-regression.test.mts`
- Phase 6 list/table runtime helpers:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/list-table-runtime.test.mts`
- Feature flags + view config persistence:
  - `/Users/deffenda/Code/FMWebIDE/src/config/featureFlags.test.mts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/view-config-storage.test.mts`
- App-layer parity coverage:
  - `/Users/deffenda/Code/FMWebIDE/src/config/appLayerCapabilities.test.mts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/app-layer-menu.test.mts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/app-layer-storage.test.mts`
- FileMaker integration regression:
  - `/Users/deffenda/Code/FMWebIDE/src/server/filemaker-regression.test.mts`

## B) Modeled vs Implemented (Current Status)

### Completed or Mostly Complete
- FMCalc-lite subset and safe evaluation in runtime.
- Edit-session commit/revert lifecycle.
- Find request model with include/omit requests and deterministic translation to Data API `_find` payload.
- Constrain/extend found set semantics in browse runtime menus and state flow.
- Sort/group/subsummary runtime engine for list/table rendering (with count/sum/avg/min/max summary ops).
- Field engine with commit-time validation (required/type/range/pattern/calc) and auto-enter defaults.
- Portal active row/filter/sort basics + delete gating.
- Trigger bus foundation + commit request veto path.
- Repeating field helper + runtime rendering/editing path.
- Tab runtime helpers + active-tab URL token support.
- Value list cache utility + runtime integration.
- Privilege capability map route + browse gating integration.
- Runtime kernel with typed actions and serializable snapshot support.
- Found set store model (id/source/query/index/refresh).
- Window manager model (main/card with per-window mode/layout/foundset).
- FM Script-lite executor with call stack and `$`/`$$` variable scopes.
- Context stack and TO-aware field reference resolution.
- App-layer capability registry + manager shell routing:
  - File > Manage entries are capability-gated and routed through unified manager sections.
  - blocked/unsupported actions show rationale UX tied to parity docs.
- Workspace-level app-layer manager persistence:
  - external data sources, custom functions, themes, security role summaries, and container settings.
- Canonical layout tab-order model:
  - layout-level `tabOrder[]` with backward-compatible migration from legacy `component.props.tabOrder`.
- Browse-mode tab traversal manager:
  - deterministic `Tab` / `Shift+Tab` ordering with skip reasons (hidden/read-only/no-entry/no-view).
- Workspace persistence for saved searches:
  - server-backed saved finds + saved found sets (`/api/workspaces/:workspaceId/saved-searches`).
- Browse-mode saved found set UX:
  - save/open/rename/duplicate/delete/export and capped record-id snapshot handling.

### Partial / MVP-level implementations
- Saved finds currently remain workspace-local runtime metadata (not full native FileMaker saved-find management parity).
- Tab runtime child scoping currently uses explicit hints (`groupId`) + geometry fallback heuristics, not full native tab-pane metadata parity.
- Popovers/card windows are intentionally minimal and feature-flagged in runtime (`NEXT_PUBLIC_RUNTIME_ENABLE_POPOVERS`, `NEXT_PUBLIC_RUNTIME_ENABLE_CARD_WINDOWS`).
- Privilege gating currently uses capability map heuristics in mock mode and permissive default on live mode unless server policy is expanded.
- Container runtime supports image/PDF/interactive mapping and upload/download routes, but not all FileMaker display and media controls.
- Script engine step parsing from DDR script text is intentionally conservative and currently maps unsupported/unknown steps to comments.
- Browse runtime synchronizes kernel found set/window/context state, but full UI behavior still uses existing browse state logic.
- Saved found sets currently use snapshot record IDs (P0) and do not yet provide dynamic query-backed refresh (planned P2).
- Tab-order design tooling is implemented for canonical assignment/reordering, but parity gaps remain for full native per-context editing workflows.
- List/table renderers are functional and editable, but full FileMaker parity gaps remain for:
  - multi-select row semantics
  - persistent per-layout column/list-row configuration depth
  - large found-set virtualization and full keyboard editing semantics.
- Preview mode currently exists, but exact FileMaker page-flow parity is partial (browser print constraints).
- Menubar/status areas are broad and functional, but require centralized feature-flag gating and capability reporting for non-feasible actions.
- List/table parity uplift now includes:
  - per-layout list row fields + table column preferences (`view-configs` route/storage)
  - table header click sort + shift multi-sort
  - table cell edit-mode foundation and preview read-only guards
- Menubar/status now includes runtime capabilities audit dialog and feature-gated unsupported actions.
- Workspace handling remains effectively one active database per workspace at runtime; multi-file access is dependency-linked, not fully normalized into explicit `files[]` + routing indexes yet.
- Cross-file routing of table occurrences/layout CRUD targets is partial and still needs deterministic server-side routing and API-layout mapping coverage.

### Clearly Modeled but Not Yet Full Parity
- Full FileMaker trigger matrix and script-parameter payload parity.
- Full tab control setup/runtime parity (including exact FileMaker panel object semantics and every edge case).
- Full multi-window/card stack parity (nested stacks, native window arrangement, persistent stacks).
- Full relationship-graph-driven traversal parity for all related-record navigation paths.
- Advanced portal parity (row lifecycle policy matrix, virtualized related sets, multi-edit ergonomics).
- Conditional formatting parity and advanced button bar state logic.
- Export/print parity beyond current basic runtime/browser flows.
- Offline/reconnect conflict-resolution semantics and runtime profiler/rate-limit observability.
- Full FileMaker list/table interaction parity (column management depth, row commit timing, multi-select ergonomics).
- Full FileMaker preview page model parity (deterministic page count, part-level pagination rules).
- Full menubar/status parity across all FileMaker-native commands and OS-level behaviors.
- Full enterprise OIDC refresh-token lifecycle and external IdP introspection workflows.
- Full tenant hard-isolation across all workspace persistence and storage APIs.
- Pluggable enterprise audit sinks (SIEM/streaming storage) beyond local file-based `.ndjson`.

## Phase 17 Progress (Layout Fidelity v2)

### Completed in current pass
- DDR anchor/autosize fidelity engine with deterministic rect computation and container-aware frame mapping:
  - `src/lib/layout-fidelity/anchor-engine.ts`
- DDR flag-to-anchor import mapping:
  - `scripts/import-ddr-layouts.mjs`
  - `src/lib/layout-model.ts`
- Style resolution stack wired into browse renderer:
  - `src/lib/layout-fidelity/style-resolver.ts`
  - `components/browse-mode.tsx`
- ObjectId-based interaction routing integrated into browse runtime:
  - `src/lib/layout-fidelity/interaction-router.ts`
  - `components/browse-mode.tsx`
- Debug overlay parity instrumentation for active object frame/style/anchor diagnostics (`?debugRuntime=1`).
- Added fidelity-engine tests and script:
  - `src/lib/layout-fidelity/anchor-engine.test.mts`
  - `src/lib/layout-fidelity/style-resolver.test.mts`
  - `src/lib/layout-fidelity/interaction-router.test.mts`
  - `npm run test:layout-fidelity-engines`

### Still partial
- Dynamic state-style parity remains heuristic (full FileMaker style-state import is not complete).
- Some advanced DDR object/style tokens still degrade gracefully to fallback behavior.

## C) Prioritized Backlog (Post-Phase-5 P0 Baseline)

## P0
1. Phase 7 follow-up hardening
- Acceptance: importer-generated routing is richer and requires fewer manual TO→API layout mappings.
- Tests: DDR multi-file import fixture tests that verify populated `routing.toIndex` and cross-file relationship edges.

2. ProjectTracker->Common live parity verification
- Acceptance: live FM integration confirms ProjectTracker layout CRUD in Common file for configured TO mappings.
- Tests: `FM_INTEGRATION_TESTS=1` scenario tests with explicit `workspace=projecttracker` and mapped TO writes.

3. Cross-file script and portal edge cases
- Acceptance: script-triggered `Set Field`/portal row CRUD always routes to target DB/layout when TO belongs to dependency file.
- Tests: multi-file script/portal routing integration tests (mocked + live when available).

4. Cross-file permission UX polish
- Acceptance: inaccessible dependency files surface consistent read-only placeholders and actionable status messages in browse runtime.
- Tests: mock capability/permission-denied response-path UI tests.

5. Trigger and script parity hardening
- Acceptance: richer trigger condition matrix and action payload compatibility for common FileMaker script flows.
- Tests: trigger order + veto + payload snapshots for browse/find transitions.

6. Relationship traversal hardening
- Acceptance: relationship graph-aware context transitions for related-record navigation.
- Tests: portal row -> related layout -> back-stack consistency tests.

7. Portal commit reliability against real FM schemas
- Acceptance: robust related-write layout resolution and field-level validation error normalization.
- Tests: FM integration scenarios with multiple related TOs and strict field validation.

8. Find and saved-search parity hardening
- Acceptance: richer operator UX coverage, stronger modify-last-find parity, and resilient handling when schema/layout references drift.
- Tests: saved-find run/modify/re-save regression and warning-path assertions.

## P1
1. Deep portal parity
- Acceptance: row creation/deletion rules, keyboard navigation, stable large-related-set behavior.
- Tests: portal lifecycle integration cases + regression matrix expansion.

2. Conditional formatting + button bar parity
- Acceptance: calc-driven object formatting and stateful button bar segment behavior.
- Tests: runtime parity integration with calc failure fallbacks.

3. Export/print parity
- Acceptance: deterministic found-set export (CSV/JSON) and pragmatic print layout flow.
- Tests: output-shape coverage and print regression checks.

4. Layout mode power-user parity
- Acceptance: broader arrange/align/group/lock tools, improved inspector depth, and schema/value-list management ergonomics.
- Tests: deterministic layout model operation tests and workspace persistence checks.

## P2
1. Offline-ish resilience
- Acceptance: queued commits/retries with reconnect UX and conflict messaging.
- Tests: queue reducer + reconnect simulations.

2. Performance + observability
- Acceptance: debug profiler metrics, request timing traces, and controlled retry/backoff handling.
- Tests: cache TTL and profiler rendering checks.
3. Dynamic saved found sets
- Acceptance: query-backed saved found sets that can replay and reconcile stale record IDs.
- Tests: replay/merge/record-missing behavior tests.

# Phase 13 Plan: Full Developer Tooling

Date: 2026-03-02

## Scope
Phase 13 adds developer-first tooling on top of existing runtime/workspace parity:
- Schema snapshots and versioning
- Schema diff engine with deterministic output + rename confidence
- Visual relationship graph for multi-file workspaces
- Impact analysis across layouts/scripts/value lists/menus/portals
- Migration plan generation + workspace-safe apply flow
- Developer reports (JSON/Markdown, CI-friendly)

This phase is additive. Runtime kernel behavior is not rewritten.

## Current Inventory

## 1) Schema + workspace model
- Multi-file workspace config and routing model:
  - `/Users/deffenda/Code/FMWebIDE/src/server/workspace-context.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/workspace-multifile.ts`
- Relationship graph parser from DDR:
  - `/Users/deffenda/Code/FMWebIDE/src/server/ddr-relationship-graph.ts`
- Layout storage and index mapping:
  - `/Users/deffenda/Code/FMWebIDE/src/server/layout-storage.ts`
- App-layer workspace metadata persistence:
  - `/Users/deffenda/Code/FMWebIDE/src/server/app-layer-storage.ts`

## 2) DDR import coverage
- DDR import pipeline:
  - `/Users/deffenda/Code/FMWebIDE/scripts/import-ddr-layouts.mjs`
  - writes workspace-local layout JSON + `layout-fm-map.json` + workspace metadata.
- Multi-file solution import endpoint:
  - `/Users/deffenda/Code/FMWebIDE/app/api/workspaces/import/route.ts`

## 3) Existing manager capabilities
- Manage Database/Layouts/Scripts/Value Lists etc. in Layout Mode:
  - `/Users/deffenda/Code/FMWebIDE/components/layout-mode.tsx`
- App-layer capabilities + disabled rationale UX:
  - `/Users/deffenda/Code/FMWebIDE/src/config/appLayerCapabilities.ts`

## 4) Existing references we can leverage
- Script catalog + DDR script parsing:
  - `/Users/deffenda/Code/FMWebIDE/src/server/script-workspace.ts`
- Value-list retrieval and normalization:
  - `/Users/deffenda/Code/FMWebIDE/src/server/filemaker-client.ts`
- Saved-search/found-set storage patterns:
  - `/Users/deffenda/Code/FMWebIDE/src/server/saved-search-storage.ts`

## Key Gaps Blocking Developer Tooling

1. No canonical schema snapshot model shared across tools.
2. No deterministic diff engine for workspace vs DDR/baseline.
3. No first-class impact analyzer linking schema changes to layouts/scripts.
4. No migration-plan model or workspace apply engine.
5. Relationship graph UX exists for raw DDR, but not as a multi-file dev-tools graph with filtering/path tracing and report/export integration.
6. No dedicated `test:dev-tools` suite.

## P0 / P1 / P2 Backlog

## P0
1. Schema snapshot model + storage
   - `src/lib/schemaSnapshot/*`
   - `src/server/schema-snapshot-storage.ts`
   - create/list/tag snapshots per workspace, deterministic ordering.
2. Schema diff engine
   - `src/lib/schemaDiff/*`
   - deterministic diff with probable rename confidence.
3. Relationship graph builder (snapshot-based)
   - `src/lib/relationshipGraph/*`
   - multi-file nodes/edges/layout entry points + filters/search/path.
4. Impact analysis engine
   - `src/lib/impactAnalysis/*`
   - reference indexing + breakage scoring/recommendations.
5. Developer tools API + hub wiring
   - `/api/workspaces/[workspaceId]/developer-tools`
   - Layout Mode “Developer Utilities” routed to a Developer Tools hub.
6. Test suite
   - `npm run test:dev-tools`
   - snapshot/diff/graph/impact correctness fixtures.

## P1
1. Migration engine
   - `src/lib/migrations/*`
   - generate safe-by-default plans, apply to workspace schema overlay.
2. Migration plan persistence + apply reports
3. Hub UX for migration generation/apply and report export.

## P2
1. CI-friendly report command output (non-zero exit behavior for breaking diffs).
2. Optional live FileMaker apply flow behind explicit feature flag and dry-run (documentation-first if not safely supportable).

## Acceptance Criteria

1. Developer can create baseline/target snapshots for a multi-file workspace.
2. Developer can diff snapshots with stable results and confidence-tagged probable renames.
3. Developer can view relationship graph across files, filter/search, and inspect node details.
4. Developer can run impact analysis and see affected layouts/scripts/value-lists/menus/portals.
5. Developer can generate migration plan (safe by default) and apply to workspace schema overlay.
6. Developer can export diff/impact/migration reports in JSON/Markdown.
7. `npm run test:dev-tools` passes with deterministic fixtures.

## Non-goals

1. No unguarded live FileMaker schema mutation.
2. No runtime-kernel rewrite.
3. No attempt to fully replicate every FileMaker desktop schema-edit capability in this phase.

## Risk Notes

1. DDR variability and partial metadata
   - Mitigation: confidence scoring, “best effort” flags, deterministic fallback behavior.
2. Large graph performance
   - Mitigation: memoized graph build, filtered views, lightweight SVG rendering.
3. Unsafe migrations
   - Mitigation: safe defaults, destructive steps opt-in only, explicit risk labels.

## Backward Compatibility

1. Snapshot and migration data stored in separate workspace files (`schema-snapshots.json`, `migration-plans.json`, `workspace-schema.json`) to avoid breaking existing workspace config/layout storage.
2. Existing app-layer menus stay intact; Developer Tools hub is additive.

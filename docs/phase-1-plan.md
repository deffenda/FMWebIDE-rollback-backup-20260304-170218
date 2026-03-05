# Phase 1 Plan (Parity Foundation: Architecture + Data Model)

Date: 2026-03-03

## Objective
Establish the foundational parity baseline for the 14-phase program with deterministic DDR ingestion, runtime layout model visibility, and machine-readable parity reporting exposed in-app.

## Verified Current Foundation
- DDR ingestion and normalization pipeline already exists:
  - `/Users/deffenda/Code/FMWebIDE/scripts/import-ddr-layouts.mjs`
  - `/Users/deffenda/Code/FMWebIDE/app/api/workspaces/import/route.ts`
- Runtime layout model exists and is shared by layout/browse rendering:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/layout-model.ts`
  - `/Users/deffenda/Code/FMWebIDE/components/layout-mode.tsx`
  - `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`
- Feature flags and security/logging infrastructure are in place:
  - `/Users/deffenda/Code/FMWebIDE/src/config/featureFlags.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/security/request-context.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/observability.ts`

## Phase 1 Gap to Close
- A formal parity-matrix JSON schema/report was not exposed as a first-class artifact for runtime diagnostics.
- There was no dedicated internal diagnostics page to inspect parity summary plus concrete layout object bounds/hierarchy in one place.

## Implementation Plan
1. Add a typed parity report model + schema:
   - `src/lib/parity-matrix-report.ts`
2. Extend audit generation to emit:
   - `docs/audit/Parity_Matrix_FileMaker_vs_FMWebIDE.json`
   - `docs/audit/Parity_Matrix_FileMaker_vs_FMWebIDE.schema.json`
3. Add a server diagnostics aggregator for:
   - parity report + schema
   - baseline summary
   - workspace layout object/bounds snapshot (synthetic fallback)
4. Expose diagnostics through:
   - `GET /api/admin/parity`
   - `/diagnostics/parity` page
5. Add automated tests for:
   - parity report determinism/schema shape
   - diagnostics payload integrity
   - basic UI diagnostics smoke (object count + bounds visibility)

## Acceptance Criteria
- DDR ingestion for multi-file fixtures remains functional and unchanged.
- At least one layout renders object hierarchy + bounding boxes in diagnostics (workspace or deterministic synthetic fallback).
- Audit run emits parity JSON + schema artifacts deterministically.
- Internal diagnostics page shows:
  - parity summary counts
  - layout object count
  - per-object bounds table and stage overlay

## Test Plan
- Unit:
  - `src/lib/parity-matrix-report.test.mts`
- Integration/server:
  - `src/server/parity-diagnostics.test.mts`
- UI/E2E:
  - `tests/ui/native-parity/phase1-foundation.spec.mts`

## Rollout
- This phase ships enabled by default because all additions are additive diagnostics/reporting, not behavior-breaking runtime rewrites.

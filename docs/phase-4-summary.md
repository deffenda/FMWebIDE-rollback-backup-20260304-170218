# Phase 4 Summary (Runtime Parity)

Date: 2026-03-01

## Features Delivered

### 1) Find Mode Parity (P0)
- Added reusable find-request engine:
  - `src/lib/find-mode.ts`
- Added FileMaker `_find` proxy route:
  - `app/api/fm/find/route.ts`
- Extended FileMaker client:
  - `src/server/filemaker-client.ts`
  - new `findRecords(...)` helper with live + mock fallback paths.
- Integrated in browse runtime:
  - `components/browse-mode.tsx`
  - multi-request include/omit translation
  - constrain found set
  - extend found set
  - replay last find in debug mode.

### 2) Sort/Group/Subsummary Engine (P0)
- Added deterministic sorting/reporting helpers:
  - `src/lib/sort-reporting.ts`
- Integrated grouped table/list rendering in browse runtime:
  - stable sort ordering
  - leading/trailing group rows
  - leading/trailing/grand summary rows
  - aggregate support: `count`, `sum`, `avg`, `min`, `max`.

### 3) Field Engine (Validation + Auto-enter) (P0)
- Added field behavior engine:
  - `src/lib/field-engine.ts`
- Added layout model props for validation/auto-enter metadata:
  - `src/lib/layout-model.ts`
- Integrated in browse runtime create + commit paths:
  - `components/browse-mode.tsx`
  - commit-time validation blocks invalid saves
  - auto-enter rules applied on create and on modify.

### 4) Debug Overlay Enhancements (P0)
- Extended `?debugRuntime=1` overlay with:
  - find session summary + request index/count
  - last find payload JSON
  - active sort/group snapshot
  - field validation error counts
  - actions: `Replay Find`, `Copy Parity Snapshot`.

### 5) Regression/Parity Checklist v4
- Expanded runtime parity checklist categories in:
  - `src/lib/runtime-parity.test.mts`
- Expanded FileMaker integration checklist output to `v4` in:
  - `src/server/filemaker-regression.test.mts`

## Tests Added

- `src/lib/find-mode.test.mts`
- `src/lib/sort-reporting.test.mts`
- `src/lib/field-engine.test.mts`
- `src/lib/runtime-parity.test.mts` (new Phase 4 categories)
- `src/server/filemaker-regression.test.mts` (Parity Checklist v4 coverage additions)

## Validation Runs

- `npm run typecheck`
- `npm test`
- `npm run build`

## Remaining Gaps (Phase 5 candidates)

1. Deep portal parity:
- row lifecycle policy matrix
- portal keyboard ergonomics
- large related-set virtualization/fetch strategies.

2. Conditional formatting + button bar parity:
- broader calc-driven style application and object-state parity.

3. Export/print parity:
- richer found-set export workflows and print/PDF behaviors.

4. Optional resilience/performance:
- commit queue/retry, reconnect UX, profiler + trace telemetry.

# Phase 14 Summary: Performance & Scalability

Date: 2026-03-02

## Scope Completed
Phase 14 focused on runtime/tooling performance for large found sets and heavy view rendering paths.

## Delivered Optimizations

### 1) Found set scalability primitives
- Upgraded found set state to support page metadata:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/types.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/foundset-store.ts`
- Added page attach and sparse index navigation support in tests:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/foundset-store.test.mts`

### 2) List/Table/Portal virtualization
- Added reusable windowing utility:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/performance/virtual-window.ts`
- Integrated list/table virtual windows + spacers in browse runtime:
  - `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`
  - `/Users/deffenda/Code/FMWebIDE/app/globals.css`
- Added portal virtualization with per-portal viewport tracking in browse runtime.

### 3) Data access performance
- Added bounded request caches with in-flight coalescing:
  - `/Users/deffenda/Code/FMWebIDE/src/server/performance/request-cache.ts`
- Added cache/dedup integration in FileMaker client read paths:
  - `/Users/deffenda/Code/FMWebIDE/src/server/filemaker-client.ts`
- Added mutation-driven read-cache invalidation and retry/backoff for 429/5xx.
- Added paging/projection controls for records API:
  - `/Users/deffenda/Code/FMWebIDE/app/api/fm/records/route.ts`

### 4) Feature flags + diagnostics
- Added performance-oriented runtime flags:
  - `/Users/deffenda/Code/FMWebIDE/src/config/featureFlags.ts`
- Extended debug payload/model to include request cache stats and virtual window state:
  - `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`

### 5) Bench harness + CI gate path
- Added deterministic benchmark runner:
  - `/Users/deffenda/Code/FMWebIDE/scripts/bench-perf.mts`
- Added command wiring:
  - `npm run bench:perf`
  - `npm run test:perf-primitives`

## Performance Budgets vs Current Results
- `virtual-window-sweep-100k`: budget `120ms`, result `0.99ms` (PASS)
- `table-display-build`: budget `2000ms`, result `104.51ms` (PASS)
- `find-and-sort-100k`: budget `1600ms`, result `118.88ms` (PASS)
- `portal-virtual-window-sweep-10k`: budget `100ms`, result `0.15ms` (PASS)

Report source:
- `/Users/deffenda/Code/FMWebIDE/data/perf/bench-latest.json`

## Tests Added/Validated
- `npm run test:perf-primitives`
- `npm run test:runtime-kernel`
- `npm run test:workspace-multifile`
- `npm run test:list-table-runtime`
- `npm run test:feature-flags`
- `npm run test:fm-regression` (skips live integration when FileMaker env is not active)
- `npm run typecheck`

## Remaining Hotspots (Phase 15 Candidates)
- FMCalc-lite dependency-based memoization at evaluator level (currently runtime-side reductions are stronger than evaluator-internal caching).
- Preview-mode progressive page rendering and heavy print-layout memoization.
- Real-world latency/load benchmarks against live FileMaker servers (beyond deterministic synthetic benchmark).
- Portal filter/sort dependency-hash invalidation to further reduce re-evaluation under complex related edits.


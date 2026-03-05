# Phase 14 Plan: Performance & Scalability (100k+)

Date: 2026-03-02

## Scope
Phase 14 is focused on runtime/tooling performance and stability at enterprise scale (100k+ found sets, 10k+ portal rows, multi-file workspaces). No major parity feature expansion is included unless it directly improves throughput, latency, or reliability.

## A) Current State Audit (Hot Paths + Bottlenecks)

### 1) Found set navigation and state
- Kernel found sets currently store `recordIds` as a full array in memory:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/types.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/foundset-store.ts`
- This is simple and deterministic, but memory-heavy at 100k and expensive for full-list operations.

### 2) Browse list/table rendering
- Browse runtime renders full arrays for list and table views (`listRecords.map`, `tableRows.map`) with no windowing:
  - `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`
- This causes excessive React work and scroll jank with large record sets.

### 3) Portal rendering
- Portals are filtered/sorted per render and then sliced; no true virtual window over large related rows:
  - `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/portal-utils.ts`

### 4) Data access layer and request shaping
- `/api/fm/records` currently returns up to a static limit and does not expose robust paging/projection controls:
  - `/Users/deffenda/Code/FMWebIDE/app/api/fm/records/route.ts`
- `getRecords` / `findRecords` in server client perform direct requests but currently lack in-flight dedup + bounded read caches:
  - `/Users/deffenda/Code/FMWebIDE/src/server/filemaker-client.ts`

### 5) FMCalc-lite evaluation overhead
- FMCalc evaluator parses expressions on each call and evaluates repeatedly across render paths:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/fmcalc/index.ts`
- No dependency-aware result caching is currently visible in core evaluator.

### 6) Script/trigger churn
- Trigger and script systems are robust but can produce frequent UI updates in heavy layouts:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/triggers/index.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/script-engine.ts`
  - `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`

### 7) Developer tooling (Phase 13) scale risk
- Snapshot/diff/graph tooling is present and deterministic, but large graph rendering and repeated indexing can be costly without strict memoization:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/schemaSnapshot/*`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/schemaDiff/*`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/relationshipGraph/*`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/impactAnalysis/*`

## B) Performance Budgets (Phase 14 Targets)

These are target budgets for local development hardware and CI mock benchmarks.

- Workspace open to interactive: `< 3.0s`
- Browse list/table scroll at large scale: maintain smooth frame pacing (target 50–60 FPS equivalent under virtualization)
- Open record from list/table:
  - warm cache: `< 200ms`
  - cold path: `< 800ms`
- Next/Prev record UI update: `< 100ms` (data fetch may complete asynchronously)
- Portal scroll (10k rows): virtualized; no full DOM row render
- FMCalc parse/eval overhead:
  - repeated expressions should hit parse cache
  - avoid repeated full-expression parse on unchanged expressions
- Memory constraints:
  - no unbounded read caches
  - bounded page caches with TTL + LRU

## C) Benchmark Protocol

Synthetic datasets and deterministic scenarios are required.

### Dataset profiles
- `foundset-100k`: 100,000 record IDs + synthetic row payloads
- `records-1k-detail`: 1,000 detailed records for repeated open/commit reads
- `portal-10k`: 10,000 related rows with mixed field types

### Scenarios
1. List virtualization scroll sweep
2. Table virtualization scroll sweep
3. Repeated open-record navigation (cold + warm)
4. Find + sort + regroup pipeline on large synthetic sets
5. Portal virtual scroll + filter/sort pass
6. Script-heavy layout-enter profile (calc + trigger churn)

### CI outputs
- JSON metrics artifact
- Text summary with pass/fail against thresholds
- Non-zero exit on threshold regressions

## D) Implementation Backlog

### P0 (Required)
1. Found set paging data model (kernel-level) with lazy page map
2. List/table virtualization and render boundary optimization
3. Portal virtualization and incremental row rendering
4. Data-access dedup + bounded cache + request shaping
5. FMCalc parser/result cache baseline
6. Perf profiler diagnostics + trace IDs in debug overlay
7. `bench:perf` deterministic benchmark harness + threshold gate

### P1 (High value)
1. Preview progressive rendering (visible-first)
2. Trigger/script throttling and de-churn rules
3. Incremental developer-tools graph/index optimization

### P2 (Optional)
1. Offline-ish commit queue hardening for high-latency links
2. Extended CI environment matrix for perf variability

## E) Acceptance Criteria

- List/table views no longer render full row sets when virtualization is enabled.
- Portal rows use virtual windows when vertical scrolling is enabled.
- Read-path server calls support paging parameters and avoid duplicate concurrent requests.
- Caches are bounded and include invalidation hooks for record mutations.
- FMCalc repeated evaluation avoids repeated parse overhead.
- `npm run bench:perf` produces deterministic JSON and enforces thresholds.
- Existing regression suites pass without behavior regressions.

## F) Risks and Mitigations

- **Risk:** Virtualization edge cases with summary/group rows.
  - **Mitigation:** fixed-row-height model for P0 + deterministic tests.
- **Risk:** Cache staleness after CRUD.
  - **Mitigation:** mutation-driven cache invalidation and conservative TTL.
- **Risk:** Large browse component complexity.
  - **Mitigation:** isolate new logic into small utilities and keep behavior flags.
- **Risk:** Data API variability across servers.
  - **Mitigation:** route-level fallback behavior and benchmark fixtures in mock mode.

## G) Feature Flags (Phase 14)

Planned additions:
- `viewVirtualizationEnabled` (default: on)
- `portalVirtualizationEnabled` (default: on)
- `perfRequestCachingEnabled` (default: on)
- `perfBenchmarkGateEnabled` (default: on in CI)


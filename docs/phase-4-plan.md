# Phase 4 Plan (Runtime Parity)

Date: 2026-03-01

## 1) Verified Phase 3 Completion Inventory

### Runtime kernel + state coordination
- Kernel coordinator:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/kernel.ts`
- Found set store:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/foundset-store.ts`
- Window manager:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/window-manager.ts`
- Script executor:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/script-engine.ts`
- Variable semantics:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/variable-store.ts`
- Context stack:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/context-stack.ts`
- Script workspace mapping:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/script-workspace-mapper.ts`

### Runtime integration
- Browse runtime kernel wiring and debug snapshot integration:
  - `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`

### Existing test coverage for Phase 3
- `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/*.test.mts`
- `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-parity.test.mts`
- `/Users/deffenda/Code/FMWebIDE/src/server/filemaker-regression.test.mts`

## 2) Remaining Parity Gaps (from runtime gap report + current code)

1. Find mode is rich in UI state but still mostly client-filtered and not modeled as a reusable find-session engine with robust server translation.
2. Constrain/Extend found set semantics are not first-class and not exposed as dedicated reusable operations.
3. Sort/group/subsummary are implemented in browse component logic, but not extracted as a deterministic reporting engine with dedicated tests.
4. Field validation + auto-enter rules are not centralized in a field engine and are not enforced consistently pre-commit.
5. Advanced portal parity (large-set performance, row lifecycle policy matrix, keyboard traversal guarantees) remains partial.
6. Conditional formatting/button bar stateful parity is partial and not fully rule-engine-driven.
7. Export/print workflows are basic (`window.print`, container export) and lack full found-set CSV/JSON export parity.
8. Observability/profiling/rate limiting are still basic.

## 3) Phase 4 Backlog (P0/P1/P2)

## P0

### A) Full Find Mode Parity (requests/omit/constrain/extend/saved-find execution model)
User-visible behavior:
- multi-request find with omit semantics remains deterministic
- constrain found set and extend found set actions available in runtime menus
- saved finds execute using the same normalized request model

Runtime modules impacted:
- new: `src/lib/find-mode.ts`
- new route: `app/api/fm/find/route.ts`
- server: `src/server/filemaker-client.ts` (find endpoint support)
- browse integration: `components/browse-mode.tsx`

Acceptance criteria:
- find requests can be translated to FileMaker Data API JSON query format
- omit requests execute correctly
- constrain and extend update visible found set consistently
- fallback to mock/client behavior stays deterministic

Tests:
- `src/lib/find-mode.test.mts`
- integration additions in `src/server/filemaker-regression.test.mts`

### B) Sort + Group + Subsummary parity engine (v1)
User-visible behavior:
- stable sort/group rendering in list/table
- subsummary and grand summary output remains deterministic through view changes

Runtime modules impacted:
- new: `src/lib/sort-reporting.ts`
- browse integration: `components/browse-mode.tsx`

Acceptance criteria:
- sort normalization and comparison support mixed values/nulls
- grouping and summary generation are deterministic
- current behavior preserved while logic is moved behind reusable helpers

Tests:
- `src/lib/sort-reporting.test.mts`

### C) Field engine (validation + auto-enter core)
User-visible behavior:
- commit blocks when fields fail required/type/range/custom-calc validation
- new records apply auto-enter defaults (timestamp/user/serial/calc where modeled)
- validation errors are visible in status/debug context and do not crash runtime

Runtime modules impacted:
- new: `src/lib/field-engine.ts`
- browse integration: `components/browse-mode.tsx` (`createNew`, `commitEditSession`, and field save flow)

Acceptance criteria:
- hard validation on commit; soft validation utility available
- auto-enter defaults applied on new record payload creation
- existing portal and script commit behavior remains stable

Tests:
- `src/lib/field-engine.test.mts`
- `src/lib/runtime-parity.test.mts` expansion

## P1

### D) Deep portal parity
User-visible behavior:
- explicit portal row lifecycle helpers
- better keyboard/tab traversal support
- stable sort/filter + active row behavior with larger related sets

Modules:
- `components/browse-mode.tsx`
- `src/lib/portal-utils.ts` (extend)

Acceptance:
- create/edit/delete/revert portal rows remain deterministic and policy-aware
- no regressions to existing portal tests

Tests:
- `src/lib/portal-utils.test.mts` expansion
- FM regression portal cases expansion

### E) Conditional formatting + button bar + stateful UI
User-visible behavior:
- calc-driven style changes for key object classes
- button bar state awareness

Modules:
- `components/browse-mode.tsx`
- `src/lib/fmcalc/*` and layout runtime style helpers

Acceptance:
- formatting rules evaluate safely and degrade on calc errors

Tests:
- runtime parity tests for conditional formatting behavior

### F) Export/print parity
User-visible behavior:
- export current found set/current record to CSV/JSON
- maintain browser print workflow with clearer "print layout" behavior

Modules:
- `components/browse-mode.tsx`
- optional server export route if needed

Acceptance:
- deterministic export ordering
- no leakage of hidden/non-viewable fields by default

Tests:
- export helper tests
- regression checks for output shape

## P2

### G) Offline-ish resilience
User-visible behavior:
- queued commit retries and reconnect UX

Modules:
- new resilience helper/store
- browse integration

Acceptance:
- queue + retry/backoff deterministic in mock tests

Tests:
- queue reducer tests + simulated reconnect tests

### H) Performance + observability
User-visible behavior:
- debug profiler snapshot for key runtime counters
- request timing/correlation IDs in debug mode

Modules:
- browse debug overlay
- server request wrappers (timing metadata)

Acceptance:
- profiler info available via `?debugRuntime=1`
- no production regressions

Tests:
- cache/profiler helper tests

## 4) Explicit Non-Goals (Phase 4)

1. Full 1:1 replication of every FileMaker script step and every dialog workflow.
2. Replacing the existing browse/layout architecture with a new framework.
3. Implementing full offline-first sync/conflict resolution across multiple devices.
4. Native OS printing APIs or non-web rendering engines beyond pragmatic browser/server output.
5. Full security model redesign (we keep existing server-side credential proxy model).

# Phase 3 Plan (Runtime Parity)

Date: 2026-03-01

## 1) Current Implementation Inventory

### Runtime/UI
- Primary runtime renderer and interaction flow:
  - `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`
- Current runtime capabilities include:
  - FMCalc-lite-based visibility/tooltip/filter evaluation
  - edit-session staging/commit/revert
  - portal active row/sort/filter
  - tab runtime state + URL token
  - trigger bus + commit-request veto
  - value-list cache + mapping
  - privilege gating and debug overlay

### Core libraries in place
- Calculations: `/Users/deffenda/Code/FMWebIDE/src/lib/fmcalc/index.ts`
- Edit lifecycle: `/Users/deffenda/Code/FMWebIDE/src/lib/edit-session/index.ts`
- Portals: `/Users/deffenda/Code/FMWebIDE/src/lib/portal-utils.ts`
- Tabs: `/Users/deffenda/Code/FMWebIDE/src/lib/tabs-runtime.ts`
- Triggers: `/Users/deffenda/Code/FMWebIDE/src/lib/triggers/index.ts`
- Trigger commit policy: `/Users/deffenda/Code/FMWebIDE/src/lib/trigger-policy.ts`
- Value-list cache: `/Users/deffenda/Code/FMWebIDE/src/lib/value-list-cache.ts`
- Privilege map: `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-capabilities.ts`

### Server integration
- Data routes (layouts/fields/records/scripts/value-lists/container):
  - `/Users/deffenda/Code/FMWebIDE/app/api/fm/*`
- Script workspace payload route:
  - `/Users/deffenda/Code/FMWebIDE/app/api/fm/script-workspace/route.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/script-workspace.ts`

## 2) Confirmed Phase 3 Gaps

1. No first-class Found Set store with stable IDs and cross-layout/window attachment.
2. No multi-window manager with independent navigation/found-set/mode state.
3. No script execution engine for FileMaker-like script steps (local FM Script-lite).
4. No variable store implementing proper `$local` vs `$$global` scoping semantics.
5. No explicit context stack for TO/layout/record/portal traversal.
6. Debug overlay does not yet show window stack/found set IDs/context frames/script status/variables from a unified kernel.

## 3) Phase 3 Design Decisions

### A) Runtime Kernel module (new)
- Add a central kernel state layer in `/src/lib/runtime-kernel/*`.
- Kernel is deterministic and pure-reducer based where possible.
- Browse UI remains source-of-truth for existing behavior initially; kernel is integrated incrementally to avoid regressions.

### B) Found set model
- Introduce `FoundSet` entities with IDs and metadata (`querySpec`, `recordIds`, `currentIndex`, timestamps).
- Support attach/detach to windows and record navigation helpers.
- Keep existing record fetch routes; kernel starts with in-memory result ID lists and can be extended to paged fetches later.

### C) Multi-window model
- Add `WindowDescriptor` state with `main` + `card` window types.
- Track per-window layout/mode/foundSet/navigation history.
- Keep card UI integration feature-flagged and non-breaking.

### D) Script engine (FM Script-lite)
- Create a deterministic step executor with adapter hooks into kernel actions.
- Implement P0 step subset only; bridge unknown steps/server script calls to existing script route.
- Keep engine feature-flagged (`NEXT_PUBLIC_RUNTIME_ENABLE_SCRIPT_ENGINE`).

### E) Variables + context stack
- Add variable store:
  - `$local` scope per script call frame
  - `$$global` scope per session
- Add context stack frames capturing window/layout/TO/record/foundSet/portal context.
- Integrate variable references into script engine first; FMCalc variable resolution remains additive.

## 4) Prioritized Backlog (P0/P1/P2)

## P0

### 1. Runtime Kernel + FoundSet store
Acceptance criteria:
- Kernel supports:
  - create/attach/refresh found set
  - first/prev/next/last/index/recordId navigation
- Found-set state includes ID, source, querySpec, record IDs, current index.
- Unit tests cover transitions and index preservation behavior.

### 2. Window manager + card stack semantics
Acceptance criteria:
- Kernel supports open/focus/close windows.
- Per-window layout/mode/found-set tracking works independently.
- Dirty-close guard hook is supported for card windows.
- Unit tests cover multi-window state changes.

### 3. Script engine (FM Script-lite P0 subset)
Acceptance criteria:
- Step execution with call stack and error model.
- Supported steps include core navigation/control/data subset.
- `Perform Script` sub-call and server-bridge step supported.
- Unit tests cover control flow and error propagation.

## P1

### 4. Variables store and integration
Acceptance criteria:
- `$` local scoping and `$$` global scoping are enforced.
- Script frames isolate locals.
- Globals are shared across windows/session.
- Tests cover lifetime behavior.

### 5. Context stack + relationship traversal helpers
Acceptance criteria:
- push/pop context frames for portal/related navigation.
- resolve field references with explicit/implicit TO.
- guardrails on missing relationship/context.
- Tests for resolution rules and stack transitions.

## P2

### 6. Browse runtime integration expansion
Acceptance criteria:
- Status area reads kernel found-set info.
- Debug overlay shows kernel snapshot (windows/found-sets/context/script/variables).
- “Copy Runtime Snapshot” uses kernel state (redacted).

### 7. Phase 3 regression matrix expansion
Acceptance criteria:
- new test scripts added to `npm test` chain.
- runtime parity checklist includes phase-3 capabilities.

## 5) Risks and Feature Flags

### Risks
- `browse-mode.tsx` is already very large; over-integration risks regressions.
- Ambiguity between native FileMaker script semantics and current web runtime APIs.
- Relationship traversal accuracy depends on available DDR graph metadata quality.

### Feature flags
- `NEXT_PUBLIC_RUNTIME_ENABLE_SCRIPT_ENGINE` (default `0` in prod, `1` in dev).
- `NEXT_PUBLIC_RUNTIME_ENABLE_MULTI_WINDOW` (controls new window manager UI paths).
- Existing popover/card flags remain respected.

## 6) Testing Strategy
- Add focused unit tests for each kernel submodule first.
- Add integration-style runtime parity tests at helper/kernel level.
- Keep existing test suites green before enabling UI wiring by default.

# Parity Audit (Phase 8)

Date: 2026-03-01

Legend:
- `Full` = implemented with production runtime path
- `Partial` = implemented with known limitations
- `Emulated` = intentionally modeled approximation
- `Not feasible` = intentionally out-of-scope in browser runtime for now

## Scripting & Runtime Behavior

- Advanced script steps (loop, else-if, mode switches, omit/show omitted): `Partial`
- Nested call stack with `$` local frames and `$$` globals: `Full`
- `Get(LastError)` / `Get(LastMessage)` runtime semantics: `Partial`
- `Set Error Capture` halt/continue behavior: `Full`
- Script step tracing in debug overlay: `Full`
- Interactive debugger parity with native Script Debugger: `Not feasible` (web runtime boundary)

## Transactions

- Script-level begin/commit/revert transaction staging: `Emulated`
- Consolidated failure + rollback guidance: `Partial`
- Cross-file ACID guarantees identical to native server transaction engine: `Not feasible`

## Reporting & Summary

- Shared aggregate engine (count/sum/avg/min/max): `Full`
- Group-level summary calculations in list/table helpers: `Full`
- Running totals / percent-of-total: `Partial` (planned next)
- Native print pagination/subsummary page-break parity: `Partial`

## Layout Parts

- Header/body/footer rendering by mode: `Partial`
- Leading/trailing subsummary part fidelity: `Partial`
- Full native part-level print rules and edge behavior: `Not feasible` (browser print model constraints)

## Conditional Formatting

- Basic hide/calc visibility support: `Partial`
- Priority-ordered multi-rule formatting across all object classes: `Partial`
- Full native style engine equivalence: `Not feasible` (theme/style engine depth)

## Locking & Concurrency

- Local edit lock diagnostics (dirty-record awareness): `Emulated`
- Cross-session lock conflict UX: `Partial`
- Native host lock manager parity (all scenarios): `Not feasible` without tighter server coupling

## Performance & Scalability

- Found-set and value-list caching foundations: `Full`
- Debug perf counters (render/script/calc indicators): `Partial`
- Full profiler + large-solution benchmark automation: `Partial`

## Workspace & Multi-file

- Multi-file routing and target resolution: `Full`
- Cross-file CRUD routing with API layout mapping safeguards: `Full`
- Cross-file script/runtime edge-case parity matrix: `Partial`

## Phase 9 Targets

1. Running total and percent-of-total summaries.
2. Deeper conditional formatting engine with prioritized multi-rule pipelines.
3. First-class lock conflict resolution UI (keep mine / keep server merge assist).
4. Script debugger panel with explicit step/continue controls and breakpoints.
5. Higher-fidelity preview pagination and layout-part rule parity.

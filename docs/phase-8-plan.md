# Phase 8 Plan (Advanced Runtime Fidelity)

Date: 2026-03-01

## Verified Phase 1-7 Coverage Summary

The repository currently contains implemented foundations across earlier phases:

- FMCalc-lite + runtime integration:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/fmcalc/index.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-parity.test.mts`
- Edit lifecycle + dirty session semantics:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/edit-session/index.ts`
- Found sets, context stack, windows/card stack, variables:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/foundset-store.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/context-stack.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/window-manager.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/variable-store.ts`
- Script engine (subset):
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/script-engine.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/script-workspace-mapper.ts`
- Find/list/table/preview and status/menubar runtime:
  - `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/find-mode.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/list-table-runtime.ts`
- Multi-file workspace routing/session:
  - `/Users/deffenda/Code/FMWebIDE/src/server/workspace-multifile.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/filemaker-client.ts`
  - `/Users/deffenda/Code/FMWebIDE/app/api/fm/workspace-routing/route.ts`

## Remaining Parity Gaps Relevant to Phase 8

1. Script engine does not yet cover advanced control-flow and record-set oriented steps (Loop, Exit Loop If, Omit/Show Omitted, Replace Field Contents, Set Field By Name, etc.).
2. Set Error Capture is only partial; error propagation and Get(LastError)/Get(LastMessage) fidelity need deeper coverage.
3. Transaction semantics are not explicitly modeled in the runtime kernel/script engine.
4. Summary calculations exist in list/table helpers, but there is no dedicated summary-field engine with reusable context-level aggregate APIs.
5. Layout part/reporting behavior is still primarily renderer-driven and not modeled as a dedicated parts engine.
6. Conditional formatting remains minimal in the layout model/runtime.
7. Record-locking fidelity is limited.
8. Debug overlay lacks deep diagnostics for transactions, advanced script stack traces, and summary engine behavior.

## Phase 8 Roadmap

## P0 (this iteration)

1. Advanced script engine parity
- Expand supported script steps:
  - `Loop`, `Exit Loop If`, `Go to Related Record`, `Enter Preview Mode`, `Enter Browse Mode`,
    `Enter Find Mode`, `Replace Field Contents`, `Omit Record`, `Show Omitted Only`,
    `Show All Records`, `Set Field By Name`, `Set Variable By Name`, `Else If`.
- Add robust error model semantics:
  - maintain `lastError` and `lastMessage` after each step
  - expose `Get(LastError)` and `Get(LastMessage)` in expression resolution
  - respect `Set Error Capture` (halt vs continue behavior)
- Add script debug tracing state for step-level diagnostics.
- Acceptance:
  - complex nested scripts, loops, and error-capture flows pass tests
  - runtime kernel snapshot surfaces step-trace metadata

2. Transaction model (kernel + script level)
- Add transaction manager module with:
  - begin/commit/revert transactions
  - staged field operation queue
  - consolidated error reporting
- Add script steps:
  - `Begin Transaction`, `Commit Transaction`, `Revert Transaction`
- Integrate with script step execution via adapter bridge.
- Acceptance:
  - staged writes are applied only on commit
  - failures surface consolidated error and revert behavior

3. Summary/aggregate engine
- Add dedicated summary engine module that supports:
  - count/sum/min/max/avg
  - found-set, group, and portal scoped summaries
- Integrate current reporting helper to use shared summary calculations.
- Acceptance:
  - summary unit tests validate deterministic aggregate behavior
  - table/list/preview report helper behavior remains stable

4. Test expansion
- Add:
  - `test:script-advanced`
  - `test:transactions`
  - `test:summary-engine`
- Include new suites in `npm test`.
- Add Phase 8 parity indicators to regression outputs.

## P1 (next pass)

1. Layout parts/reporting fidelity expansion
- header/body/footer/subsummary part-aware rendering behaviors in preview/list.

2. Conditional formatting engine expansion
- priority-ordered multi-rule evaluation and portal row scope.

3. Record-locking fidelity
- conflict detection UX and lock-state diagnostics.

## P2 (next pass)

1. Performance/scalability pass
- enhanced caching strategy, lazy loads, summary cache invalidation, profiler counters.

## Risk Analysis

1. Script behavior drift risk
- Expanding step support can unintentionally alter existing scripts.
- Mitigation: additive step handlers, strict tests, default-safe unsupported behavior.

2. Transaction semantic ambiguity
- FileMaker server transactions do not map 1:1 to client-only staging.
- Mitigation: explicitly document runtime emulation boundaries in `docs/transactions.md`.

3. Regression risk in browse runtime
- Kernel-level changes can impact mode switching and script-trigger paths.
- Mitigation: keep browse integration additive and guarded; run full `npm test`.

4. Performance risk with trace/diagnostics
- Step traces can bloat state.
- Mitigation: bounded trace history and debug-only usage.

## Backward Compatibility

1. Layouts/scripts
- Existing script definitions remain valid; newly supported steps are additive.
- Unknown steps still normalize to comment/ignored-safe behavior.

2. Runtime kernel state
- New transaction and trace fields are optional and backward-safe in snapshots.

3. Tests and tooling
- Existing test suites remain runnable; new suites append coverage without replacing old paths.

# Script Engine Advanced (Phase 8)

Date: 2026-03-01

## Scope

Advanced runtime script behavior is implemented in:
- `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/script-engine.ts`
- `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/kernel.ts`
- `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/script-workspace-mapper.ts`

## Supported advanced steps

- Control flow:
  - `If`, `Else If`, `Else`, `End If`
  - `Loop`, `Exit Loop If`, `End Loop`
- Mode/navigation:
  - `Enter Browse Mode`
  - `Enter Find Mode`
  - `Enter Preview Mode`
  - `Go to Related Record`
- Found-set / record actions:
  - `Show All Records`
  - `Omit Record`
  - `Show Omitted Only`
  - `Replace Field Contents`
  - `Set Field By Name`
  - `Set Variable By Name`
- Transactions:
  - `Begin Transaction`
  - `Commit Transaction`
  - `Revert Transaction`

## Error fidelity

- `Set Error Capture` is honored:
  - capture off: failing step throws and halts
  - capture on: script continues and errors are available via runtime state
- `Get(LastError)` and `Get(LastMessage)` are resolved by script expression evaluation.
- `$$FM_LAST_ERROR`, `$$FM_LAST_MESSAGE`, and `$$FM_LAST_SCRIPT_RESULT` are updated during execution.

## Script call stack + tracing

- Nested `Perform Script` calls maintain independent `$local` frame scopes while sharing `$$globals`.
- Runtime emits bounded step traces (tail retained in kernel snapshots).
- Debug step mode hooks are available:
  - `scriptStepMode`
  - `awaitScriptStep` callback

## Tests

- `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/script-engine.test.mts`
- `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/script-engine-advanced.test.mts`

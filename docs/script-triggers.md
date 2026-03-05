# Script Triggers Runtime Parity

## Core Modules
- Trigger bus:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/triggers/index.ts`
- Commit-request trigger policy helper:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/trigger-policy.ts`
- Browse runtime integration:
  - `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`

## Trigger Events Emitted

### Layout
- `OnLayoutEnter`
- `OnLayoutExit`

### Mode
- `OnModeEnter`
- `OnModeExit`

### Record
- `OnRecordLoad`
- `OnRecordCommitRequest` (veto-capable)
- `OnRecordCommit`
- `OnRecordRevert`

### Object
- `OnObjectEnter:<field>`
- `OnObjectExit:<field>`
- `OnObjectModify:<field>`

## Commit Veto Flow
- Before commit, runtime evaluates layout rules with commit-request semantics.
- Trigger bus request listeners can veto the commit.
- Vetoed commits are surfaced in status/debug history and commit is aborted.

## Debug Overlay
With `?debugRuntime=1`:
- last trigger fired
- recent trigger history
- request/outcome status (including veto markers)

## Tests
- `/Users/deffenda/Code/FMWebIDE/src/lib/triggers/triggers.test.mts`
- `/Users/deffenda/Code/FMWebIDE/src/lib/trigger-policy.test.mts`
- `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-parity.test.mts`

## Limits
- Full script-step execution and all FileMaker-native trigger permutations are not complete.

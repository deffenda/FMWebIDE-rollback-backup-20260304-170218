# Commit/Revert Runtime Semantics

## Core Files
- Edit session model:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/edit-session/index.ts`
- Browse runtime integration:
  - `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`

## Session Model
Per dirty record:
- `snapshot` (last committed state)
- `dirtyFields`
- `portalOperations`

Global session:
- active flag
- record-state map
- start timestamp

## Runtime Lifecycle
- `Edit` starts/stages session context.
- Field and repeating-field edits stage before commit.
- Portal operations stage in same session.
- `Save` commits changed fields and staged portal ops only.
- `Cancel`/revert restores snapshot and clears staged ops.
- Dirty prompts guard navigation/layout switches.

## Trigger Integration
- `OnRecordCommitRequest` runs before commit (veto supported).
- `OnRecordCommit` emits after successful commit.
- `OnRecordRevert` emits on revert/discard flows.

## Find Mode Semantics
- Find requests and criteria remain separate from browse record mutation.
- Find-mode editing does not mutate browse found-set data.

## Tests
- `/Users/deffenda/Code/FMWebIDE/src/lib/edit-session/edit-session.test.mts`
- `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-parity.test.mts`
- `/Users/deffenda/Code/FMWebIDE/src/lib/trigger-policy.test.mts`

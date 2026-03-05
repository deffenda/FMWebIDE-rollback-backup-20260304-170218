# Saved Found Sets (Phase 5)

## Overview
FM Web IDE now supports saved found-set snapshots so developers can reopen a captured result set across sessions/workspaces.

Primary implementation:
- `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`
- `/Users/deffenda/Code/FMWebIDE/src/server/saved-search-storage.ts`
- `/Users/deffenda/Code/FMWebIDE/app/api/workspaces/[workspaceId]/saved-searches/route.ts`

## Snapshot Model
Saved found-set entries include:
- `id`
- `name`
- `layoutId`
- `tableOccurrence`
- `recordIds[]`
- `capturedAt`
- `source` (`manual` | `find` | `script`)
- optional persisted sort metadata

## Runtime Behavior
- Save current found set from status/find menus.
- Open saved found set to restore record list and navigation pointer behavior.
- Manage saved found sets (rename/duplicate/delete/export) from browse dialogs.

Safety behavior:
- Snapshot cap is enforced (default 5000 record IDs) with warning status.
- Missing record IDs are skipped safely when reopening.

## Limitations (Current)
- Phase 5 stores static record-id snapshots only.
- Dynamic query-backed replay for saved found sets remains planned (future phase).

## Tests
- Storage normalization test:
  - `/Users/deffenda/Code/FMWebIDE/src/server/saved-search-storage.test.mts`
- Integration parity marker:
  - `/Users/deffenda/Code/FMWebIDE/src/server/filemaker-regression.test.mts`

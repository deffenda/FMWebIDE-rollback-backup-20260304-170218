# Saved Finds (Phase 5)

## Overview
Saved Finds are now first-class workspace objects with server-backed persistence and local fallback behavior.

Primary implementation:
- `/Users/deffenda/Code/FMWebIDE/src/server/saved-search-storage.ts`
- `/Users/deffenda/Code/FMWebIDE/app/api/workspaces/[workspaceId]/saved-searches/route.ts`
- `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`

## Object Shape
Saved find entries persist:
- `id`
- `name`
- `requests[]` (criteria + omit flags)
- `createdAt`
- optional `lastRunAt`
- optional `layoutId`

## Behavior
- Save from find-mode criteria and modify existing entries.
- Run saved find to restore criteria and execute against current runtime.
- Edit/duplicate/rename/delete/export JSON from the browse dialogs.
- Entries persist per workspace (for example `assets`, `projecttracker`).

Fallback strategy:
- workspace API is primary
- local storage remains fallback/cache path when API persistence is unavailable

## Error Handling
- Invalid persisted entries are normalized/pruned.
- Missing/broken fields in criteria do not crash runtime; they are tolerated with status feedback.

## Tests
- `/Users/deffenda/Code/FMWebIDE/src/server/saved-search-storage.test.mts`
- integration parity check in:
  - `/Users/deffenda/Code/FMWebIDE/src/server/filemaker-regression.test.mts`

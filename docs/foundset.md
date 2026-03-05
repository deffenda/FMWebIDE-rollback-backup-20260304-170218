# Found Set Model (Phase 3)

## Overview
FM Web IDE now includes a first-class found set store in the runtime kernel:
- `src/lib/runtime-kernel/foundset-store.ts`
- `src/lib/runtime-kernel/kernel.ts`

Each found set tracks:
- `id`
- data source (`workspace/layout/table occurrence`)
- `querySpec`
- `recordIds[]`
- `totalCount`
- `currentIndex`
- `lastRefreshedAt`

## Runtime Semantics
- Record navigation (`first/prev/next/last/index/recordId`) updates the found set pointer.
- Found sets can be attached to a specific window.
- Refresh preserves the current record when possible (`preserveRecordId`), otherwise clamps index.

## Current Integration
- Browse runtime mirrors loaded records into a kernel found set for debug/runtime parity tracking.
- The debug overlay (`?debugRuntime=1`) shows found set id/index/total.

## Limits
- Query execution remains owned by existing browse-mode find routes/state.
- Found set persistence is currently in-memory per page session (no server persistence).

# WebDirect-Inspired Runtime Architecture

## Scope
This implementation adds a WebDirect-inspired runtime path for DDR-derived layouts in FMWeb IDE:
- deterministic layout/object translation on the server
- object-id routed client events
- server-authoritative interaction state machine
- patch-based UI/data updates
- realtime push channel with long-poll fallback

Primary code:
- `/Users/deffenda/Code/FMWebIDE/src/server/runtime/types.ts`
- `/Users/deffenda/Code/FMWebIDE/src/server/runtime/object-ids.ts`
- `/Users/deffenda/Code/FMWebIDE/src/server/runtime/render-tree.ts`
- `/Users/deffenda/Code/FMWebIDE/src/server/runtime/session-store.ts`
- `/Users/deffenda/Code/FMWebIDE/components/webdirect-runtime.tsx`

## Request/Session Flow
1. `POST /api/runtime/open`
- Input: layout id/name, optional mode, optional workspace id.
- Server creates runtime session, loads layout + initial records, builds deterministic object map + render tree.
- Returns initial tree + `sessionToken` + initial `serverSeq`.

2. `POST /api/runtime/event`
- Input: `{ sessionToken, event: { objectId, eventType, payload, timestamp, clientSeq } }`.
- Server processes event through session state machine.
- Returns `PatchSet` with minimal operations.

3. Realtime updates
- `GET /api/runtime/ws` uses SSE stream on the websocket path for push.
- `GET /api/runtime/poll?sessionToken=...&lastServerSeq=...` provides long-poll fallback.

## Canonical Translation Pipeline
`DDR/Layout JSON -> LayoutModel -> Deterministic Object IDs -> RenderTree -> React DOM`

### Deterministic object IDs
`buildDeterministicObjectMap` uses DDR identity when present and falls back to a stable hash path derived from:
- layout id/name
- object type
- arrange/z order and geometry
- object metadata path

Collisions are resolved with deterministic suffixing, so IDs remain stable across sessions.

### RenderTree
`buildRenderTree` outputs pure data nodes with:
- `nodeId` / `objectId`
- semantic `type`
- `tag`, `role`, `ariaLabel`
- computed style payload
- event bindings (focus/blur/input/click/keydown)
- portal row children (including placeholder/new row)

Renderer is in `components/webdirect-runtime.tsx` and is patch-driven.

## Interaction Model (Implicit App Semantics)
The server session store is authoritative. The client sends events and applies patch operations atomically.

Implemented semantics:
- field `input` marks record dirty (`setRecordDirty`)
- commit on explicit commit event, Enter (when requested), or blur with `commitOnBlur`
- Escape reverts staged edits
- tab/shift+tab uses server-side tab order (layout-derived, not DOM-order)
- button actions:
  - run script (`runScript` adapter)
  - go to layout
  - delete focused portal row
- post-commit record reload + render refresh
- status/error/dialog patch operations

## Patch Model
Current operations supported by the runtime client:
- `replaceRenderTree`
- `updateFieldValue`
- `updateComputedStyle`
- `setRecordDirty`
- `setFocus`
- `showDialog`
- `navigate`
- `updatePortalRows`
- `setError`
- `setStatusMessage`

Patch sets are sequenced by monotonically increasing `serverSeq`.

## Realtime Push + Poll Fallback
- Session store maintains subscribers via EventEmitter.
- Any new patch emits to push subscribers.
- Background monitor checks record `modId` and emits render patch when external change is detected.
- Monitor timer is `unref`'d so tests/processes do not hang.

## Data Access + Caching Boundaries
Runtime session currently uses existing FileMaker client adapter methods for:
- `getRecords`
- `createRecord`
- `updateRecord`
- `deleteRecord`
- `runScript`

Session-level caches/state:
- loaded layout + object map
- current found record list (first page)
- staged field buffer
- portal offsets
- patch history (bounded)

## Focus/Tab Model
- Focus is object-id based and server-controlled.
- Client intercepts Tab and requests next/previous target from server.
- Server returns `setFocus` patch for deterministic focus moves.
- Works across regular fields and portal row field instances.

## Commit/Revert Policy
Current policy is consistent runtime-wide:
- edit -> dirty
- commit triggers on blur/enter/explicit commit/navigation
- navigation auto-commits dirty state first
- Escape reverts staged edits and refreshes render tree

## DDR Fixture Usage
Runtime paths are designed to open layouts already imported from uploaded DDR assets through existing layout storage. UI tests are wired to run against those layouts when Playwright CLI+browsers are available.

## Extension Points
- add richer patch op types without changing client contract shape
- add stronger privilege gates in session transitions
- replace SSE endpoint with true websocket transport while preserving event/patch contract
- enrich script adapter and trigger matrix

## Tests
Unit tests:
- `/Users/deffenda/Code/FMWebIDE/src/server/runtime/object-ids.test.mts`
- `/Users/deffenda/Code/FMWebIDE/src/server/runtime/session-store.test.mts`

UI tests (Playwright, wired):
- `/Users/deffenda/Code/FMWebIDE/tests/ui/native-parity/webdirect-like/webdirect-runtime.spec.mts`
- report output: `/Users/deffenda/Code/FMWebIDE/docs/audit/WebDirectLike_Test_Report.md`

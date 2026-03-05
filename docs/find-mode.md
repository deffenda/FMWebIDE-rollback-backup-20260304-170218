# Find Mode Parity Notes

## Scope

Implemented in Phase 4 P0:
- multi-request find model
- include + omit request support
- constrain found set
- extend found set
- Data API `_find` payload translation with mock fallback

## Core Module

- `src/lib/find-mode.ts`

Key types:
- `FindRequestState`
- `FindCriteriaMap`
- `FindExecutionMode` (`replace` | `constrain` | `extend`)
- `FileMakerFindPayload`

## Server Route

- `app/api/fm/find/route.ts`

Request:
- `layoutName`
- `tableOccurrence`
- `requests`
- `limit`, `offset`, optional sort/workspace params

Response:
- filtered records
- source (`filemaker` or `mock`)
- resolved payload snapshot for diagnostics

## Runtime Integration

- `components/browse-mode.tsx`

Runtime behavior:
1. Normalize find requests.
2. If live mode, POST `/api/fm/find`.
3. On live failure, fall back to local evaluator.
4. Apply execution mode:
  - `replace`: replace current found set
  - `constrain`: intersect with current found set
  - `extend`: union with current found set

## Matching Semantics

`find-mode.ts` supports common matching behaviors used by imported layouts:
- exact and wildcard (`*`, `@`, `#`)
- comparison operators (`<`, `<=`, `>`, `>=`, `=`, `==`)
- date-like token comparisons
- phrase matching (`"..."`, `*"..."`)
- omit criteria

## Debug Overlay

With `?debugRuntime=1`:
- request count / current request index
- last find request summary
- last Data API JSON payload
- `Replay Find` action

## Known Limits

1. Saved finds are runtime/workspace metadata only (not full native FileMaker saved-find UI parity).
2. Native FileMaker find operators beyond the supported subset may be normalized/fallback-matched.
3. Very large constrain/extend operations may rely on incremental client-side filtering in fallback mode.

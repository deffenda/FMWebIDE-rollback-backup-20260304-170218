# Portal Runtime Parity

## Core Files
- Runtime renderer:
  - `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`
- Portal utilities:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/portal-utils.ts`

## Implemented Behavior
- Portal rows are resolved from `portalData` payload.
- Client-side portal sorting supports:
  - `portalSortRecords`
  - `portalSortRules`
  - custom value-list ordering.
- Client-side filtering supports:
  - `portalFilterRecords`
  - `portalFilterCalculation` via FMCalc-lite.
- Active row behavior:
  - click-select active row
  - preserve active row token when possible
  - default row from `portalInitialRow`.
- Reset behavior:
  - `portalResetScrollOnExit` resets scroll/selection on record/layout changes.
- Delete gating:
  - runtime checks `portalAllowDelete`
  - capability map (`canDeleteRelated`) and layout delete permission also enforced.

## Edit Lifecycle Integration
- Portal edits/deletes stage as edit-session operations.
- Save commits staged portal operations along with record field edits.
- Cancel/revert discards staged portal operations.

## Debug Overlay
With `?debugRuntime=1`:
- active portal row map
- calc filter error buffer
- trigger history for portal-related operations

## Tests
- `/Users/deffenda/Code/FMWebIDE/src/lib/portal-utils.test.mts`
- `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-parity.test.mts`

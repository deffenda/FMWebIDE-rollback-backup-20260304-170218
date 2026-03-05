# List View Parity (Phase 6)

## Implemented
- List renderer uses runtime records with stable row selection and active-row styling.
- Up/down keyboard navigation updates selected row and current record pointer.
- List rows support inline edit controls (respecting privileges, find/browse/preview mode, and edit-session staging).
- Per-layout list row field configuration is available via:
  - `View > List Row Fields...`
  - status-area `List Fields` button (when view is `List`).
- List row field preferences persist by workspace/layout using:
  - `GET/PUT /api/workspaces/:workspaceId/view-configs`

## Persistence model
- `listRowFields` is stored in `view-configs.json` under each workspace.
- Invalid/missing fields are filtered at runtime to current visible fields.
- Empty list config falls back to all visible fields.

## Feature flag
- `NEXT_PUBLIC_RUNTIME_ENABLE_LIST_ROW_FIELDS` (default: enabled)

## Known gaps
- Multi-select list row interactions (shift/cmd range selection) are not implemented yet.
- Native FileMaker row-part rendering fidelity is best-effort and still browser-layout based.

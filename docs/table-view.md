# Table View Parity (Phase 6)

## Implemented
- Table view supports persisted per-layout column preferences:
  - order
  - visibility
  - width presets
- Column configuration is available from:
  - column popover `Table View` submenu (`Manage Columns...`, width presets)
  - Records menu `Manage Columns...` (table view)
  - status-area `Columns` button (when view is `Table`).
- Header click sorting:
  - click toggles `asc -> desc -> unsorted`
  - shift+click appends/toggles multi-sort keys
- Sort indicators show direction and sort-key index when multi-sort is active.
- Table cell edit mode foundation:
  - passive display state
  - double click or Enter activates edit cell
  - Esc exits active edit cell

## Persistence model
- Stored with workspace/layout `view-configs` route and `view-configs.json`.
- Runtime normalizes and filters persisted columns against currently visible fields.

## Feature flags
- `NEXT_PUBLIC_RUNTIME_ENABLE_TABLE_COLUMN_PERSISTENCE` (default: enabled)
- `NEXT_PUBLIC_RUNTIME_ENABLE_TABLE_CELL_EDIT_MODE` (default: enabled)

## Known gaps
- Drag-resize and drag-reorder columns are not implemented yet.
- Full native FileMaker table-cell tab traversal rules are partially implemented.
- Very large found-set virtualization is planned for a later phase.

# Relationship Graph

Phase 13 relationship graph tooling is snapshot-driven and multi-file aware.

Implementation:
- Graph builder:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/relationshipGraph/index.ts`
- API action:
  - `POST /api/workspaces/[workspaceId]/developer-tools` with `action: "relationshipGraph"`

## Graph Model

Nodes:
- `file`
- `tableOccurrence`
- `layout` (entry point -> base TO)

Edges:
- `relationship` (TO↔TO, cross-file flagged)
- `layout-base` (layout -> base TO)

Each node includes details for drilldown (database/file ownership, TO metadata, etc.).

## Features

Implemented features:
- Build graph from a selected schema snapshot
- Filter by:
  - `fileIds`
  - `crossFileOnly`
  - `search`
- Path tracing:
  - shortest path between two node IDs

UI access:
- Layout Mode top menu: `Tools > Developer Utilities...`
- Developer Tools panel → Relationship Graph Explorer

## Performance Notes

The graph builder is deterministic and lightweight. For very large DDRs:
- Use file filters and search to narrow graph payload
- Path tracing runs on current filtered graph payload

## Testing

Covered by:
- `/Users/deffenda/Code/FMWebIDE/src/lib/dev-tools.test.mts`

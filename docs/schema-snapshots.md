# Schema Snapshots

Phase 13 introduces deterministic schema snapshots for multi-file workspaces.

## Model

Snapshot types are defined in:
- `/Users/deffenda/Code/FMWebIDE/src/lib/schemaSnapshot/types.ts`

Each snapshot includes:
- Per-file table + field metadata
- Table occurrences and relationships (including cross-file)
- Value list definitions
- Layout reference index (base TO, referenced fields/TOs/value lists, portal rows)
- Script reference index (referenced fields/layouts/TOs)
- Metadata (`snapshotId`, `createdAt`, `source`, warnings)

## Creation Paths

Implemented in:
- `/Users/deffenda/Code/FMWebIDE/src/lib/schemaSnapshot/create.ts`

Available creators:
- `createSnapshotFromWorkspace()`
- `createSnapshotFromDDRImport()`
- `createSnapshotFromExport(filePath)`

Notes:
- Snapshots are normalized for deterministic ordering.
- Workspace schema overlays are merged when present so migration-applied schema state becomes the new baseline.

## Storage

Snapshot persistence is implemented in:
- `/Users/deffenda/Code/FMWebIDE/src/server/schema-snapshot-storage.ts`

Files written under workspace storage:
- `schema-snapshots.json`
- `schema-snapshot-tags.json`

Behavior:
- Retention policy defaults to latest 20 snapshots.
- Tags can be assigned to snapshots (e.g., “PI Baseline”).

## API

Developer tools endpoint:
- `POST /api/workspaces/[workspaceId]/developer-tools`

Snapshot actions:
- `createSnapshot`
- `createSnapshotFromDDR`
- `createSnapshotFromExport`
- `listSnapshots`
- `tagSnapshot`
- `deleteSnapshot`

## Testing

Covered by:
- `/Users/deffenda/Code/FMWebIDE/src/lib/dev-tools.test.mts`

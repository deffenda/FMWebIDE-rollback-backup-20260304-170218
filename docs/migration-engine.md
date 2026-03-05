# Migration Engine

Phase 13 adds a workspace-first migration engine generated from schema diffs.

Implementation:
- `/Users/deffenda/Code/FMWebIDE/src/lib/migrations/types.ts`
- `/Users/deffenda/Code/FMWebIDE/src/lib/migrations/generate.ts`
- `/Users/deffenda/Code/FMWebIDE/src/lib/migrations/apply.ts`
- Storage:
  - `/Users/deffenda/Code/FMWebIDE/src/server/migration-plan-storage.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/workspace-schema-storage.ts`

## Plan Generation

`generateMigrationPlan(workspaceId, diffResult, options)` produces ordered migration steps.

Options:
- `allowDestructive` (default: `false`)
- `autoRenameFixes` (default: `false`)
- `crossFileAware` (default: `true`)

Safe-by-default behavior:
- Destructive changes (drops/type changes) are skipped unless explicitly enabled.
- Probable renames are advisory unless `autoRenameFixes` is enabled and confidence threshold passes.

## Step Types

Current step support:
- Tables: create/drop
- Fields: add/drop/rename/type/options
- TOs: create/drop/rename/base-update
- Relationships: create/drop
- Value lists: create/update/drop
- Layout reference fix (advisory step type)

## Apply Flow

`applyMigrationToSnapshot(baselineSnapshot, plan)`:
- Applies supported steps to snapshot schema metadata
- Produces a resulting snapshot (`source: "migration-apply"`)
- Returns applied/skipped step ids and warnings

Workspace API apply flow:
- Saves resulting snapshot to snapshot store
- Writes resulting per-file schema into workspace overlay (`workspace-schema.json`)
- Future workspace snapshots include this overlay state

## API

Developer tools endpoint actions:
- `generateMigration`
- `applyMigration`
- `deleteMigration`
- `exportReport` with `reportKind: "migration"`

## Live FileMaker Apply

Not implemented in Phase 13.

Rationale:
- Data API does not safely expose full schema mutation parity.
- Phase 13 migration is intentionally workspace metadata-first.

## Testing

Covered by:
- `/Users/deffenda/Code/FMWebIDE/src/lib/dev-tools.test.mts`

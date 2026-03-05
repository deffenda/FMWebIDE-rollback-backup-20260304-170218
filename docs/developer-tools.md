# Developer Tools Hub

Phase 13 introduces a dedicated Developer Tools hub for schema lifecycle workflows.

## UI Entry Point

Open from Layout Mode:
- `Tools > Developer Utilities...`

Component:
- `/Users/deffenda/Code/FMWebIDE/components/developer-tools-panel.tsx`

## Supported Workflows

1. Create schema snapshots
2. Compare baseline/target snapshots
3. Generate impact analysis report
4. Explore relationship graph across files
5. Generate migration plans (safe-by-default)
6. Apply migration plan to workspace schema overlay
7. Export diff/impact/migration reports as JSON or Markdown

## API Surface

Route:
- `/Users/deffenda/Code/FMWebIDE/app/api/workspaces/[workspaceId]/developer-tools/route.ts`

Read:
- `GET` → snapshots, tags, migration plans

Actions (`POST`):
- `createSnapshot`
- `createSnapshotFromDDR`
- `createSnapshotFromExport`
- `listSnapshots`
- `tagSnapshot`
- `deleteSnapshot`
- `diffSnapshots`
- `relationshipGraph`
- `impactAnalysis`
- `generateMigration`
- `applyMigration`
- `deleteMigration`
- `exportReport`

## Persistence

Per-workspace files:
- `schema-snapshots.json`
- `schema-snapshot-tags.json`
- `migration-plans.json`
- `workspace-schema.json` (migration-applied overlay)

## Safety Model

- Destructive migration actions are opt-in.
- Probable renames are confidence-scored and not silently applied.
- Live FileMaker schema mutation is intentionally out of scope in this phase.

## Test Suite

Developer tooling regression:
- `npm run test:dev-tools`

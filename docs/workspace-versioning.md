# Workspace Versioning

Date: 2026-03-02

## Overview

FM Web IDE stores workspace checkpoints as `WorkspaceVersion` entries so teams can:
- create manual checkpoints
- auto-checkpoint before risky operations (rollback/migration)
- diff baseline/target versions
- rollback safely
- export version bundles

Primary modules:
- `/Users/deffenda/Code/FMWebIDE/src/server/workspace-versioning.ts`
- `/Users/deffenda/Code/FMWebIDE/app/api/workspaces/[workspaceId]/governance/route.ts`
- `/Users/deffenda/Code/FMWebIDE/components/layout-mode.tsx` (Manage > Version History)

## Data model

A version captures pointers and bundle state for:
- workspace config
- app-layer config
- saved search config
- custom menu config
- schema overlay
- layout snapshot hash and snapshot pointers

## Key actions

## Create checkpoint
- API action: `createVersion`
- dedupes unchanged checkpoints by stable content hash

## Diff versions
- API action: `diffVersions`
- compares baseline and target and returns changed sections

## Rollback
- API action: `rollbackVersion`
- requires explicit confirmation (`confirmRollback=true`)
- creates a safety checkpoint before restore

## Export bundle
- API action: `exportVersionBundle`
- exports selected version as JSON bundle for review/archival

## Safety notes

- Rollback is workspace-metadata scoped.
- Live FileMaker hosted file rollback is not performed by this feature.
- Destructive operations should be preceded by a checkpoint.

## Testing

- `npm run test:versioning`
- `npm run test:governance`

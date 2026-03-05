# Multi-file Workspaces (Phase 7)

Date: 2026-03-01

## Overview

FM Web IDE now supports workspace-level routing across multiple FileMaker files (databases) in one solution.

Core server modules:
- `/Users/deffenda/Code/FMWebIDE/src/server/workspace-context.ts`
- `/Users/deffenda/Code/FMWebIDE/src/server/workspace-multifile.ts`
- `/Users/deffenda/Code/FMWebIDE/src/server/filemaker-client.ts`

## Workspace config model (v2)

`data/workspaces/<workspaceId>/workspace.json` now supports:

```json
{
  "version": 2,
  "id": "projecttracker",
  "name": "ProjectTracker",
  "filemaker": {
    "host": "https://fms.example.com",
    "database": "ProjectTracker",
    "username": "api-user",
    "password": "secret",
    "dependsOn": ["common"]
  },
  "files": [
    {
      "fileId": "projecttracker",
      "databaseName": "ProjectTracker",
      "primary": true
    },
    {
      "fileId": "common",
      "databaseName": "Common",
      "workspaceIdRef": "common",
      "apiLayoutsByTableOccurrence": {
        "CM.PERSONS": "CM.PERSONS"
      }
    }
  ],
  "routing": {
    "toIndex": {
      "CM.PERSONS": {
        "fileId": "common",
        "databaseName": "Common",
        "apiLayoutName": "CM.PERSONS"
      }
    }
  }
}
```

### Backward compatibility

v1 workspaces are auto-migrated in-memory:
- primary `files[]` is synthesized from `filemaker.database`
- `routing` defaults to empty until explicitly configured

## Routing rules

All runtime operations route by target file/database:
- `records` (read/create/update/delete)
- `find`
- `fields`
- `value lists`
- `scripts`
- `container fetch/upload`

Resolution order:
1. explicit `fileId` hint
2. explicit `databaseName` hint
3. `routing.toIndex[tableOccurrence]`
4. `routing.layoutIndex[layoutName]`
5. heuristic alias match (for dependency DB aliases)
6. primary workspace file fallback

For cross-file writes (`create/write/delete`):
- if target file is not primary and no API layout mapping exists, routing throws:
  - `WORKSPACE_API_LAYOUT_MISSING`

## ProjectTracker -> Common mapping

For the data-separation scenario:
- ProjectTracker layouts can bind TOs that physically live in Common.
- Add TO mappings in `routing.toIndex` and/or file-level `apiLayoutsByTableOccurrence`.

Example:

```json
"routing": {
  "toIndex": {
    "CM.PERSONS": {
      "fileId": "common",
      "databaseName": "Common",
      "apiLayoutName": "CM.PERSONS"
    },
    "CM.PREFERENCES": {
      "fileId": "common",
      "databaseName": "Common",
      "apiLayoutName": "CM.PREFERENCES"
    }
  }
}
```

## Runtime debug + diagnostics

New endpoint:
- `GET /api/fm/workspace-routing?workspace=<id>[&tableOccurrence=...&layoutName=...]`

Returns:
- workspace file graph summary
- index counts (`layoutIndex`, `toIndex`, relationship edges)
- per-database token cache diagnostics (redacted)
- last routed CRUD/find/script target

Browse debug overlay (`?debugRuntime=1`) now includes:
- active DB/file route
- relationship path across files
- token cache status
- routing warnings

## Error mapping

Routing and multi-file errors are normalized with guidance:

- `WORKSPACE_CONFIG_MISSING`
  - Workspace has no config.
- `WORKSPACE_TARGET_FILE_MISSING`
  - No file target resolved from routing/index/heuristics.
- `WORKSPACE_TARGET_FILE_LOCKED`
  - Target file is marked inaccessible (`missing`/`locked`).
- `WORKSPACE_API_LAYOUT_MISSING`
  - Cross-file write attempted without configured API layout mapping.

Routes return `code`, `message`, and `guidance`.

## Troubleshooting

1. Error: `WORKSPACE_API_LAYOUT_MISSING`
- Add `routing.toIndex[<TO>].apiLayoutName`.
- Or add `files[].apiLayoutsByTableOccurrence[<TO>]`.

2. Error: layout missing in target DB
- Verify mapped `apiLayoutName` exists in that file.
- Confirm account privilege can access that layout.

3. Error: access denied / authentication failures on dependency file
- Configure `files[].host/username/password` for the dependency DB.
- Verify account has access to external file in FileMaker.

4. Wrong database receives writes
- Inspect `/api/fm/workspace-routing` and browse debug overlay.
- Confirm TO mapping points to intended `fileId` and `databaseName`.


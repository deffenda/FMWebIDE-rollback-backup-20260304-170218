# Phase 7 Plan (Workspace + Multi-File FileMaker Solutions)

Date: 2026-03-01

## Verified Current State

### Workspace model
- Workspace config is primarily single-file:
  - `/Users/deffenda/Code/FMWebIDE/src/server/workspace-context.ts`
  - shape: `workspace.filemaker.{host,database,username,password,...}`
- Multi-file solution import currently creates one workspace per file and links dependencies via `dependsOn`:
  - `/Users/deffenda/Code/FMWebIDE/app/api/workspaces/import/route.ts`
  - `/Users/deffenda/Code/FMWebIDE/scripts/import-ddr-layouts.mjs`
- Existing imported data confirms this pattern:
  - `data/workspaces/projecttracker/workspace.json`
  - `data/workspaces/common/workspace.json`
  - `data/workspaces/assets/workspace.json`

### Runtime routing model
- Data API routing currently assumes one active database per workspace:
  - `/Users/deffenda/Code/FMWebIDE/src/server/filemaker-client.ts`
  - `readEnv()` uses `workspace.filemaker.database` (or global env) as single target DB.
- CRUD/find/value list/script routes pass `workspaceId` + `tableOccurrence`, but not explicit file/database routing:
  - `/Users/deffenda/Code/FMWebIDE/app/api/fm/records/route.ts`
  - `/Users/deffenda/Code/FMWebIDE/app/api/fm/find/route.ts`
  - `/Users/deffenda/Code/FMWebIDE/app/api/fm/fields/route.ts`
  - `/Users/deffenda/Code/FMWebIDE/app/api/fm/value-lists/route.ts`
  - `/Users/deffenda/Code/FMWebIDE/app/api/fm/scripts/route.ts`

### Runtime kernel/context
- Runtime context and found set models include workspace and optional database markers, but context frames/windows are not fully DB-aware yet:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/types.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/context-stack.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/kernel.ts`

### Current limitations vs Phase 7 goals
1. No explicit workspace `files[]` model with file-level status/capabilities.
2. TO/layout routing does not consistently resolve across dependent files.
3. CRUD does not guarantee target-database correctness for cross-file TOs.
4. No dedicated multi-DB session manager abstraction with per-file token status visibility.
5. Debug overlay does not provide cross-file routing diagnostics required for supportability.

## Phase 7 Implementation Backlog

## P0 (must deliver)
1. Workspace multi-file model + migration
- Add normalized multi-file workspace shape (`files[]`, `layoutIndex`, `toIndex`, relationship edges, API layout mapping).
- Keep backward compatibility with existing v1 single-file configs.
- Acceptance:
  - Existing workspaces still load without manual edits.
  - `projecttracker` resolves as multi-file workspace including dependency `common`.

2. Database-aware routing + session management
- Introduce server-side multi-file routing resolver (TO/layout -> target file/database/api layout).
- Introduce multi-DB session manager (token cache keyed per host/database/username; 401 re-auth per DB).
- Acceptance:
  - Record read/find/update/create/delete routes can target dependent DB.
  - Routing metadata is exposed in responses for debugging.

3. Cross-file CRUD and portal routing semantics
- Route parent and related portal operations by TO/file mapping.
- Add clear error when target file/TO has no configured CRUD layout.
- Acceptance:
  - ProjectTracker layout data edits can commit to Common when mapping exists.
  - Missing mapping returns actionable guidance.

4. Error mapping + developer observability
- Standardize error envelopes with user-facing guidance and debug details.
- Add workspace routing snapshot endpoint and debug-overlay integration.
- Acceptance:
  - Access denied / layout missing / missing mapping / relationship failures are non-crashing and clear.

5. ProjectTracker -> Common scenario harness
- Add sample workspace routing config/mapping that routes PT/CM TOs to Common.
- Acceptance:
  - ProjectTracker workspace can fetch/edit/create/delete Common-backed records via configured TO mappings.

## P1
1. DDR importer enrichment
- Persist cross-file TO/layout ownership directly during import (when derivable from DDR/summary).
- Add import warnings when relationships/mappings cannot be inferred.

2. Relationship traversal enrichment
- Add explicit cross-file relationship traversal path reporting and validation in runtime diagnostics.

## Tests to add
1. `workspace-multifile` unit suite:
- workspace migration/normalization
- TO/layout routing decisions
- ProjectTracker->Common mapping behavior

2. `multidb-session` unit suite:
- per-file token cache
- re-auth on 401
- mixed accessible/denied files

3. `filemaker-client-multifile` integration-style suite (mock fetch):
- read/create/update/delete routed to correct database/layout
- portal write routing to related file
- missing api layout mapping produces explicit error guidance

4. `fm-regression` parity additions (Phase 7 markers):
- cross-file found-set/list/table/preview basic smoke where mapping exists

## Feature flags (Phase 7)
- `runtime.workspaceMultiFileEnabled` (default true)
- `runtime.crossFileCrudEnabled` (default true)
- `runtime.multiDbSessionManagerEnabled` (default true)
- `runtime.workspaceRoutingDebugEnabled` (default true)

## Non-goals for this phase
- Live FileMaker schema mutation across files.
- Full FileMaker account management UX for opening/closing hosted files.
- Perfect parity for every exotic cross-file relationship edge case.

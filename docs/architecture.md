# FM Web IDE Architecture

## Goal
Provide a FileMaker-like web IDE with:
- Layout Mode (design/edit metadata-driven layouts)
- Browse/Find/Table runtime modes (render + edit live records)
- FileMaker Data API as backend

## High-level Flow
1. Browser UI (React/Next client components) renders layout editor and runtime views.
2. UI calls Next.js route handlers in `app/api/*`.
3. Route handlers call server adapters in `src/server/*`.
4. Server adapters call FileMaker Data API when configured, otherwise local mock storage.

## Main Layers
- UI layer:
  - `/Users/deffenda/Code/FMWebIDE/components/layout-mode.tsx`
  - `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`
- API layer:
  - `/Users/deffenda/Code/FMWebIDE/app/api/*`
- Server/data access layer:
  - `/Users/deffenda/Code/FMWebIDE/src/server/filemaker-client.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/layout-storage.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/workspace-context.ts`
- Shared domain/utilities:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/layout-model.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/layout-utils.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/portal-utils.ts`

## Persistence Model
- Layout metadata:
  - JSON files under `data/workspaces/<workspaceId>/layouts/` (and related maps/metadata).
- Imported DDR artifacts:
  - Workspace metadata and import outputs under `data/workspaces/`.
- Mock runtime data:
  - `data/mock-records/`.
- Theme catalog:
  - `data/filemaker-theme-catalog.json`.
- Theme mirrors:
  - `data/filemaker-themes/`.

## Workspace Isolation
- A workspace models a FileMaker file/solution context.
- Workspace is selected via `?workspace=<id>` and propagated to API handlers.
- FileMaker connection overrides can be scoped per workspace via workspace config.

## FileMaker Runtime Contract
- The app must not expose FM credentials in browser code.
- All Data API requests run server-side.
- Runtime prefers live FileMaker when `FILEMAKER_*` (or workspace overrides) are valid.
- On missing/invalid config, routes fall back to mock mode for development continuity.

## Key Design Constraints
- Preserve FileMaker-native UX patterns where practical.
- Keep layout rendering metadata-first.
- Treat portal data as related child records with explicit relationship context.
- Keep imports idempotent and workspace-scoped.

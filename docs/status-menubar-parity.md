# Status Area + Menubar Parity (Browse/Preview)

## Scope
FileMaker-like parity audit for:
- Browse mode status area
- Preview mode status area
- Browse mode menubar action matrix

## Implemented in Phase 6
- Central runtime feature flags:
  - `src/config/featureFlags.ts`
- Runtime capabilities dialog:
  - `View > Runtime Capabilities...`
  - lists enabled/disabled parity capabilities and role/source context.
- Menubar command hardening:
  - preview mode command can be feature-gated
  - window tiling/cascade actions are disabled when unsupported
- Status area parity updates:
  - mode switch includes Preview toggle
  - preview mode shows `Print`
  - list/table configuration actions exposed in-context

## Key supported groups
- File: Print, Refresh Window, Layout Mode
- Edit: Undo/Redo/Cut/Copy/Paste/Select All (browser command fallback)
- View: Browse/Find/Preview, Go to Layout, toolbar toggles, view-as, zoom
- Records: CRUD, find actions, constrain/extend, sort/unsort, saved finds/found sets
- Scripts: refresh + run script entries
- Tools: spelling, jump to manage database
- Window: workspace/window selection and focus actions
- Help: docs/about shortcuts entries

## Explicitly unsupported/flagged
- Native OS-like window tiling/cascade semantics
- Full FileMaker quick-find toolbar parity
- Full native preview page engine behavior

These are shown as disabled states and surfaced in the Runtime Capabilities dialog.

## Feature flags
- `NEXT_PUBLIC_RUNTIME_ENABLE_STATUS_MENUBAR_PARITY`
- `NEXT_PUBLIC_RUNTIME_ENABLE_WINDOW_TILING`
- `NEXT_PUBLIC_RUNTIME_ENABLE_QUICK_FIND`
- `NEXT_PUBLIC_RUNTIME_ENABLE_PREVIEW_RENDERER`

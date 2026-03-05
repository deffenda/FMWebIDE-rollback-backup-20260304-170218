# Phase 4 Notes — Object Types I

Date: 2026-03-03

## Scope delivered
- Core object rendering and behavior layers for:
  - text/number/date/time/multiline fields
  - static text
  - rectangles
  - buttons
  - static images
  - container-style field previews (read-only)

## Architecture added
- FM object components:
  - `/Users/deffenda/Code/FMWebIDE/src/fm/objects/FmField.tsx`
  - `/Users/deffenda/Code/FMWebIDE/src/fm/objects/FmTextObject.tsx`
  - `/Users/deffenda/Code/FMWebIDE/src/fm/objects/FmButton.tsx`
  - `/Users/deffenda/Code/FMWebIDE/src/fm/objects/FmImage.tsx`
  - `/Users/deffenda/Code/FMWebIDE/src/fm/objects/FmRectangle.tsx`
  - `/Users/deffenda/Code/FMWebIDE/src/fm/objects/FieldAdapter.ts`
- Runtime adapter helper:
  - `/Users/deffenda/Code/FMWebIDE/src/server/runtime/field-adapter.ts`
- Runtime node typing/classification and field behavior metadata:
  - `/Users/deffenda/Code/FMWebIDE/src/server/runtime/render-tree.ts`
- Validation hooks and commit-gate behavior:
  - `/Users/deffenda/Code/FMWebIDE/src/server/runtime/session-store.ts`
- Runtime UI integration with field-level error state:
  - `/Users/deffenda/Code/FMWebIDE/components/fm/RenderSurface.tsx`
  - `/Users/deffenda/Code/FMWebIDE/components/webdirect-runtime.tsx`

## Field interaction model (implemented)
- Display layer:
  - `FmField` renders formatted display state before edit activation.
- Edit layer:
  - focus enters edit mode with local draft value and dirty staging.
- Commit layer:
  - blur/enter/commit event routes through runtime event pipeline and server commit.

## Validation hooks
- Required field checks (`validationRequired`) now block commit.
- Numeric/date/time format checks are enforced at commit gate.
- Failed validation returns field-specific error patches and status messages.

## Tests added/updated
- Runtime unit tests:
  - `/Users/deffenda/Code/FMWebIDE/src/server/runtime/render-tree-objects.test.mts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/runtime/session-store.test.mts` (tab + validation)
- UI smoke:
  - `/Users/deffenda/Code/FMWebIDE/tests/ui/native-parity/layout-object-types.spec.mts`

## Known limitations
- Container-field write/upload flow is out of scope for this phase (read-only preview only).
- Field-type detection relies on DDR props and controlled heuristics when type metadata is incomplete.
- Full FileMaker input masks/locale-format semantics remain future work.


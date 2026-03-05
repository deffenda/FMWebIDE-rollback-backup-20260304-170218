# Phase 2 Notes — High-Fidelity Layout Geometry + Anchors

Date: 2026-03-03

## What shipped
- New geometry engine modules:
  - `/Users/deffenda/Code/FMWebIDE/src/fm/layout/geometry/types.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/fm/layout/geometry/computePartMetrics.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/fm/layout/geometry/computeObjectGeometry.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/fm/layout/geometry/applyAnchors.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/fm/layout/geometry/buildRenderTree.ts`
- Runtime integration:
  - `/Users/deffenda/Code/FMWebIDE/src/server/runtime/render-tree.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/runtime/session-store.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/runtime/types.ts`
  - `/Users/deffenda/Code/FMWebIDE/components/webdirect-runtime.tsx`
- Render + diagnostics components:
  - `/Users/deffenda/Code/FMWebIDE/components/fm/RenderSurface.tsx`
  - `/Users/deffenda/Code/FMWebIDE/components/fm/DiagnosticsOverlay.tsx`

## Geometry model behavior
- Parts are computed in deterministic order with explicit `topPx` and `heightPx`.
- Body part(s) expand to fill viewport height budget when viewport is taller than baseline.
- Objects are resolved to a part container and anchored per-part using baseline/current container deltas.
- Anchor rules:
  - `left + right`: width expands/contracts
  - `right only`: x shifts by container delta
  - `left only`: x/width fixed
  - `none`: keep baseline x (deterministic)
  - Vertical behavior mirrors horizontal with `top/bottom`.
- Missing DDR anchor metadata behavior:
  - default to top-left anchors
  - apply a deterministic wide-object heuristic: if object width spans at least `85%` of baseline part width, infer `left+right`.

## Runtime viewport/zoom
- Runtime session now tracks viewport state and receives `viewport` events.
- `ResizeObserver` publishes viewport changes from runtime canvas.
- Zoom options: `50/75/100/125/150/200`.

## Diagnostics and overrides
- Use `?diag=1` on runtime route to enable geometry diagnostics overlay.
- Anchor escape hatch:
  - `/Users/deffenda/Code/FMWebIDE/data/anchorsOverride.json`
  - shape: `{ "<layoutId>": { "<componentId>": { "left": true, "right": false, "top": true, "bottom": false } } }`

## Tests added
- Unit:
  - `/Users/deffenda/Code/FMWebIDE/src/fm/layout/geometry/__tests__/anchors.test.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/fm/layout/geometry/__tests__/parts.test.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/fm/layout/geometry/__tests__/render-tree.test.ts`
- UI visual regression (Playwright):
  - `/Users/deffenda/Code/FMWebIDE/tests/ui/native-parity/layout-visual.spec.mts`

## Known limitations
- DDR anchor metadata is not always complete; fallback defaults are used.
- FM sliding/auto-resize edge cases for all parts are not fully replicated yet.
- Font/line wrapping parity remains Phase 3+.

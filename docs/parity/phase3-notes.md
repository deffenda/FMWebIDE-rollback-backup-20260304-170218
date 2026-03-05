# Phase 3 Notes — Themes, Styles, Typography, Colors

Date: 2026-03-03

## What shipped
- New FM style-token pipeline:
  - `/Users/deffenda/Code/FMWebIDE/src/fm/styles/tokens.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/fm/styles/fmFontMap.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/fm/styles/resolveStyleStack.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/fm/styles/resolveStyle.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/fm/styles/cssFromTokens.ts`
- Runtime renderer integration:
  - `/Users/deffenda/Code/FMWebIDE/components/fm/RenderSurface.tsx`
  - `/Users/deffenda/Code/FMWebIDE/components/fm/FmObject.tsx`
  - `/Users/deffenda/Code/FMWebIDE/components/fm/FmText.tsx`
  - `/Users/deffenda/Code/FMWebIDE/components/fm/DiagnosticsOverlay.tsx`
- Runtime render-tree style metadata wiring:
  - `/Users/deffenda/Code/FMWebIDE/src/server/runtime/render-tree.ts`
- Surface-scoped FM style baseline CSS:
  - `/Users/deffenda/Code/FMWebIDE/src/styles/fmSurface.css`
  - imported from `/Users/deffenda/Code/FMWebIDE/app/globals.css`

## Style resolution behavior
- Deterministic precedence is now:
  1. Theme defaults
  2. Style class chain (`basedOn` root -> leaf)
  3. Object overrides from DDR-imported props
  4. Runtime overrides (wireframe / missing mapping highlight)
- `basedOn` cycle detection is implemented in the style chain resolver and emits warnings instead of crashing.

## Typography behavior (best effort)
- FM font mapping to web stacks via `fmFontMap.ts`.
- Wrap modes:
  - `none` => nowrap + ellipsis
  - `word` => word wrapping
  - `char` => character break
- Vertical alignment uses flex alignment (`top/middle/bottom` => `flex-start/center/flex-end`).

## Diagnostics
- Diagnostics panel now shows:
  - theme/style ids + names
  - resolved style chain
  - resolved token bundle
  - per-property source map
- New dev toggles (in diagnostics mode):
  - `Wireframe`
  - `Highlight missing mappings`

## Tests added
- Unit tests:
  - `/Users/deffenda/Code/FMWebIDE/src/fm/styles/__tests__/resolveStyle.test.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/fm/styles/__tests__/cssFromTokens.test.ts`
- Playwright visual expansions:
  - `/Users/deffenda/Code/FMWebIDE/tests/ui/native-parity/layout-style-visual.spec.mts`

## Known limitations
- Full DDR style-class inheritance trees are still approximated from available `styleName` and object props.
- Typography remains best effort across browsers/OS due font metric differences.
- Advanced effects (complex shadows/glow/inner effects) are intentionally conservative in this phase.


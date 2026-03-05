# DDR Layout Model Mapping (Phase 16/17)

## Scope
This document describes how `scripts/import-ddr-layouts.mjs` maps DDR layout/object XML into the runtime layout model in `src/lib/layout-model.ts`.

## Coordinate System
- DDR bounds are imported from `<Bounds top left bottom right>`.
- Mapping uses 1:1 point-to-pixel normalization for now.
- Values are normalized with float precision (`roundTo(..., 3)`) and stored as:
  - `position.x`, `position.y`, `position.width`, `position.height`
- Original DDR edges are preserved on props for fidelity diagnostics:
  - `ddrSourceTop`, `ddrSourceLeft`, `ddrSourceBottom`, `ddrSourceRight`

## Anchor / Autosize Mapping
- DDR object flags are parsed from object-level `flags` metadata.
- Imported anchor metadata is stored as:
  - `ddrObjectFlags` (unsigned bitmask)
  - `ddrAnchorSource` (`flags`, `default`, or `explicit`)
  - normalized booleans:
    - `autosizeTop`
    - `autosizeRight`
    - `autosizeBottom`
    - `autosizeLeft`

### Flag decode (current mapping)
- `0x10000000` = Don't anchor left
- `0x20000000` = Don't anchor top
- `0x40000000` = Anchor right
- `0x80000000` = Anchor bottom

Runtime precedence:
1. explicit `autosize*` props (if present)
2. decoded DDR flag anchors
3. default anchors (`left/top` true, `right/bottom` false)

## Layout-Level Mapping
- Layout metadata:
  - `name`, `id`, default TO context, theme/style name hints
- Parts mapping:
  - DDR `PartsList` -> `layout.parts[]`
  - supported part types include header/body/footer/title/subsummary variants when present

## Core Object Mapping
Mapped object types (normalized token -> runtime type):
- text -> `label`
- field/edit-box/drop-down/pop-up/calendar/checkbox/radio/container -> `field`
- button/group button/popover button/button bar -> `button`
- portal -> `portal`
- line/rectangle/rounded rectangle/oval/graphic -> `shape`
- web viewer -> `webViewer`
- chart -> `chart`
- tab control/slide control -> `tabControl`/`slideControl` when represented
- unknown/unmapped -> `unknown`

## Style Mapping
Importer parses style hints from:
- `LocalCSS`
- object style name/theme references
- character style vector hints
- conditional-format metadata fallback

Mapped style props (when available):
- text: `fontFamily`, `fontSize`, `bold`, `italic`, `textColor`, `textAlign`
- fills: `fillType`, `fillColor`, `fillGradientStartColor`, `fillGradientEndColor`
- line/border: `lineColor`, `lineWidth`, `lineStyle`, `cornerRadius`
- effects: `effectOuterShadow`, `opacity`
- spacing: `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft`

`ddrStyleParsed` indicates whether richer LocalCSS parsing succeeded.

Runtime style resolution order (Phase 17):
1. theme defaults by object type
2. style variant (`styleName`)
3. local overrides (object-level style hints)
4. conditional-format fallback layer (static first-rule fallback)

## Object-Specific Properties

### Button / ButtonBar
- `buttonAction`, script/action step metadata
- `buttonIconName`
- `buttonMode: "bar"` for button bars
- `buttonBarSegments[]` extracted from DDR segment metadata

### Popover / Popover Button
- popover shell metadata stored on button props:
  - `popoverName`, title/icon visibility hints, title text, style hints

### Portal
- `portalName`, related TO, row count hints
- row field list:
  - `portalRowFields[]`
- column metadata:
  - `portalColumnWidths[]`
  - `portalColumnHeaders[]`

### Tooltip / Hide / Conditional Formatting
- `tooltip`
- `hideObjectWhen`
- conditional format fallback marker:
  - `ddrConditionalFormattingStatic`
- fidelity warnings:
  - `ddrFidelityWarnings[]`

## Z-Order and Arrange
- Importer preserves discovery order and explicit arrange order hints.
- Runtime uses `sortComponentsByArrangeOrder(...)` to keep stable stacking.
- `ddrArrangeOrder` is persisted for fidelity metrics/debug.

## Unknown and Missing Data Handling
- Unknown type:
  - stored as runtime `type: "unknown"` with original token in `ddrOriginalObjectType`
- Missing bounds:
  - object skipped and warning recorded
- Parse failures:
  - safe defaults applied
  - warning added to `ddrFidelityWarnings`

## Backward Compatibility
- New fidelity props are additive.
- Existing layout JSON still loads because runtime checks are optional and fallback-safe.
- Unsupported fidelity props do not break older layouts.

# Phase 16 Plan: DDR Layout Fidelity

## Scope
Phase 16 is limited to DDR (FMPReport/FMSaveAsXML) layout import and high-fidelity rendering in FM Web IDE. It intentionally excludes runtime parity expansion, script-step expansion, and governance features.

## A) Current DDR Pipeline Inventory

### Import entry points
- API upload/import route: [`app/api/workspaces/import/route.ts`](/Users/deffenda/Code/FMWebIDE/app/api/workspaces/import/route.ts)
- CLI/script importer: [`scripts/import-ddr-layouts.mjs`](/Users/deffenda/Code/FMWebIDE/scripts/import-ddr-layouts.mjs)

### Current parser behavior
- DDR source decode:
  - `readAsXml(rawBuffer)` handles UTF-8/UTF-16 detection.
- Layout extraction:
  - regex + block scanner (`findTopLevelTagBlocks`) over in-memory XML.
  - imports from `<LayoutCatalog>` and `<Layout>` blocks.
- Object extraction:
  - parses bounds, field bindings, button/script actions, tooltips, hide conditions, portal rows/sort basics, style theme/style name tokens.
- Layout parts:
  - parses `<PartsList>` and maps known FileMaker part types.
- Workspace mapping:
  - writes layout JSON into workspace storage and updates `layout-fm-map.json`.

### Current layout model and render mapping
- Layout model schema:
  - [`src/lib/layout-model.ts`](/Users/deffenda/Code/FMWebIDE/src/lib/layout-model.ts)
- Browse renderer:
  - [`components/browse-mode.tsx`](/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx)
- Theme/style palette mapping:
  - [`src/lib/theme-palettes.ts`](/Users/deffenda/Code/FMWebIDE/src/lib/theme-palettes.ts)
- Existing DDR regression test:
  - [`src/lib/layout-import-regression.test.mts`](/Users/deffenda/Code/FMWebIDE/src/lib/layout-import-regression.test.mts)

### What is already parsed and mapped
- Layout list, IDs, names.
- Layout parts (subset).
- Object geometry (bounds) and arrange order.
- Core object types:
  - Text, Field, Button, Portal, Web Viewer, Shape subset.
- Portal metadata:
  - table occurrence, visible row hints, row field names.
- Basic calc metadata:
  - tooltip, hide condition, action calc/script references.
- Style tokens:
  - `styleTheme`, `styleName` only (not full CSS fidelity).

### Key current gaps
- Parser is currently in-memory regex parsing, not streaming for large DDRs.
- LocalCSS/style vectors are not fully mapped to renderable style props.
- Unknown object types are generally degraded to labels instead of fidelity placeholders.
- Button bar, popover shell metadata, and portal column structure are only partially modeled.
- No dedicated layout fidelity harness (metrics + baseline visual regression workflow).

## B) Layout Fidelity Rubric (Phase 16)

Each imported layout will be evaluated using objective categories:

1. Geometry fidelity
- Metric: percent of mapped components where `x/y/width/height` matches DDR-derived bounds within tolerance.
- Tolerance target: <= 1.0 px equivalent per edge after unit normalization.

2. Typography fidelity
- Metric: percent of text-capable objects with mapped font family/size/weight/color.

3. Color and fill fidelity
- Metric: percent of objects with mapped text color/fill/border/shadow properties from DDR style nodes.

4. Z-order fidelity
- Metric: object stack order preserved from DDR traversal and arrange order.

5. Object-type coverage
- Metric: percent of DDR object types in fixtures mapped to explicit runtime renderers.

6. Part fidelity
- Metric: percent of layouts with detected parts that render distinct part regions correctly.

7. Portal fidelity
- Metric: percent of portals with preserved bounds, field columns, row styling hints, and row structure.

8. Calc-driven visual wiring
- Metric: hide/tooltip/label/title calcs imported and bound (dynamic evaluation optional if explicitly toggled).

## C) Prioritized Backlog from Fixture Audit

Fixture set used for planning:
- `/Users/deffenda/Koofr/Inactive/BD/DDRs/01012019/LD&D Inventory - live 1_fmp12.xml`
- `/Users/deffenda/Koofr/Inactive/J&E/05122020/J&E_data_fmp12.xml`
- `/Users/deffenda/Koofr/Inactive/J&E/05122020/J&E_interface_fmp12.xml`
- `/Users/deffenda/Koofr/Inactive/Master Trapper/DDR/02242018/MasterTrapper_fmp12.xml`
- `/Users/deffenda/Koofr/Inactive/Omega/DDR/08202018/Omega_fmp12.xml`
- Summary files from each fixture set.

### P0 (must ship)
- Streaming-safe DDR layout extraction for large files.
- Rich object style extraction:
  - LocalCSS, CharacterStyleVector essentials, line/fill/border/font/text properties.
- Object renderer coverage upgrades for observed high-impact types:
  - ButtonBar, PopoverButton/Popover shell, Portal columns/headers, Text/Field/Button/Shape.
- Z-order and precise bounds preservation (floating point).
- Unknown object graceful degradation:
  - dev placeholder + production-safe fallback with feature toggle.
- Layout fidelity harness:
  - metrics JSON per layout
  - baseline visual/fidelity artifact generation
  - deterministic regression command set.

### P1 (high value, after P0)
- Better part region rendering in Browse/Preview (header/body/footer/subsummary visual regions).
- Improved portal styling fidelity (column widths, row styles, alternating row states from DDR style hints).
- Image/icon extraction wiring for button/popover icons where names are present.
- Conditional formatting visual fallback with explicit warning when dynamic rule eval is unavailable.

### P2 (nice-to-have)
- Advanced style fidelity:
  - gradients with richer parsing, state-specific CSS variants (`hover`, `pressed`, `checked`).
- Higher-fidelity mapping for complex object hierarchies:
  - tab controls, slide panels, grouped object nuances beyond current heuristics.
- Optional Playwright screenshot workflow behind capability gating when dependency is available.

## Acceptance Criteria for Phase 16 Completion
- Importer can parse and import all fixture DDR files without crashes.
- Layout JSON includes richer style + metadata needed for fidelity rendering.
- Browse/Preview rendering shows improved geometry, stacking, object shells, and style fidelity.
- Fidelity harness produces deterministic per-layout reports and baseline regression artifacts.
- Unsupported features are feature-toggled and surfaced in dev/debug warnings.

# Phase 6 Plan (List/Table/Preview + Status/Menubar Parity)

Date: 2026-03-01

## Verified Current State

## Browse/List/Table/Preview runtime
- Core browse runtime, menubar, status-area actions, and list/table renderers are centralized in:
  - `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`
- Current state includes:
  - `viewMode` with `form | list | table`
  - launch mode token with `browse | find | preview`
  - existing list/table inline edit controls and table column context menu
  - existing sort/group/subsummary helper integration from:
    - `/Users/deffenda/Code/FMWebIDE/src/lib/sort-reporting.ts`
  - existing find flow from:
    - `/Users/deffenda/Code/FMWebIDE/src/lib/find-mode.ts`
- Preview mode is currently mostly a read-only browse variant (UI flags + disabled edits), not a dedicated print-style renderer with page flow controls.

## Status area + menubar
- Browse mode already has a substantial FileMaker-like top menubar and status-area command wiring:
  - menu action handler in `handleTopMenubarAction(...)`
  - command IDs for File/Edit/View/Records/Scripts/Window/Help groups
- Gaps:
  - no centralized feature-flag registry for not-feasible items
  - no capabilities modal explaining supported vs unsupported items
  - menu availability differs from FileMaker in some cases (actions present but not explicitly feature-gated)

## Persistence + workspace
- Layout/workspace persistence exists for layouts and saved searches.
- Table/list view-specific display config persistence is partial:
  - hidden fields/options exist in runtime state
  - no dedicated per-layout persisted column order/width/list-row config model.

## Key Gaps vs “FileMaker-feel”

## Feasible in this phase (P0)
1. List view parity uplift
- stable row selection semantics and keyboard navigation
- layout-configurable list-row fields with per-layout persistence
- inline edit path kept consistent with edit-session commit/revert

2. Table view parity uplift
- persisted per-layout column config (visible/order/width)
- header click sort toggle (+ shift for multi-sort)
- editable cell entry mode (double-click/Enter) with Esc revert and Tab navigation

3. Preview mode parity uplift
- explicit preview renderer path using print-friendly runtime styles
- non-editable output mode with record navigation preserved
- print action alignment via menubar/status

4. Status area + menubar parity audit and feature gating
- central feature flags module
- unsupported options disabled with rationale text
- capabilities modal to document parity status

5. Regression and checklist uplift
- parity checklist v6 in FM integration suite
- unit tests for new table/list config and feature flag gating helpers

## Not fully feasible in this phase (feature-flag and document)
- Full native FileMaker page engine parity (exact page/page break calculations)
- Native OS window tiling semantics inside browser runtime
- Complete one-to-one behavior for every Record/Edit submenu option
- Fully native commit timing semantics for all table/list edge transitions

## Backlog

## P0 (this implementation round)
1. List view parity uplift
- Acceptance:
  - row selection stable and keyboard up/down updates selected record
  - list-row field set can be configured per layout and persisted by workspace
  - inline edits preserve edit-session/commit behavior
- Tests:
  - list/table config normalization tests
  - browse runtime parity checks for list selection and mode behavior

2. Table view parity uplift
- Acceptance:
  - per-layout table column visibility/order/width persistence
  - header sort toggle and shift multi-sort
  - edit mode entry (double-click/Enter), Esc cancel, Tab navigation between cells
- Tests:
  - table config reducer/unit tests
  - parity checklist entries for table behaviors

3. Preview mode uplift
- Acceptance:
  - explicit preview render branch enabled
  - non-editable controls and print-friendly display
  - browse -> preview -> browse preserves found set and index
- Tests:
  - preview mode render-state tests (unit/parity)

4. Status/menubar audit + feature flags
- Acceptance:
  - `src/config/featureFlags.ts` created and used in browse menubar/status actions
  - unsupported items disabled + tooltip/capability notes
  - capabilities modal exposed from menu/status
- Tests:
  - feature flag unit tests and menu-action coverage checks

5. Regression v6
- Acceptance:
  - FM regression footer prints `FM Integration Parity Checklist v6`
  - Phase 4/5/6 categories included

## P1
- list/table multi-select range semantics (shift/cmd)
- richer preview page navigation and estimated page counts
- table virtualization for very large found sets (windowed render)

## P2
- high-fidelity print layout part pagination
- full quick-find parity and cross-mode toolbar customization parity

## Feature Flags (Phase 6)
- `runtime.previewRendererEnabled` (default: true)
- `runtime.tableColumnPersistenceEnabled` (default: true)
- `runtime.listRowFieldConfigEnabled` (default: true)
- `runtime.tableCellEditModeEnabled` (default: true)
- `runtime.statusMenubarParityAuditEnabled` (default: true)
- `runtime.quickFindEnabled` (default: false)
- `runtime.windowTilingEnabled` (default: false)

# Phase 5 Plan (Developer & Power-User Parity)

## Verified Current State

### Layout Mode inventory (design-time)
- Object types already present in layout model and editor:
  - `field`, `label`, `button`, `webViewer`, `portal`, `shape`, `panel`, `chart` in [`src/lib/layout-model.ts`](/Users/deffenda/Code/FMWebIDE/src/lib/layout-model.ts).
- Layout editor includes:
  - object placement, selection, grouping/arrange state, inspector tabs, and set tab order dialog in [`components/layout-mode.tsx`](/Users/deffenda/Code/FMWebIDE/components/layout-mode.tsx).
- Existing Set Tab Order implementation:
  - dialog state + marker overlay + apply logic using `component.props.tabOrder` in [`components/layout-mode.tsx`](/Users/deffenda/Code/FMWebIDE/components/layout-mode.tsx).

### Browse/Find runtime inventory
- Runtime has:
  - find request arrays (include/omit), constrain/extend semantics, saved-find dialogs and menus in [`components/browse-mode.tsx`](/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx).
  - find translation and matching helpers in [`src/lib/find-mode.ts`](/Users/deffenda/Code/FMWebIDE/src/lib/find-mode.ts).
- Runtime also has:
  - field engine, portals, tab controls, triggers, runtime kernel hooks (Phase 1–4 baseline) in [`components/browse-mode.tsx`](/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx) and `src/lib/*` runtime modules.

### Manage Database / Value Lists inventory
- Manage Database UI exists in layout mode with tables/fields/relationships views (primarily read-only graph-first UX) in [`components/layout-mode.tsx`](/Users/deffenda/Code/FMWebIDE/components/layout-mode.tsx).
- Value lists are fetched from FileMaker/mock via [`app/api/fm/value-lists/route.ts`](/Users/deffenda/Code/FMWebIDE/app/api/fm/value-lists/route.ts).
- Manage Value Lists edit actions are currently placeholder/not fully wired in [`components/layout-mode.tsx`](/Users/deffenda/Code/FMWebIDE/components/layout-mode.tsx).

### Persistence and workspace model
- Workspace-scoped storage roots are defined in [`src/server/workspace-context.ts`](/Users/deffenda/Code/FMWebIDE/src/server/workspace-context.ts).
- Existing workspace APIs (settings/custom menus) in:
  - [`app/api/workspaces/[workspaceId]/route.ts`](/Users/deffenda/Code/FMWebIDE/app/api/workspaces/[workspaceId]/route.ts)
  - [`app/api/workspaces/[workspaceId]/custom-menus/route.ts`](/Users/deffenda/Code/FMWebIDE/app/api/workspaces/[workspaceId]/custom-menus/route.ts)
- Saved finds currently persist in browser localStorage only in [`components/browse-mode.tsx`](/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx).

### Test suite baseline
- Runtime/unit suites include find, tabs runtime, field engine, portals, kernel, URL state, regression matrix checks via `package.json` scripts and tests in `src/lib/*.test.mts` plus [`src/server/filemaker-regression.test.mts`](/Users/deffenda/Code/FMWebIDE/src/server/filemaker-regression.test.mts).

## Verified Gaps vs Phase 5

1. Layout-level tab order model is missing.
- Current model uses per-component numeric `props.tabOrder`; no canonical `layout.tabOrder[]` sequence.

2. Runtime tab traversal does not enforce designer-defined tab sequence.
- DOM focus order is still primary; no dedicated tab-order manager in browse runtime.

3. Saved Finds are localStorage-only.
- Not first-class workspace objects server-side; limited cross-session/workspace reliability.

4. Saved Found Sets do not exist.
- No object model, persistence, or UI for result-set snapshots.

5. Manage Value Lists editor parity is incomplete.
- CRUD actions in modal are not fully implemented.

6. Manage Database editing parity is partial.
- Core table/field/relationship edit persistence + lint/migration reporting is limited.

## Phase 5 Backlog

## P0

### 1) Tab Order (design-time + runtime enforcement)
- Add layout-level `tabOrder` array to layout model.
- Backward-compatible migration from legacy `component.props.tabOrder`.
- Layout mode Set Tab Order writes canonical `layout.tabOrder`.
- Browse runtime Tab/Shift+Tab follows resolved tab order and skips hidden/disabled/non-entry objects.

Acceptance criteria:
- Existing layouts without `layout.tabOrder` still work.
- Setting tab order in layout mode changes browse mode focus traversal deterministically.
- Hidden objects (`hideObjectWhen`) and disabled controls are skipped.

Tests:
- new unit tests for tab order resolution/migration and next/prev traversal.
- browse URL/runtime regression remains green.

### 2) Find Mode parity enhancements + Saved Finds persistence
- Keep current multi-request/omit/constrain/extend UX.
- Move Saved Finds persistence to workspace server storage with API fallback to localStorage.
- Add export JSON action for saved find entries.

Acceptance criteria:
- Saved Finds survive browser refresh and are scoped by workspace.
- Save -> run -> modify -> re-save works after reload.

Tests:
- unit tests for saved-find storage normalization.
- integration regression updates in filemaker regression checklist.

### 3) Saved Found Sets
- Introduce saved found set model:
  - id/name/layout context/recordIds snapshot/current sort metadata/captured timestamp.
- Add browse-mode UI to save/open/rename/delete/export saved found sets.
- Add cap/warning for oversized snapshots.

Acceptance criteria:
- User can save current found set and reopen later in same workspace.
- Missing/deleted recordIds are skipped with warning, not fatal.

Tests:
- unit tests for serialization/cap behavior.
- runtime tests for open + navigation semantics.

## P1

### 4) Layout Mode parity improvements (targeted)
- Expand Set Tab Order tools with reorder helpers (move up/down, reverse).
- Keep inspector/object rendering stable and maximize screen use without regressing FM look/feel.

Acceptance criteria:
- Order can be edited from list in addition to canvas badges.

### 5) Manage Database improvements (incremental)
- Add schema consistency diagnostics (“schema lint”) for layout bindings.
- Keep database mutation scoped to workspace metadata (no destructive live schema push).

Acceptance criteria:
- Lint reports orphan layout field refs and missing value list refs.

### 6) Manage Value Lists improvements
- Implement workspace-level editable value-list registry (create/rename/delete + static values).
- Merge FileMaker source value lists with workspace local overrides in runtime picker/editor.

Acceptance criteria:
- New workspace value list can be created and used by controls in layout/browse mode.

## P2

### 7) Layout diff / DDR round-trip diagnostics
- Add optional layout diff view vs imported baseline metadata.

### 8) Saved found set query-backed dynamic mode
- Add optional “dynamic found set” that replays saved find query instead of static recordId snapshot.

## Non-goals for this phase
- Full live FileMaker schema mutation from Manage Database.
- Full WebDirect-perfect formatting parity for all object render edge cases.
- Replacing existing runtime kernel architecture.

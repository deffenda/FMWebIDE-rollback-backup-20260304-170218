# Tab Order (Phase 5)

## Overview
FM Web IDE now uses a canonical layout-level tab-order model so design-time edits and browse runtime focus traversal stay in sync.

Primary implementation:
- `/Users/deffenda/Code/FMWebIDE/src/lib/tab-order.ts`
- `/Users/deffenda/Code/FMWebIDE/components/layout-mode.tsx`
- `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`

## Data Model
- `LayoutDefinition.tabOrder?: string[]`
- Object-level flags used by resolution:
  - `props.includeInTabOrder?: boolean`
  - `props.tabStopEnabled?: boolean`

Backward compatibility:
- Legacy numeric `component.props.tabOrder` is read, normalized, and migrated into `layout.tabOrder`.
- Layout storage normalization runs on list/load/save in:
  - `/Users/deffenda/Code/FMWebIDE/src/server/layout-storage.ts`

## Design-time Behavior
- Set Tab Order dialog assigns and persists canonical sequence.
- Reorder tools include:
  - move up
  - move down
  - reverse
  - clear/remove/add
- Legacy numeric per-component tab index is still mirrored for compatibility.

## Runtime Behavior
- Browse mode intercepts `Tab`/`Shift+Tab` in form view.
- Traversal uses resolved tab order and skips non-focusable targets:
  - hidden objects
  - no-view/no-entry/read-only targets
  - objects outside active panel context

Debug overlay (`?debugRuntime=1`) includes:
- current focused tab-stop ID
- next tab-stop ID
- skipped target reasons

## Tests
- `/Users/deffenda/Code/FMWebIDE/src/lib/tab-order.test.mts`
- runtime integration coverage in:
  - `/Users/deffenda/Code/FMWebIDE/src/server/filemaker-regression.test.mts` (Parity Checklist v5)

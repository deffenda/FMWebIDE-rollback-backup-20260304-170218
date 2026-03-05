# Phase 6 Summary (List/Table/Preview + Status/Menubar)

Date: 2026-03-01

## Delivered
- Added centralized runtime feature flags and unsupported capability reporting:
  - `/Users/deffenda/Code/FMWebIDE/src/config/featureFlags.ts`
- Added workspace-scoped list/table view configuration persistence:
  - route: `/api/workspaces/:workspaceId/view-configs`
  - storage: `/Users/deffenda/Code/FMWebIDE/src/server/view-config-storage.ts`
- Browse runtime parity updates in:
  - `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`
  - list row field configuration per layout
  - table column order/visibility/width persistence
  - header click sort + shift multi-sort
  - table cell edit-mode foundation (passive/active cell state)
  - preview mode status actions (toggle + print) and read-only behavior hardening
  - menubar parity hardening + runtime capabilities modal
- Added Phase 6 list/table runtime helper module:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/list-table-runtime.ts`

## Tests added/updated
- New:
  - `npm run test:list-table-runtime`
- Existing expanded:
  - `npm run test:feature-flags`
  - `npm run test:view-configs`
  - `npm run test:menu-actions`
  - `npm run test:fm-regression` footer now reports `FM Integration Parity Checklist v6`

## Documentation added
- `/Users/deffenda/Code/FMWebIDE/docs/list-view.md`
- `/Users/deffenda/Code/FMWebIDE/docs/table-view.md`
- `/Users/deffenda/Code/FMWebIDE/docs/preview-mode.md`
- `/Users/deffenda/Code/FMWebIDE/docs/status-menubar-parity.md`

## Remaining gaps (Phase 7 candidates)
- Full FileMaker-native table/list multi-select ergonomics.
- Drag-based table column resize/reorder parity.
- Deterministic native-style preview pagination/page count.
- Expanded menubar command parity for platform-specific windowing actions.
- Large found-set virtualization tuning and perf profiling in list/table views.

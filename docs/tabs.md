# Tabs Runtime Parity

## Implemented
- Runtime tab utilities:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/tabs-runtime.ts`
- Browse integration:
  - `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`

### Behavior
- Active tab per panel component is tracked in runtime state.
- Active tab is persisted in URL query param `tabs` (`panelId:index` list).
- Tab labels and visibility can be calculation-derived (FMCalc-lite).
- Children are scoped to active tab using:
  - explicit `groupId` hint (`panelId:tab:index`)
  - geometry fallback inference when explicit metadata is absent.
- Keyboard support:
  - arrow/home/end key handling for tab switch on focused tab controls.

## Limits
- Child mapping is heuristic when explicit DDR metadata is unavailable.
- Full FileMaker-native panel/tab setup parity is not complete.

## Tests
- `/Users/deffenda/Code/FMWebIDE/src/lib/tabs-runtime.test.mts`

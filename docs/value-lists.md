# Value Lists Runtime Parity

## Implemented
- Cache utility:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/value-list-cache.ts`
- Cache tests:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/value-list-cache.test.mts`
- Browse integration + control mapping:
  - `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`

## Behavior
- Value lists are loaded through existing API routes and cached by:
  - workspace
  - scope (database/layout)
  - table occurrence
- Runtime resolves:
  - stored value -> display label
  - display label -> stored value
- Supported controls use value-list options and existing-value augmentation:
  - dropdowns
  - pop-up menu style selectors
  - checkbox/radio option list rendering paths where configured.

## Debug Overlay
With `?debugRuntime=1`, overlay shows:
- cache size
- cache keys
- current privilege role and related runtime state

## Limits
- Full FileMaker control-style option parity (all icon/layout permutations) is not complete.

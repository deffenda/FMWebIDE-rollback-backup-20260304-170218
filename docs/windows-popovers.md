# Popovers and Card Windows (MVP Parity)

## Implemented
- Runtime support in browse renderer:
  - `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`
- Runtime styles:
  - `/Users/deffenda/Code/FMWebIDE/app/globals.css`

## Feature Flags
- `NEXT_PUBLIC_RUNTIME_ENABLE_POPOVERS=1`
- `NEXT_PUBLIC_RUNTIME_ENABLE_CARD_WINDOWS=1`

## Behavior
- Popover button mode can toggle a runtime popover surface.
- Minimal card window modal opens for matching layout-navigation actions.
- Card window shows context metadata (layout + record id).

## Commit/Isolation Notes
- Current card/popover behavior is intentionally lightweight.
- Full FileMaker window stack, nested modal behavior, and transactional isolation are out of scope for this phase.

## Limits
- No script-driven advanced card stack API yet.
- No persisted multi-window state.

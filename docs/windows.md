# Windows and Card Stack (Phase 3)

## Overview
Multi-window state is managed by the runtime kernel:
- `src/lib/runtime-kernel/window-manager.ts`
- `src/lib/runtime-kernel/kernel.ts`

Window model:
- `main` window
- `card` windows
- independent `layout/mode/foundSet/record` state per window
- shared session state (`$$` globals)

## Behaviors Implemented
- `openWindow`, `focusWindow`, `closeWindow`
- per-window navigation history stack
- card window tracking integrated with browse runtime card modal state
- kernel debug snapshot includes full window stack and focused window

## Feature Flags
- `NEXT_PUBLIC_RUNTIME_ENABLE_MULTI_WINDOW` (default enabled unless set to `0`)
- Existing card-window UI flag still applies:
  - `NEXT_PUBLIC_RUNTIME_ENABLE_CARD_WINDOWS=1`

## Current Limits
- Visual card window rendering is still minimal and intentionally non-native in this phase.
- Nested/stacked card window UX and full modal lifecycle parity are future work.

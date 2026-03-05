# Context Stack (Phase 3)

## Overview
Runtime context stack provides FileMaker-like evaluation context per window:
- `src/lib/runtime-kernel/context-stack.ts`

Frame fields:
- `windowId`
- `reason`
- `layoutName`
- `tableOccurrence`
- `recordId`
- `foundSetId`
- optional portal context (`componentId`, `rowToken`, TO)

## Operations
- `pushContextFrame`
- `popContextFrame`
- `currentContextFrame`
- `resolveFieldReference`

## Field Resolution
- `TO::Field` -> explicit TO resolution
- `Field` -> current frame TO (or fallback TO)

## Runtime Integration
- kernel pushes initial + layout-navigation contexts
- browse runtime keeps kernel context aligned with active layout/found set/card windows
- debug overlay shows context stack depth

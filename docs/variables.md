# Runtime Variables (Phase 3)

## Overview
Runtime kernel variable store:
- `src/lib/runtime-kernel/variable-store.ts`
- integrated by `src/lib/runtime-kernel/kernel.ts`

## Supported Lifetimes
- `$$global` variables:
  - session-scoped
  - shared across windows/card windows
- `$local` variables:
  - script-frame scoped
  - cleared when frame exits

## Integration
- script engine reads/writes both `$` and `$$`
- debug snapshot includes global variable names and local frame IDs

## Notes
- Values are stored in-memory for the current browser session.
- Value redaction policy for debug export currently uses name-only summaries.

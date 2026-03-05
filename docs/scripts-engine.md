# FM Script-lite Engine (Phase 3)

## Overview
Phase 3 adds a deterministic client-side script executor:
- `src/lib/runtime-kernel/script-engine.ts`
- orchestrated by `src/lib/runtime-kernel/kernel.ts`

## Supported Step Subset
- Navigation/UI:
  - `Go to Layout`
  - `Go to Record/Request/Page`
  - `Enter Find Mode`
  - `Perform Find`
  - `Show Custom Dialog`
  - `Pause/Resume Script`
  - `Refresh Window`
- Data:
  - `Set Field`
  - `Set Variable`
  - `Commit Records/Requests`
  - `Revert Record/Request`
  - `New Record/Request`
  - `Delete Record/Request`
  - `Open Record/Request`
- Control:
  - `If`, `Else`, `End If`
  - `Perform Script`
  - `Perform Script On Server`
  - `Set Error Capture`
  - `Exit Script`
  - `Comment`

## Runtime Model
- call stack frames with script-local variable scope
- `lastError` + `lastMessage` tracking
- nested script calls with max depth guard
- request/veto behavior handled by existing trigger/policy layer in runtime

## Script Source Mapping
Script Workspace payload can be mapped to engine definitions:
- `src/lib/runtime-kernel/script-workspace-mapper.ts`

This mapper safely downgrades unknown steps to `Comment`.

## Feature Flag
- `NEXT_PUBLIC_RUNTIME_ENABLE_SCRIPT_ENGINE=1`
  - when enabled, browse mode attempts runtime execution first (if step metadata exists), then falls back to server script execution on failure.

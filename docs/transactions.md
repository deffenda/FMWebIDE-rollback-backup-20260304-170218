# Transactions (Phase 8)

Date: 2026-03-01

## Runtime model

Transactions are implemented as staged runtime operations for script-driven field updates:
- `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/transaction-manager.ts`
- Integrated into script execution:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/script-engine.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/kernel.ts`

## Behavior

1. `Begin Transaction`
- Creates an active transaction buffer.
- Subsequent `Set Field`, `Set Field By Name`, and `Replace Field Contents` steps stage operations.

2. `Commit Transaction`
- Applies staged operations in order.
- Runs commit handler (`commitTransaction` or fallback `commit`).
- On failure:
  - attempts revert handler (`revertTransaction` or fallback `revert`)
  - returns consolidated failure message.

3. `Revert Transaction`
- Clears staged operations and marks transaction reverted.

## Notes

- This is client/runtime transaction emulation for deterministic script behavior.
- It is not a 1:1 replacement for server-enforced ACID behavior across all FileMaker deployment modes.
- Runtime kernel snapshots now expose active transaction metadata.

## Tests

- `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/transaction-manager.test.mts`
- `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/script-engine-advanced.test.mts`

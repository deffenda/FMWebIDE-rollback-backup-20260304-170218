# Repeating Fields Runtime Parity

## Core Files
- Helper normalization and mutation:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/repeating-fields.ts`
- Browse runtime rendering/edit lifecycle:
  - `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`

## Implemented Behavior
- Repetition range is normalized from `repetitionsFrom` / `repetitionsTo`.
- Form mode renders repetitions as stacked controls (`1..n`) for repeating fields.
- Each repetition participates in edit-session staging and commit/revert.
- List and table modes render compact repetition display strings.
- Save-on-blur respects per-repetition value changes.

## Edit Session Integration
- Repetition updates are normalized through `applyRepetitionValueChange`.
- Dirty tracking persists as array-style values and commits only changed fields.
- Revert restores original repetition values from snapshot state.

## Tests
- `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-parity.test.mts`

## Limits
- Full FileMaker repetition control styling parity is not complete.
- Advanced validation options per repetition are currently basic and field-level.

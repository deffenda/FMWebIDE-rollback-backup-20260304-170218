# Field Engine Parity Notes

## Scope

Implemented in Phase 4 P0:
- centralized validation on commit
- auto-enter defaults on create
- auto-enter updates on modify

## Core Module

- `src/lib/field-engine.ts`

Exports:
- `buildFieldEngineConfig(...)`
- `validateRecordForCommit(...)`
- `applyAutoEnterOnCreate(...)`
- `applyAutoEnterOnModify(...)`

## Layout Model Integration

Field metadata is read from `LayoutComponent.props` in:
- `src/lib/layout-model.ts`

Supported validation props:
- `validationRequired`
- `strictDataType`
- `validationRangeMin`
- `validationRangeMax`
- `validationPattern`
- `validationCalculation`
- `validationMessage`
- `validationWhen`

Supported auto-enter props:
- `autoEnterCreationTimestamp`
- `autoEnterModificationTimestamp`
- `autoEnterCreationAccountName`
- `autoEnterModificationAccountName`
- `autoEnterSerial`
- `autoEnterCalculation`

## Runtime Integration

- `components/browse-mode.tsx`

Create path:
- auto-enter defaults are merged into outgoing create payload.

Commit path:
1. staged dirty fields collected
2. validation applied
3. if invalid, commit is blocked with field-specific message
4. if valid, modify auto-enter rules are applied and patch submitted

## Validation Behavior

Validation checks:
- required
- strict type (`number`, `date`, `time`, `timestamp`)
- min/max range
- regex pattern
- FMCalc-lite boolean custom rule

Validation failures:
- return structured errors (`FieldValidationError[]`)
- do not crash runtime
- surface in status/error and debug overlay context

## Known Limits

1. Full FileMaker "validate always vs data-entry only" parity is partial.
2. Script-step bypass semantics are not full parity for every script context.
3. Server-side schema-driven validation metadata is not yet exhaustive for all field option combinations.

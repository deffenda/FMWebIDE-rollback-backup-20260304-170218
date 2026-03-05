# Summary Fields & Aggregate Engine (Phase 8)

Date: 2026-03-01

## Engine

Shared summary calculations are now centralized in:
- `/Users/deffenda/Code/FMWebIDE/src/lib/summary-engine.ts`

Supported operations:
- `count`
- `sum`
- `avg`
- `min`
- `max`

## Context support

The engine supports:
- found-set scope (`calculateSummarySet`)
- grouped scope (`calculateGroupedSummarySet`)
- single operation evaluation (`calculateSummaryOperation`)

## Reporting integration

List/table reporting helper now consumes the shared summary engine:
- `/Users/deffenda/Code/FMWebIDE/src/lib/sort-reporting.ts`

This keeps group/subsummary and grand-summary calculations deterministic across runtime rendering paths.

## Tests

- `/Users/deffenda/Code/FMWebIDE/src/lib/summary-engine.test.mts`
- `/Users/deffenda/Code/FMWebIDE/src/lib/sort-reporting.test.mts`

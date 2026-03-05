# Sort and Reporting Parity Notes

## Scope

Implemented in Phase 4 P0:
- deterministic multi-field sort
- grouped list/table rows
- leading/trailing subsummary rows
- grand summary rows

## Core Module

- `src/lib/sort-reporting.ts`

Key types:
- `TableSortEntry`
- `TableSortMode` (`standard` | `valueList`)
- `TableSummaryOperation` (`count` | `sum` | `avg` | `min` | `max`)
- `TableDisplayRow`

## Runtime Integration

- `components/browse-mode.tsx`

Browse runtime uses:
- `sortRecordRows(...)`
- `buildTableDisplayRows(...)`

for table/list rendering paths.

## Sort Behavior

Supported:
- multi-field sort priority
- ascending/descending
- value-list custom order fallback
- stable deterministic tie-breaking via original index
- mixed/null value ordering normalization

## Group/Subsummary Behavior

Supported:
- leading and trailing group headers
- leading/trailing subtotal rows by configured fields
- grand summary rows
- aggregate operations:
  - count
  - sum
  - avg
  - min
  - max

## Known Limits

1. FileMaker-native report-part pagination parity is partial.
2. Locale-specific collation differences can vary from native in edge cases.
3. Value-list-driven sort is subset behavior (no full custom-order editor parity yet).

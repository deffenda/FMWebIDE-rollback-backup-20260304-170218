# Impact Analysis

Impact analysis answers: “If this schema diff is applied, what breaks?”

Implementation:
- `/Users/deffenda/Code/FMWebIDE/src/lib/impactAnalysis/types.ts`
- `/Users/deffenda/Code/FMWebIDE/src/lib/impactAnalysis/index.ts`

## Inputs

- Baseline snapshot
- Target snapshot
- Diff result (`SchemaDiffResult`)
- Optional prebuilt reference index

## Reference Indexing

The indexer builds references from snapshot metadata:
- Layout references (fields, TOs, value lists, portal row fields)
- Script references (fields, TOs, layouts)
- Value list entities
- File and table occurrence ownership links

Output:
- `WorkspaceReferenceIndex` keyed by impacted entity keys (e.g., `field:file:table:field`).

## Impact Report

`ImpactReport` includes:
- Severity (`blocker`, `warn`, `info`)
- Affected entity type (`layout`, `script`, `valueList`, `portal`, `menu`)
- Reason (linked diff change descriptions)
- Recommended action
- Summary counts by severity and entity category
- Unmatched impacted keys (for review of indexing blind spots)

## API

Developer tools endpoint action:
- `impactAnalysis`

Also available via:
- `exportReport` with `reportKind: "impact"`

## Current Scope / Limits

- Script parsing remains best effort (depends on imported script metadata).
- Menu impact mapping is reserved for later expansion where menu-action references are available in snapshot/index inputs.

## Testing

Covered by:
- `/Users/deffenda/Code/FMWebIDE/src/lib/dev-tools.test.mts`

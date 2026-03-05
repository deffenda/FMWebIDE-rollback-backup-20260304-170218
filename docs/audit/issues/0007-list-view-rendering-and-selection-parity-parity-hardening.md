---
title: "IMP-BM-011: List view rendering and selection parity parity hardening"
labels: ["parity", "runtime"]
theme: "Product Polish"
source_capability_id: "BM-011"
composite_score: 4
---
## FileMaker Behavior Goal
List view supports stable row selection, keyboard navigation, and optional inline edit. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need list view rendering and selection parity so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- List view supports stable row selection, keyboard navigation, and optional inline edit.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in app/api/admin/metrics/route.ts, src/lib/list-table-runtime.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- List row select + keyboard up/down tests with selection sync.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 4
- composite_score: 4

## Dependencies
- app/api/admin/metrics/route.ts
- src/lib/list-table-runtime.ts

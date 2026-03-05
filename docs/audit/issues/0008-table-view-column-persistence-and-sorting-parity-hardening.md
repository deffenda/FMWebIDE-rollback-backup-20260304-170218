---
title: "IMP-BM-012: Table view column persistence and sorting parity hardening"
labels: ["parity", "runtime"]
theme: "Product Polish"
source_capability_id: "BM-012"
composite_score: 4
---
## FileMaker Behavior Goal
Table columns support reorder/resize/hide and header sort behavior with persistence. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need table view column persistence and sorting so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Table columns support reorder/resize/hide and header sort behavior with persistence.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in src/server/view-config-storage.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Column config persistence and header sort toggle tests.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 4
- composite_score: 4

## Dependencies
- src/server/view-config-storage.ts

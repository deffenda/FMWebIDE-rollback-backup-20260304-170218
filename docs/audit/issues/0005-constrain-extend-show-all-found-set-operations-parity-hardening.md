---
title: "IMP-BM-004: Constrain/Extend/Show All found set operations parity hardening"
labels: ["parity", "runtime"]
theme: "Product Polish"
source_capability_id: "BM-004"
composite_score: 4
---
## FileMaker Behavior Goal
Found set commands modify active found set with clear status and deterministic behavior. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need constrain/extend/show all found set operations so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Found set commands modify active found set with clear status and deterministic behavior.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in src/lib/find-mode.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Integration tests for constrain and extend preserving index when possible.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 4
- composite_score: 4

## Dependencies
- src/lib/find-mode.ts

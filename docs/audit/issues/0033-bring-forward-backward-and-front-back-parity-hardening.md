---
title: "IMP-LM-003: Bring forward/backward and front/back parity hardening"
labels: ["parity", "design-mode", "dx"]
theme: "Design Mode UX"
source_capability_id: "LM-003"
composite_score: 3.85
---
## FileMaker Behavior Goal
Arrange commands deterministically change object stacking order. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need bring forward/backward and front/back so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Arrange commands deterministically change object stacking order.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in src/lib/layout-arrange.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Z-order point-hit tests across overlapping object fixtures.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- src/lib/layout-arrange.ts

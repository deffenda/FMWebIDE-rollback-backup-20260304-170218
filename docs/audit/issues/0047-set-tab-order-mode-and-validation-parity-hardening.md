---
title: "IMP-LM-020: Set Tab Order mode and validation parity hardening"
labels: ["parity", "design-mode", "dx"]
theme: "Design Mode UX"
source_capability_id: "LM-020"
composite_score: 3.85
---
## FileMaker Behavior Goal
Tab order editing overlays numeric sequence and resolves to deterministic runtime order. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need set tab order mode and validation so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Tab order editing overlays numeric sequence and resolves to deterministic runtime order.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in src/lib/tab-order.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Tab order assignment and runtime traversal tests for hidden/disabled/portal contexts.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- src/lib/tab-order.ts

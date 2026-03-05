---
title: "IMP-LM-006: Canvas lock and autosize anchor editing parity hardening"
labels: ["parity", "design-mode", "dx"]
theme: "Design Mode UX"
source_capability_id: "LM-006"
composite_score: 3.85
---
## FileMaker Behavior Goal
Canvas can be locked in Layout Mode while autosize anchor metadata remains editable. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need canvas lock and autosize anchor editing so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Canvas can be locked in Layout Mode while autosize anchor metadata remains editable.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in src/lib/layout-model.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Mutation commands should no-op when canvas locked; anchor props still persist.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- src/lib/layout-model.ts

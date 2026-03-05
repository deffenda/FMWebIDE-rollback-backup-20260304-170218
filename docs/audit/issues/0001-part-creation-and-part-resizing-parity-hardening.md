---
title: "IMP-LM-007: Part creation and part resizing parity hardening"
labels: ["parity", "layout-engine", "runtime"]
theme: "Layout Rendering Fidelity"
source_capability_id: "LM-007"
composite_score: 4.15
---
## FileMaker Behavior Goal
Header/body/footer and summary parts resize with expected object repositioning semantics. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need part creation and part resizing so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Header/body/footer and summary parts resize with expected object repositioning semantics.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in src/lib/layout-model.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Part resize tests verify object y-offset transforms for adjacent parts.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 5
- composite_score: 4.15

## Dependencies
- src/lib/layout-model.ts

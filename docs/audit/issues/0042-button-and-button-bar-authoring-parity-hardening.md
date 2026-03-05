---
title: "IMP-LM-013: Button and button bar authoring parity hardening"
labels: ["parity", "layout-engine", "runtime"]
theme: "Layout Rendering Fidelity"
source_capability_id: "LM-013"
composite_score: 3.85
---
## FileMaker Behavior Goal
Buttons support script/layout actions; button bars support segment configuration. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need button and button bar authoring so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Buttons support script/layout actions; button bars support segment configuration.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in src/lib/layout-model.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Button action bindings should execute correct runtime command in browse mode.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- src/lib/layout-model.ts

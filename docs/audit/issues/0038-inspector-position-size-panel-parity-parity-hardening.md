---
title: "IMP-LM-009: Inspector position/size panel parity parity hardening"
labels: ["parity", "layout-engine", "runtime"]
theme: "Layout Rendering Fidelity"
source_capability_id: "LM-009"
composite_score: 3.85
---
## FileMaker Behavior Goal
Inspector edits x/y/width/height and z values directly with immediate visual update. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need inspector position/size panel parity so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Inspector edits x/y/width/height and z values directly with immediate visual update.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in src/lib/layout-model.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Inspector value updates should mutate selected object and persist to layout JSON.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- src/lib/layout-model.ts

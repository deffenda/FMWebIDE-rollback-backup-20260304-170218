---
title: "IMP-BM-015: Date control icon and calendar toggle parity parity hardening"
labels: ["parity", "runtime"]
theme: "Product Polish"
source_capability_id: "BM-015"
composite_score: 3.85
---
## FileMaker Behavior Goal
Date controls show calendar icon when enabled and allow date picking in portal and non-portal contexts. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need date control icon and calendar toggle parity so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Date controls show calendar icon when enabled and allow date picking in portal and non-portal contexts.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in app/globals.css, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Visual and interaction tests for include-icon flag across view contexts.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- app/globals.css

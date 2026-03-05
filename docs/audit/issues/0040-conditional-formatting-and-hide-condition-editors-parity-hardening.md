---
title: "IMP-LM-011: Conditional formatting and hide condition editors parity hardening"
labels: ["parity", "layout-engine", "runtime"]
theme: "Layout Rendering Fidelity"
source_capability_id: "LM-011"
composite_score: 3.85
---
## FileMaker Behavior Goal
Developers can define conditional style and visibility rules at object level. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need conditional formatting and hide condition editors so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Developers can define conditional style and visibility rules at object level.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in app/globals.css, src/lib/fmcalc/index.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Rule save + runtime eval tests for hideObjectWhen and conditional formatting outputs.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- app/globals.css
- src/lib/fmcalc/index.ts

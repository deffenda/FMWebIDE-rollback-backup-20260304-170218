---
title: "IMP-LM-004: Align/distribute for multi-object selections parity hardening"
labels: ["parity", "design-mode", "dx"]
theme: "Design Mode UX"
source_capability_id: "LM-004"
composite_score: 3.85
---
## FileMaker Behavior Goal
Align/distribute uses selected object boundary math similar to FileMaker. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need align/distribute for multi-object selections so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Align/distribute uses selected object boundary math similar to FileMaker.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in app/globals.css, src/lib/layout-arrange.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Unit tests for left/right/top/bottom/center align and distribute spacing on mixed selections.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- app/globals.css
- src/lib/layout-arrange.ts

---
title: "IMP-DR-010: Portal alternate/active row visual states parity hardening"
labels: ["parity", "portals", "runtime"]
theme: "Portals"
source_capability_id: "DR-010"
composite_score: 3.85
---
## FileMaker Behavior Goal
Alternate row shading only appears when configured; active row state is explicit. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need portal alternate/active row visual states so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Alternate row shading only appears when configured; active row state is explicit.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in src/lib/portal-runtime.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Row visual state tests for alternate and active flags combinations.

## Scoring
- user_impact: 4
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 5
- composite_score: 3.85

## Dependencies
- src/lib/portal-runtime.ts

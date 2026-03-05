---
title: "IMP-LM-019: Clipboard and duplicate object workflows parity hardening"
labels: ["parity", "design-mode", "dx"]
theme: "Design Mode UX"
source_capability_id: "LM-019"
composite_score: 3.85
---
## FileMaker Behavior Goal
Copy/paste/duplicate operations preserve style/binding semantics and assign new ids. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need clipboard and duplicate object workflows so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Copy/paste/duplicate operations preserve style/binding semantics and assign new ids.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in src/lib/layout-utils.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Duplicated objects must receive unique ids and retain props except identity.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- src/lib/layout-utils.ts

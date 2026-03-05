---
title: "IMP-BM-008: Commit/Revert edit session semantics parity hardening"
labels: ["parity", "design-mode", "dx"]
theme: "Design Mode UX"
source_capability_id: "BM-008"
composite_score: 3.85
---
## FileMaker Behavior Goal
Dirty edits can be committed or reverted with prompts on navigation changes. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need commit/revert edit session semantics so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Dirty edits can be committed or reverted with prompts on navigation changes.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in src/lib/edit-session/index.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Dirty prompt tests and per-record revert behavior validations.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- src/lib/edit-session/index.ts

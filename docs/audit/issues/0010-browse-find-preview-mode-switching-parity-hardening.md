---
title: "IMP-BM-001: Browse/Find/Preview mode switching parity hardening"
labels: ["parity", "design-mode", "dx"]
theme: "Design Mode UX"
source_capability_id: "BM-001"
composite_score: 3.85
---
## FileMaker Behavior Goal
Users can switch modes reliably without losing context or causing render loops. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need browse/find/preview mode switching so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Users can switch modes reliably without losing context or causing render loops.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in src/lib/browse-url-state.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Stress test repeated mode switches while editing and filtering records.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- src/lib/browse-url-state.ts

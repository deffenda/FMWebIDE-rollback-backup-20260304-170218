---
title: "IMP-BM-003: Multi-request find editing and omit logic parity hardening"
labels: ["parity", "runtime"]
theme: "Product Polish"
source_capability_id: "BM-003"
composite_score: 4
---
## FileMaker Behavior Goal
Find mode supports multiple requests, omit flags, and request navigation. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need multi-request find editing and omit logic so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Find mode supports multiple requests, omit flags, and request navigation.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in src/lib/find-mode.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Test add/duplicate/delete request and omit behavior against deterministic dataset.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 4
- composite_score: 4

## Dependencies
- src/lib/find-mode.ts

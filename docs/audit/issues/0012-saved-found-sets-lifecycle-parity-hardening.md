---
title: "IMP-BM-006: Saved found sets lifecycle parity hardening"
labels: ["parity", "design-mode", "dx"]
theme: "Design Mode UX"
source_capability_id: "BM-006"
composite_score: 3.85
---
## FileMaker Behavior Goal
Users can persist found-set snapshots and reopen with graceful missing-record handling. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need saved found sets lifecycle so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Users can persist found-set snapshots and reopen with graceful missing-record handling.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in src/server/saved-search-storage.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Saved found set open should skip missing ids and report reconciliation summary.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- src/server/saved-search-storage.ts

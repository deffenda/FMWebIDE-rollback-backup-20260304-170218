---
title: "IMP-BM-002: Record navigator parity parity hardening"
labels: ["parity", "design-mode", "dx"]
theme: "Design Mode UX"
source_capability_id: "BM-002"
composite_score: 3.85
---
## FileMaker Behavior Goal
First/prev/next/last and record jump update current record and status area consistently. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need record navigator parity so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- First/prev/next/last and record jump update current record and status area consistently.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in src/lib/runtime-kernel/foundset-store.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Integration tests for first/prev/next/last + jump input across view modes.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- src/lib/runtime-kernel/foundset-store.ts

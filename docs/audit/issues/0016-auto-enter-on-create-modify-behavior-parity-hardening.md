---
title: "IMP-BM-010: Auto-enter on create/modify behavior parity hardening"
labels: ["parity", "design-mode", "dx"]
theme: "Design Mode UX"
source_capability_id: "BM-010"
composite_score: 3.85
---
## FileMaker Behavior Goal
Auto-enter options apply timestamps, account names, serials, and calc defaults at proper times. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need auto-enter on create/modify behavior so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Auto-enter options apply timestamps, account names, serials, and calc defaults at proper times.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in src/lib/field-engine.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Create/update tests verifying auto-enter field values.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- src/lib/field-engine.ts

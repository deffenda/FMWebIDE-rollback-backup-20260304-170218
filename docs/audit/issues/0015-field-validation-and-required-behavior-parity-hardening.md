---
title: "IMP-BM-009: Field validation and required behavior parity hardening"
labels: ["parity", "design-mode", "dx"]
theme: "Design Mode UX"
source_capability_id: "BM-009"
composite_score: 3.85
---
## FileMaker Behavior Goal
Validation rules block invalid commits with field-level guidance. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need field validation and required behavior so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Validation rules block invalid commits with field-level guidance.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in src/lib/field-engine.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Validation failure tests for required/type/range/calc rules.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- src/lib/field-engine.ts

---
title: "IMP-SE-001: Session auth middleware and role context parity hardening"
labels: ["parity", "security"]
theme: "Security/Compliance"
source_capability_id: "SE-001"
composite_score: 3.85
---
## FileMaker Behavior Goal
API requests derive authenticated user/role context before executing privileged actions. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need session auth middleware and role context so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- API requests derive authenticated user/role context before executing privileged actions.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in middleware.ts, src/server/security/request-context.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Request guard tests for authenticated and unauthenticated API calls.

## Scoring
- user_impact: 4
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 5
- composite_score: 3.85

## Dependencies
- middleware.ts
- src/server/security/request-context.ts

---
title: "IMP-SE-002: JWT and trusted-header auth modes parity hardening"
labels: ["parity", "security"]
theme: "Security/Compliance"
source_capability_id: "SE-002"
composite_score: 3.85
---
## FileMaker Behavior Goal
Deployment can use trusted-header SSO or JWT modes without client secrets. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need jwt and trusted-header auth modes so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Deployment can use trusted-header SSO or JWT modes without client secrets.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in src/server/security/jwt.ts, src/server/security/middleware-auth.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Security hardening tests for JWT validation and trusted-header mode.

## Scoring
- user_impact: 4
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 5
- composite_score: 3.85

## Dependencies
- src/server/security/jwt.ts
- src/server/security/middleware-auth.ts

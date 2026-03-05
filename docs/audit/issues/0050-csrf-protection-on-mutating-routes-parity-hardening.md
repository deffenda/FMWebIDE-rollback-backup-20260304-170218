---
title: "IMP-SE-003: CSRF protection on mutating routes parity hardening"
labels: ["parity", "security"]
theme: "Security/Compliance"
source_capability_id: "SE-003"
composite_score: 3.85
---
## FileMaker Behavior Goal
Mutating API calls require valid CSRF cookie/header pairs when enabled. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need csrf protection on mutating routes so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Mutating API calls require valid CSRF cookie/header pairs when enabled.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in src/server/security/csrf.ts, src/server/security/request-context.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- CSRF mismatch tests return 403 with guidance.

## Scoring
- user_impact: 4
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 5
- composite_score: 3.85

## Dependencies
- src/server/security/csrf.ts
- src/server/security/request-context.ts

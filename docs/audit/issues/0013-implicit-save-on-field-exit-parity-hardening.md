---
title: "IMP-BM-007: Implicit save on field exit parity hardening"
labels: ["parity", "design-mode", "dx"]
theme: "Design Mode UX"
source_capability_id: "BM-007"
composite_score: 3.85
---
## FileMaker Behavior Goal
Leaving a field commits changes when allowed, without forcing explicit save each time. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need implicit save on field exit so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Leaving a field commits changes when allowed, without forcing explicit save each time.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in app/api/layouts/[id]/route.ts, src/lib/edit-session/index.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Blur save test with record navigation and value persistence checks.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- app/api/layouts/[id]/route.ts
- src/lib/edit-session/index.ts

---
title: "IMP-DR-009: Portal row write target resolution parity hardening"
labels: ["parity", "portals", "runtime"]
theme: "Portals"
source_capability_id: "DR-009"
composite_score: 3.85
---
## FileMaker Behavior Goal
Portal field writes resolve to correct related record id/mod id across parent navigation. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need portal row write target resolution so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Portal field writes resolve to correct related record id/mod id across parent navigation.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in app/api/fm/container/upload/route.ts, src/lib/portal-runtime.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Portal save regression tests across multiple parent records.

## Scoring
- user_impact: 4
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 5
- composite_score: 3.85

## Dependencies
- app/api/fm/container/upload/route.ts
- src/lib/portal-runtime.ts

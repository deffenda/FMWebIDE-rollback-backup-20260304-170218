---
title: "IMP-DR-006: Portal row rendering as template controls parity hardening"
labels: ["parity", "portals", "runtime"]
theme: "Portals"
source_capability_id: "DR-006"
composite_score: 3.85
---
## FileMaker Behavior Goal
Portal rows render placed field objects and preserve control styles. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need portal row rendering as template controls so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Portal rows render placed field objects and preserve control styles.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in src/lib/portal-runtime.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Portal render tests ensuring no fallback grid overlays when template children exist.

## Scoring
- user_impact: 4
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 5
- composite_score: 3.85

## Dependencies
- src/lib/portal-runtime.ts

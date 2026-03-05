---
title: "IMP-BM-017: Status area parity actions parity hardening"
labels: ["parity", "design-mode", "dx"]
theme: "Design Mode UX"
source_capability_id: "BM-017"
composite_score: 3.85
---
## FileMaker Behavior Goal
Status area exposes key record/find/sort/view actions relevant to active mode. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need status area parity actions so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Status area exposes key record/find/sort/view actions relevant to active mode.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in docs/status-menubar-parity.md, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Mode-specific status toolbar action tests with capability gating.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- docs/status-menubar-parity.md

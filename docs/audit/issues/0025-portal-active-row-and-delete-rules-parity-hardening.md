---
title: "IMP-DR-007: Portal active row and delete rules parity hardening"
labels: ["parity", "portals", "runtime"]
theme: "Portals"
source_capability_id: "DR-007"
composite_score: 3.85
---
## FileMaker Behavior Goal
Active row state and row delete actions obey portal setup and privileges. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need portal active row and delete rules so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Active row state and row delete actions obey portal setup and privileges.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in docs/filemaker-regression-matrix.md, docs/phase-3-plan.md, docs/phase-4-plan.md, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Portal active-row selection and delete action tests with allow-delete toggles.

## Scoring
- user_impact: 4
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 5
- composite_score: 3.85

## Dependencies
- docs/filemaker-regression-matrix.md
- docs/phase-3-plan.md
- docs/phase-4-plan.md
- docs/portals.md

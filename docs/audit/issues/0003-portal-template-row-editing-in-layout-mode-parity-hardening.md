---
title: "IMP-LM-017: Portal template row editing in layout mode parity hardening"
labels: ["parity", "portals", "runtime"]
theme: "Portals"
source_capability_id: "LM-017"
composite_score: 4.15
---
## FileMaker Behavior Goal
Related fields are positioned in portal template row and row separator is visible. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need portal template row editing in layout mode so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Related fields are positioned in portal template row and row separator is visible.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in app/globals.css, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Visual regression for portal layout mode with only native separator/overlay elements.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 5
- composite_score: 4.15

## Dependencies
- app/globals.css

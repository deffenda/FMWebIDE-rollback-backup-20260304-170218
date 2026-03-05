---
title: "IMP-LM-015: Popover object authoring parity hardening"
labels: ["parity", "layout-engine", "runtime"]
theme: "Layout Rendering Fidelity"
source_capability_id: "LM-015"
composite_score: 3.85
---
## FileMaker Behavior Goal
Popover button and popover panel metadata can be configured in layout mode. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need popover object authoring so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Popover button and popover panel metadata can be configured in layout mode.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in app/globals.css, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Popover config persists and runtime popover opens with expected geometry and title.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- app/globals.css

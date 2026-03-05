---
title: "IMP-LM-005: Rulers and guides with snap behavior parity hardening"
labels: ["parity", "design-mode", "dx"]
theme: "Design Mode UX"
source_capability_id: "LM-005"
composite_score: 3.85
---
## FileMaker Behavior Goal
Rulers and guides are visually aligned to canvas coordinates and snapping toggles. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need rulers and guides with snap behavior so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Rulers and guides are visually aligned to canvas coordinates and snapping toggles.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in app/globals.css, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Visual regressions at different zoom levels for ruler ticks and guide intersections.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- app/globals.css

---
title: "IMP-LM-012: Field control type parity (edit/popup/dropdown/checkbox/radio/date) parity hardening"
labels: ["parity", "layout-engine", "runtime"]
theme: "Layout Rendering Fidelity"
source_capability_id: "LM-012"
composite_score: 3.85
---
## FileMaker Behavior Goal
Field objects support control types and display options matching inspector settings. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need field control type parity (edit/popup/dropdown/checkbox/radio/date) so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Field objects support control types and display options matching inspector settings.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in app/api/admin/metrics/route.ts, app/api/fm/records/route.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Render each control type in layout and browse mode and assert visual affordances.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- app/api/admin/metrics/route.ts
- app/api/fm/records/route.ts

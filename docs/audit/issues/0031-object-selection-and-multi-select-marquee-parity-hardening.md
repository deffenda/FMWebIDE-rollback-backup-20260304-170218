---
title: "IMP-LM-001: Object selection and multi-select marquee parity hardening"
labels: ["parity", "design-mode", "dx"]
theme: "Design Mode UX"
source_capability_id: "LM-001"
composite_score: 3.85
---
## FileMaker Behavior Goal
Layout Mode supports precise click, shift-click, and marquee selection with deterministic selection sets. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need object selection and multi-select marquee so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Layout Mode supports precise click, shift-click, and marquee selection with deterministic selection sets.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in app/globals.css, src/lib/layout-arrange.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Run pointer interaction tests for click, shift-click, marquee-add, marquee-remove across grouped and portal objects.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- app/globals.css
- src/lib/layout-arrange.ts

---
title: "IMP-LM-008: Field placement from schema browser parity hardening"
labels: ["parity", "design-mode", "dx"]
theme: "Design Mode UX"
source_capability_id: "LM-008"
composite_score: 3.85
---
## FileMaker Behavior Goal
Dragging fields onto layout can create field+label patterns with consistent placement modes. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need field placement from schema browser so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Dragging fields onto layout can create field+label patterns with consistent placement modes.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in app/diagnostics/parity/page.tsx, app/globals.css, src/lib/layout-utils.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Drag field placement snapshot tests for side-by-side and stacked modes.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- app/diagnostics/parity/page.tsx
- app/globals.css
- src/lib/layout-utils.ts

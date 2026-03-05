---
title: "IMP-DR-015: Relationship graph visualization parity hardening"
labels: ["parity", "dx"]
theme: "Schema/DDR tooling"
source_capability_id: "DR-015"
composite_score: 3.85
---
## FileMaker Behavior Goal
TO relationships can be explored visually, including cross-file edges. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need relationship graph visualization so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- TO relationships can be explored visually, including cross-file edges.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in components/developer-tools-panel.tsx, src/lib/relationshipGraph/index.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Graph builder tests and developer tools UI filter/search interactions.

## Scoring
- user_impact: 4
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 5
- composite_score: 3.85

## Dependencies
- components/developer-tools-panel.tsx
- src/lib/relationshipGraph/index.ts

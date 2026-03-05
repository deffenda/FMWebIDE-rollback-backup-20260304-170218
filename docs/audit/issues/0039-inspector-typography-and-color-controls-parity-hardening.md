---
title: "IMP-LM-010: Inspector typography and color controls parity hardening"
labels: ["parity", "layout-engine", "runtime"]
theme: "Layout Rendering Fidelity"
source_capability_id: "LM-010"
composite_score: 3.85
---
## FileMaker Behavior Goal
Font, size, color, alignment, borders, fills, shadows map to object styles. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need inspector typography and color controls so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Font, size, color, alignment, borders, fills, shadows map to object styles.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in src/lib/layout-fidelity/style-resolver.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Style field changes must persist and map to runtime style resolver output.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- src/lib/layout-fidelity/style-resolver.ts

---
title: "IMP-BM-020: Error banner usability and guidance parity hardening"
labels: ["parity", "design-mode", "dx"]
theme: "Design Mode UX"
source_capability_id: "BM-020"
composite_score: 3.85
---
## FileMaker Behavior Goal
Runtime failures show actionable guidance while preserving debug details for developers. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need error banner usability and guidance so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Runtime failures show actionable guidance while preserving debug details for developers.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in components/app-layer-error-banner.tsx, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Error rendering tests for known Data API failures and guidance mapping.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- components/app-layer-error-banner.tsx

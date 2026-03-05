---
title: "IMP-BM-013: Preview mode print-oriented rendering parity hardening"
labels: ["parity", "runtime"]
theme: "Product Polish"
source_capability_id: "BM-013"
composite_score: 4
---
## FileMaker Behavior Goal
Preview mode is read-only, shows print-like output, and supports record navigation. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need preview mode print-oriented rendering so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Preview mode is read-only, shows print-like output, and supports record navigation.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in docs/preview-mode.md, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Browse->Preview->Browse state-preservation tests and preview snapshot checks.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 4
- composite_score: 4

## Dependencies
- docs/preview-mode.md

---
title: "IMP-BM-016: Container field context menu actions parity hardening"
labels: ["parity", "runtime"]
theme: "Product Polish"
source_capability_id: "BM-016"
composite_score: 3.85
---
## FileMaker Behavior Goal
Container fields expose insert/export/clipboard actions with permission-aware states. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need container field context menu actions so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Container fields expose insert/export/clipboard actions with permission-aware states.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in src/lib/container-runtime.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Container menu action tests for insert/export with mock and filemaker sources.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- src/lib/container-runtime.ts

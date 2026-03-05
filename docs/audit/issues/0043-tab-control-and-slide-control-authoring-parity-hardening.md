---
title: "IMP-LM-014: Tab control and slide control authoring parity hardening"
labels: ["parity", "layout-engine", "runtime"]
theme: "Layout Rendering Fidelity"
source_capability_id: "LM-014"
composite_score: 3.85
---
## FileMaker Behavior Goal
Panel objects support tab labels, default tab, and panel navigation properties. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need tab control and slide control authoring so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Panel objects support tab labels, default tab, and panel navigation properties.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in src/lib/tabs-runtime.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Panel config changes should alter browse-mode panel behavior and active tab serialization.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- src/lib/tabs-runtime.ts

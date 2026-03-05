---
title: "IMP-DR-013: DDR import workspace and layout normalization parity hardening"
labels: ["parity", "dx"]
theme: "Schema/DDR tooling"
source_capability_id: "DR-013"
composite_score: 3.85
---
## FileMaker Behavior Goal
DDR import creates normalized workspace/layout metadata ready for rendering and editing. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need ddr import workspace and layout normalization so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- DDR import creates normalized workspace/layout metadata ready for rendering and editing.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in app/api/workspaces/import/route.ts, scripts/import-ddr-layouts.mjs, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Import route tests with summary and direct DDR uploads, asserting workspace/layout artifacts.

## Scoring
- user_impact: 4
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 5
- composite_score: 3.85

## Dependencies
- app/api/workspaces/import/route.ts
- scripts/import-ddr-layouts.mjs

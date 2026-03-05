---
title: "IMP-BM-014: Value list controls in browse and find parity hardening"
labels: ["parity", "runtime"]
theme: "Product Polish"
source_capability_id: "BM-014"
composite_score: 3.85
---
## FileMaker Behavior Goal
Value list controls present consistent stored/display values in browse and find criteria contexts. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need value list controls in browse and find so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Value list controls present consistent stored/display values in browse and find criteria contexts.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in app/api/workspaces/[workspaceId]/developer-tools/route.ts, app/api/workspaces/[workspaceId]/manage-value-lists/route.ts, src/lib/value-list-cache.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Dropdown/radio/checkbox tests for display/stored mapping and find criteria.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- app/api/workspaces/[workspaceId]/developer-tools/route.ts
- app/api/workspaces/[workspaceId]/manage-value-lists/route.ts
- src/lib/value-list-cache.ts

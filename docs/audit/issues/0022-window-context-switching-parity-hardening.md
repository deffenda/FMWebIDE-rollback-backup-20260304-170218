---
title: "IMP-BM-019: Window/context switching parity hardening"
labels: ["parity", "design-mode", "dx"]
theme: "Design Mode UX"
source_capability_id: "BM-019"
composite_score: 3.85
---
## FileMaker Behavior Goal
Users can switch among workspaces/files/windows with stable context and no stale entries. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need window/context switching so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Users can switch among workspaces/files/windows with stable context and no stale entries.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in src/server/workspace-context.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Window menu list hygiene tests and workspace switch route tests.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- src/server/workspace-context.ts

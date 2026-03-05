---
title: "IMP-BM-018: Menubar parity and shortcut execution parity hardening"
labels: ["parity", "design-mode", "dx"]
theme: "Design Mode UX"
source_capability_id: "BM-018"
composite_score: 3.85
---
## FileMaker Behavior Goal
Menubar displays expected command groups and keyboard shortcuts execute supported commands. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need menubar parity and shortcut execution so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Menubar displays expected command groups and keyboard shortcuts execute supported commands.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in app/api/workspaces/[workspaceId]/developer-tools/route.ts, app/globals.css, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Menu command and shortcut dispatch tests by mode and role.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- app/api/workspaces/[workspaceId]/developer-tools/route.ts
- app/globals.css

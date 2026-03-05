---
title: "IMP-LM-018: Create New Layout wizard with templates parity hardening"
labels: ["parity", "design-mode", "dx"]
theme: "Design Mode UX"
source_capability_id: "LM-018"
composite_score: 3.85
---
## FileMaker Behavior Goal
New Layout flow offers template choices and generates reasonable starter layout structures. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need create new layout wizard with templates so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- New Layout flow offers template choices and generates reasonable starter layout structures.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in app/globals.css, src/server/layout-storage.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Template selection should produce expected parts and starter object sets.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 3
- composite_score: 3.85

## Dependencies
- app/globals.css
- src/server/layout-storage.ts

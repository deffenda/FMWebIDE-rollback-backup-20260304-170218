---
title: "IMP-LM-016: Portal setup dialog parity parity hardening"
labels: ["parity", "portals", "runtime"]
theme: "Portals"
source_capability_id: "LM-016"
composite_score: 4.15
---
## FileMaker Behavior Goal
Portal setup supports rows, sorting, filtering, delete permission, and row state toggles. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need portal setup dialog parity so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Portal setup supports rows, sorting, filtering, delete permission, and row state toggles.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in src/lib/portal-utils.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Portal setup changes should alter browse-mode portal rendering and behavior.

## Scoring
- user_impact: 5
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 5
- composite_score: 4.15

## Dependencies
- src/lib/portal-utils.ts

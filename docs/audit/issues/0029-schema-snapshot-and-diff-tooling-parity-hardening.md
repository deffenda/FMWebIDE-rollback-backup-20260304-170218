---
title: "IMP-DR-014: Schema snapshot and diff tooling parity hardening"
labels: ["parity", "dx"]
theme: "Schema/DDR tooling"
source_capability_id: "DR-014"
composite_score: 3.85
---
## FileMaker Behavior Goal
Developers can snapshot, diff, and assess schema changes across versions/files. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.

## User Story
As a FileMaker developer, I need schema snapshot and diff tooling so FMWeb IDE behaves like native FileMaker for this workflow.

## Acceptance Criteria
- Developers can snapshot, diff, and assess schema changes across versions/files.
- Behavior is deterministic across repeated runs.
- Regression tests cover success and failure paths.

## Suggested Technical Approach
Refine existing implementation in components/developer-tools-panel.tsx, src/lib/schemaDiff/diff.ts, src/lib/schemaDiff/index.ts, then close parity gaps with deterministic behavior tests.

## Test Strategy
- Dev tools tests for snapshot creation and diff result determinism.

## Scoring
- user_impact: 4
- parity_importance: 3
- complexity_score: 2
- risk: 2
- leverage: 5
- composite_score: 3.85

## Dependencies
- components/developer-tools-panel.tsx
- src/lib/schemaDiff/diff.ts
- src/lib/schemaDiff/index.ts
- src/lib/schemaDiff/types.ts

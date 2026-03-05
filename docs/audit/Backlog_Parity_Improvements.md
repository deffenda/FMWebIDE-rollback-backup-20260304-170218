# Backlog Parity Improvements

Total discrete improvements generated: **100**

## Scoring Formula

Composite score = 0.30*user_impact + 0.30*parity_importance + 0.15*(6-complexity_score) + 0.10*(6-risk) + 0.15*leverage

## Buckets

- Now: 20
- Next: 30
- Later: 50

## Theme: Layout Rendering Fidelity

### 1. IMP-LM-007 — Part creation and part resizing parity hardening (Now)
- Theme: Layout Rendering Fidelity
- Description (FileMaker terms): Header/body/footer and summary parts resize with expected object repositioning semantics. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need part creation and part resizing so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Header/body/footer and summary parts resize with expected object repositioning semantics.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/layout-model.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Part resize tests verify object y-offset transforms for adjacent parts.
- Complexity: S
- Dependencies: src/lib/layout-model.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=5, composite=4.15

### 38. IMP-LM-009 — Inspector position/size panel parity parity hardening (Next)
- Theme: Layout Rendering Fidelity
- Description (FileMaker terms): Inspector edits x/y/width/height and z values directly with immediate visual update. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need inspector position/size panel parity so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Inspector edits x/y/width/height and z values directly with immediate visual update.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/layout-model.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Inspector value updates should mutate selected object and persist to layout JSON.
- Complexity: S
- Dependencies: src/lib/layout-model.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

### 39. IMP-LM-010 — Inspector typography and color controls parity hardening (Next)
- Theme: Layout Rendering Fidelity
- Description (FileMaker terms): Font, size, color, alignment, borders, fills, shadows map to object styles. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need inspector typography and color controls so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Font, size, color, alignment, borders, fills, shadows map to object styles.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/layout-fidelity/style-resolver.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Style field changes must persist and map to runtime style resolver output.
- Complexity: S
- Dependencies: src/lib/layout-fidelity/style-resolver.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

### 40. IMP-LM-011 — Conditional formatting and hide condition editors parity hardening (Next)
- Theme: Layout Rendering Fidelity
- Description (FileMaker terms): Developers can define conditional style and visibility rules at object level. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need conditional formatting and hide condition editors so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Developers can define conditional style and visibility rules at object level.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in app/globals.css, src/lib/fmcalc/index.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Rule save + runtime eval tests for hideObjectWhen and conditional formatting outputs.
- Complexity: S
- Dependencies: app/globals.css, src/lib/fmcalc/index.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

### 41. IMP-LM-012 — Field control type parity (edit/popup/dropdown/checkbox/radio/date) parity hardening (Next)
- Theme: Layout Rendering Fidelity
- Description (FileMaker terms): Field objects support control types and display options matching inspector settings. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need field control type parity (edit/popup/dropdown/checkbox/radio/date) so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Field objects support control types and display options matching inspector settings.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in app/api/admin/metrics/route.ts, app/api/fm/records/route.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Render each control type in layout and browse mode and assert visual affordances.
- Complexity: S
- Dependencies: app/api/admin/metrics/route.ts, app/api/fm/records/route.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

### 42. IMP-LM-013 — Button and button bar authoring parity hardening (Next)
- Theme: Layout Rendering Fidelity
- Description (FileMaker terms): Buttons support script/layout actions; button bars support segment configuration. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need button and button bar authoring so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Buttons support script/layout actions; button bars support segment configuration.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/layout-model.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Button action bindings should execute correct runtime command in browse mode.
- Complexity: S
- Dependencies: src/lib/layout-model.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

### 43. IMP-LM-014 — Tab control and slide control authoring parity hardening (Next)
- Theme: Layout Rendering Fidelity
- Description (FileMaker terms): Panel objects support tab labels, default tab, and panel navigation properties. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need tab control and slide control authoring so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Panel objects support tab labels, default tab, and panel navigation properties.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/tabs-runtime.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Panel config changes should alter browse-mode panel behavior and active tab serialization.
- Complexity: S
- Dependencies: src/lib/tabs-runtime.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

### 44. IMP-LM-015 — Popover object authoring parity hardening (Next)
- Theme: Layout Rendering Fidelity
- Description (FileMaker terms): Popover button and popover panel metadata can be configured in layout mode. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need popover object authoring so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Popover button and popover panel metadata can be configured in layout mode.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in app/globals.css, then close parity gaps with deterministic behavior tests.
- Test Strategy: Popover config persists and runtime popover opens with expected geometry and title.
- Complexity: S
- Dependencies: app/globals.css
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

### 59. IMP-DR-001 — Table occurrence context resolution parity hardening (Later)
- Theme: Layout Rendering Fidelity
- Description (FileMaker terms): Field references resolve via current TO or explicit TO::Field with deterministic fallback. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need table occurrence context resolution so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Field references resolve via current TO or explicit TO::Field with deterministic fallback.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/runtime-kernel/context-stack.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Context stack tests for explicit and implicit TO field references.
- Complexity: S
- Dependencies: src/lib/runtime-kernel/context-stack.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

### 60. IMP-DR-002 — Relationship traversal across files parity hardening (Later)
- Theme: Layout Rendering Fidelity
- Description (FileMaker terms): Cross-file relationships route reads/writes to correct database and layout context. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need relationship traversal across files so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Cross-file relationships route reads/writes to correct database and layout context.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/server/filemaker-client.ts, src/server/workspace-multifile.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Workspace-multifile integration tests for cross-file field and portal actions.
- Complexity: S
- Dependencies: src/server/filemaker-client.ts, src/server/workspace-multifile.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

### 61. IMP-DR-003 — API layout mapping by TO parity hardening (Later)
- Theme: Layout Rendering Fidelity
- Description (FileMaker terms): Runtime can map each TO to writable layout context for Data API operations. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need api layout mapping by to so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Runtime can map each TO to writable layout context for Data API operations.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/server/workspace-context.ts, src/server/workspace-multifile.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Routing tests for missing and resolved apiLayoutsByTableOccurrence mappings.
- Complexity: S
- Dependencies: src/server/workspace-context.ts, src/server/workspace-multifile.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

### 62. IMP-DR-004 — Found set paging and index stability parity hardening (Later)
- Theme: Layout Rendering Fidelity
- Description (FileMaker terms): Large found sets support stable paging and current-record index semantics. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need found set paging and index stability so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Large found sets support stable paging and current-record index semantics.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/list-table-runtime.ts, src/lib/runtime-kernel/foundset-store.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Found set store tests for goto index, refresh, and page transitions.
- Complexity: S
- Dependencies: src/lib/list-table-runtime.ts, src/lib/runtime-kernel/foundset-store.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

### 63. IMP-DR-005 — Sort/group/subsummary integration parity hardening (Later)
- Theme: Layout Rendering Fidelity
- Description (FileMaker terms): Sort and grouping specs drive grouped rows and summary outputs in list/table/preview. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need sort/group/subsummary integration so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Sort and grouping specs drive grouped rows and summary outputs in list/table/preview.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/sort-reporting.ts, src/lib/summary-engine.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Sort reporting tests for summary rows and grouped output stability.
- Complexity: S
- Dependencies: src/lib/sort-reporting.ts, src/lib/summary-engine.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

### 64. IMP-DR-011 — Repeating field render/edit parity parity hardening (Later)
- Theme: Layout Rendering Fidelity
- Description (FileMaker terms): Repeating fields render and commit per repetition with stable binding. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need repeating field render/edit parity so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Repeating fields render and commit per repetition with stable binding.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/repeating-fields.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Repeating field binding tests for parse/update/commit paths.
- Complexity: S
- Dependencies: src/lib/repeating-fields.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

### 65. IMP-DR-012 — Container fetch/upload via secure proxy parity hardening (Later)
- Theme: Layout Rendering Fidelity
- Description (FileMaker terms): Container assets can be fetched and uploaded without exposing Data API auth to browser. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need container fetch/upload via secure proxy so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Container assets can be fetched and uploaded without exposing Data API auth to browser.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in app/api/fm/container/route.ts, app/api/fm/container/upload/route.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Container GET/POST route tests with host validation and upload success.
- Complexity: S
- Dependencies: app/api/fm/container/route.ts, app/api/fm/container/upload/route.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

## Theme: Design Mode UX

### 10. IMP-BM-001 — Browse/Find/Preview mode switching parity hardening (Now)
- Theme: Design Mode UX
- Description (FileMaker terms): Users can switch modes reliably without losing context or causing render loops. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need browse/find/preview mode switching so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Users can switch modes reliably without losing context or causing render loops.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/browse-url-state.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Stress test repeated mode switches while editing and filtering records.
- Complexity: S
- Dependencies: src/lib/browse-url-state.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

### 11. IMP-BM-002 — Record navigator parity parity hardening (Now)
- Theme: Design Mode UX
- Description (FileMaker terms): First/prev/next/last and record jump update current record and status area consistently. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need record navigator parity so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - First/prev/next/last and record jump update current record and status area consistently.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/runtime-kernel/foundset-store.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Integration tests for first/prev/next/last + jump input across view modes.
- Complexity: S
- Dependencies: src/lib/runtime-kernel/foundset-store.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

### 12. IMP-BM-006 — Saved found sets lifecycle parity hardening (Now)
- Theme: Design Mode UX
- Description (FileMaker terms): Users can persist found-set snapshots and reopen with graceful missing-record handling. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need saved found sets lifecycle so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Users can persist found-set snapshots and reopen with graceful missing-record handling.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/server/saved-search-storage.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Saved found set open should skip missing ids and report reconciliation summary.
- Complexity: S
- Dependencies: src/server/saved-search-storage.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

### 13. IMP-BM-007 — Implicit save on field exit parity hardening (Now)
- Theme: Design Mode UX
- Description (FileMaker terms): Leaving a field commits changes when allowed, without forcing explicit save each time. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need implicit save on field exit so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Leaving a field commits changes when allowed, without forcing explicit save each time.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in app/api/layouts/[id]/route.ts, src/lib/edit-session/index.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Blur save test with record navigation and value persistence checks.
- Complexity: S
- Dependencies: app/api/layouts/[id]/route.ts, src/lib/edit-session/index.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

### 14. IMP-BM-008 — Commit/Revert edit session semantics parity hardening (Now)
- Theme: Design Mode UX
- Description (FileMaker terms): Dirty edits can be committed or reverted with prompts on navigation changes. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need commit/revert edit session semantics so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Dirty edits can be committed or reverted with prompts on navigation changes.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/edit-session/index.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Dirty prompt tests and per-record revert behavior validations.
- Complexity: S
- Dependencies: src/lib/edit-session/index.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

### 15. IMP-BM-009 — Field validation and required behavior parity hardening (Now)
- Theme: Design Mode UX
- Description (FileMaker terms): Validation rules block invalid commits with field-level guidance. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need field validation and required behavior so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Validation rules block invalid commits with field-level guidance.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/field-engine.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Validation failure tests for required/type/range/calc rules.
- Complexity: S
- Dependencies: src/lib/field-engine.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

### 16. IMP-BM-010 — Auto-enter on create/modify behavior parity hardening (Now)
- Theme: Design Mode UX
- Description (FileMaker terms): Auto-enter options apply timestamps, account names, serials, and calc defaults at proper times. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need auto-enter on create/modify behavior so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Auto-enter options apply timestamps, account names, serials, and calc defaults at proper times.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/field-engine.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Create/update tests verifying auto-enter field values.
- Complexity: S
- Dependencies: src/lib/field-engine.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

### 20. IMP-BM-017 — Status area parity actions parity hardening (Now)
- Theme: Design Mode UX
- Description (FileMaker terms): Status area exposes key record/find/sort/view actions relevant to active mode. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need status area parity actions so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Status area exposes key record/find/sort/view actions relevant to active mode.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in docs/status-menubar-parity.md, then close parity gaps with deterministic behavior tests.
- Test Strategy: Mode-specific status toolbar action tests with capability gating.
- Complexity: S
- Dependencies: docs/status-menubar-parity.md
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

### 21. IMP-BM-018 — Menubar parity and shortcut execution parity hardening (Next)
- Theme: Design Mode UX
- Description (FileMaker terms): Menubar displays expected command groups and keyboard shortcuts execute supported commands. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need menubar parity and shortcut execution so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Menubar displays expected command groups and keyboard shortcuts execute supported commands.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in app/api/workspaces/[workspaceId]/developer-tools/route.ts, app/globals.css, then close parity gaps with deterministic behavior tests.
- Test Strategy: Menu command and shortcut dispatch tests by mode and role.
- Complexity: S
- Dependencies: app/api/workspaces/[workspaceId]/developer-tools/route.ts, app/globals.css
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

### 22. IMP-BM-019 — Window/context switching parity hardening (Next)
- Theme: Design Mode UX
- Description (FileMaker terms): Users can switch among workspaces/files/windows with stable context and no stale entries. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need window/context switching so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Users can switch among workspaces/files/windows with stable context and no stale entries.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/server/workspace-context.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Window menu list hygiene tests and workspace switch route tests.
- Complexity: S
- Dependencies: src/server/workspace-context.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

### 23. IMP-BM-020 — Error banner usability and guidance parity hardening (Next)
- Theme: Design Mode UX
- Description (FileMaker terms): Runtime failures show actionable guidance while preserving debug details for developers. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need error banner usability and guidance so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Runtime failures show actionable guidance while preserving debug details for developers.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in components/app-layer-error-banner.tsx, then close parity gaps with deterministic behavior tests.
- Test Strategy: Error rendering tests for known Data API failures and guidance mapping.
- Complexity: S
- Dependencies: components/app-layer-error-banner.tsx
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

### 31. IMP-LM-001 — Object selection and multi-select marquee parity hardening (Next)
- Theme: Design Mode UX
- Description (FileMaker terms): Layout Mode supports precise click, shift-click, and marquee selection with deterministic selection sets. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need object selection and multi-select marquee so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Layout Mode supports precise click, shift-click, and marquee selection with deterministic selection sets.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in app/globals.css, src/lib/layout-arrange.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Run pointer interaction tests for click, shift-click, marquee-add, marquee-remove across grouped and portal objects.
- Complexity: S
- Dependencies: app/globals.css, src/lib/layout-arrange.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

### 32. IMP-LM-002 — Group and ungroup object lifecycle parity hardening (Next)
- Theme: Design Mode UX
- Description (FileMaker terms): Grouped objects move and resize as a unit while preserving child relative geometry. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need group and ungroup object lifecycle so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Grouped objects move and resize as a unit while preserving child relative geometry.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/layout-model.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Group/un-group roundtrip tests must preserve child bounds and z-order.
- Complexity: S
- Dependencies: src/lib/layout-model.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

### 33. IMP-LM-003 — Bring forward/backward and front/back parity hardening (Next)
- Theme: Design Mode UX
- Description (FileMaker terms): Arrange commands deterministically change object stacking order. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need bring forward/backward and front/back so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Arrange commands deterministically change object stacking order.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/layout-arrange.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Z-order point-hit tests across overlapping object fixtures.
- Complexity: S
- Dependencies: src/lib/layout-arrange.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

### 34. IMP-LM-004 — Align/distribute for multi-object selections parity hardening (Next)
- Theme: Design Mode UX
- Description (FileMaker terms): Align/distribute uses selected object boundary math similar to FileMaker. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need align/distribute for multi-object selections so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Align/distribute uses selected object boundary math similar to FileMaker.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in app/globals.css, src/lib/layout-arrange.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Unit tests for left/right/top/bottom/center align and distribute spacing on mixed selections.
- Complexity: S
- Dependencies: app/globals.css, src/lib/layout-arrange.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

### 35. IMP-LM-005 — Rulers and guides with snap behavior parity hardening (Next)
- Theme: Design Mode UX
- Description (FileMaker terms): Rulers and guides are visually aligned to canvas coordinates and snapping toggles. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need rulers and guides with snap behavior so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Rulers and guides are visually aligned to canvas coordinates and snapping toggles.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in app/globals.css, then close parity gaps with deterministic behavior tests.
- Test Strategy: Visual regressions at different zoom levels for ruler ticks and guide intersections.
- Complexity: S
- Dependencies: app/globals.css
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

### 36. IMP-LM-006 — Canvas lock and autosize anchor editing parity hardening (Next)
- Theme: Design Mode UX
- Description (FileMaker terms): Canvas can be locked in Layout Mode while autosize anchor metadata remains editable. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need canvas lock and autosize anchor editing so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Canvas can be locked in Layout Mode while autosize anchor metadata remains editable.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/layout-model.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Mutation commands should no-op when canvas locked; anchor props still persist.
- Complexity: S
- Dependencies: src/lib/layout-model.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

### 37. IMP-LM-008 — Field placement from schema browser parity hardening (Next)
- Theme: Design Mode UX
- Description (FileMaker terms): Dragging fields onto layout can create field+label patterns with consistent placement modes. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need field placement from schema browser so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Dragging fields onto layout can create field+label patterns with consistent placement modes.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in app/diagnostics/parity/page.tsx, app/globals.css, src/lib/layout-utils.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Drag field placement snapshot tests for side-by-side and stacked modes.
- Complexity: S
- Dependencies: app/diagnostics/parity/page.tsx, app/globals.css, src/lib/layout-utils.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

### 45. IMP-LM-018 — Create New Layout wizard with templates parity hardening (Next)
- Theme: Design Mode UX
- Description (FileMaker terms): New Layout flow offers template choices and generates reasonable starter layout structures. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need create new layout wizard with templates so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - New Layout flow offers template choices and generates reasonable starter layout structures.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in app/globals.css, src/server/layout-storage.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Template selection should produce expected parts and starter object sets.
- Complexity: S
- Dependencies: app/globals.css, src/server/layout-storage.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

### 46. IMP-LM-019 — Clipboard and duplicate object workflows parity hardening (Next)
- Theme: Design Mode UX
- Description (FileMaker terms): Copy/paste/duplicate operations preserve style/binding semantics and assign new ids. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need clipboard and duplicate object workflows so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Copy/paste/duplicate operations preserve style/binding semantics and assign new ids.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/layout-utils.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Duplicated objects must receive unique ids and retain props except identity.
- Complexity: S
- Dependencies: src/lib/layout-utils.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

### 47. IMP-LM-020 — Set Tab Order mode and validation parity hardening (Next)
- Theme: Design Mode UX
- Description (FileMaker terms): Tab order editing overlays numeric sequence and resolves to deterministic runtime order. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need set tab order mode and validation so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Tab order editing overlays numeric sequence and resolves to deterministic runtime order.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/tab-order.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Tab order assignment and runtime traversal tests for hidden/disabled/portal contexts.
- Complexity: S
- Dependencies: src/lib/tab-order.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

## Theme: Portals

### 2. IMP-LM-016 — Portal setup dialog parity parity hardening (Now)
- Theme: Portals
- Description (FileMaker terms): Portal setup supports rows, sorting, filtering, delete permission, and row state toggles. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need portal setup dialog parity so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Portal setup supports rows, sorting, filtering, delete permission, and row state toggles.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/portal-utils.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Portal setup changes should alter browse-mode portal rendering and behavior.
- Complexity: S
- Dependencies: src/lib/portal-utils.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=5, composite=4.15

### 3. IMP-LM-017 — Portal template row editing in layout mode parity hardening (Now)
- Theme: Portals
- Description (FileMaker terms): Related fields are positioned in portal template row and row separator is visible. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need portal template row editing in layout mode so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Related fields are positioned in portal template row and row separator is visible.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in app/globals.css, then close parity gaps with deterministic behavior tests.
- Test Strategy: Visual regression for portal layout mode with only native separator/overlay elements.
- Complexity: S
- Dependencies: app/globals.css
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=5, composite=4.15

### 24. IMP-DR-006 — Portal row rendering as template controls parity hardening (Next)
- Theme: Portals
- Description (FileMaker terms): Portal rows render placed field objects and preserve control styles. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need portal row rendering as template controls so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Portal rows render placed field objects and preserve control styles.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/portal-runtime.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Portal render tests ensuring no fallback grid overlays when template children exist.
- Complexity: S
- Dependencies: src/lib/portal-runtime.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=5, composite=3.85

### 25. IMP-DR-007 — Portal active row and delete rules parity hardening (Next)
- Theme: Portals
- Description (FileMaker terms): Active row state and row delete actions obey portal setup and privileges. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need portal active row and delete rules so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Active row state and row delete actions obey portal setup and privileges.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in docs/filemaker-regression-matrix.md, docs/phase-3-plan.md, docs/phase-4-plan.md, then close parity gaps with deterministic behavior tests.
- Test Strategy: Portal active-row selection and delete action tests with allow-delete toggles.
- Complexity: S
- Dependencies: docs/filemaker-regression-matrix.md, docs/phase-3-plan.md, docs/phase-4-plan.md, docs/portals.md
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=5, composite=3.85

### 26. IMP-DR-009 — Portal row write target resolution parity hardening (Next)
- Theme: Portals
- Description (FileMaker terms): Portal field writes resolve to correct related record id/mod id across parent navigation. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need portal row write target resolution so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Portal field writes resolve to correct related record id/mod id across parent navigation.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in app/api/fm/container/upload/route.ts, src/lib/portal-runtime.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Portal save regression tests across multiple parent records.
- Complexity: S
- Dependencies: app/api/fm/container/upload/route.ts, src/lib/portal-runtime.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=5, composite=3.85

### 27. IMP-DR-010 — Portal alternate/active row visual states parity hardening (Next)
- Theme: Portals
- Description (FileMaker terms): Alternate row shading only appears when configured; active row state is explicit. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need portal alternate/active row visual states so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Alternate row shading only appears when configured; active row state is explicit.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/portal-runtime.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Row visual state tests for alternate and active flags combinations.
- Complexity: S
- Dependencies: src/lib/portal-runtime.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=5, composite=3.85

### 54. IMP-DR-008 — Portal placeholder row create behavior parity hardening (Later)
- Theme: Portals
- Description (FileMaker terms): When relationship allows creation, bottom portal placeholder row can create related records. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need portal placeholder row create behavior so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - When relationship allows creation, bottom portal placeholder row can create related records.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/portal-utils.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Portal placeholder row create tests with allow-create true/false fixtures.
- Complexity: S
- Dependencies: src/lib/portal-utils.ts
- Scoring: impact=4, parity=3, complexity=2, risk=3, leverage=5, composite=3.75

## Theme: Scripting & Events

### 55. IMP-SC-001 — Layout enter/exit triggers parity hardening (Later)
- Theme: Scripting & Events
- Description (FileMaker terms): OnLayoutEnter/OnLayoutExit trigger hooks fire in deterministic order. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need layout enter/exit triggers so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - OnLayoutEnter/OnLayoutExit trigger hooks fire in deterministic order.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/triggers/index.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Trigger sequencing tests across layout switch scenarios.
- Complexity: S
- Dependencies: src/lib/triggers/index.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=4, composite=3.7

### 56. IMP-SC-002 — Mode enter/exit triggers parity hardening (Later)
- Theme: Scripting & Events
- Description (FileMaker terms): OnModeEnter/OnModeExit fire when switching browse/find/preview modes. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need mode enter/exit triggers so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - OnModeEnter/OnModeExit fire when switching browse/find/preview modes.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in app/api/admin/config/route.ts, app/api/auth/me/route.ts, app/api/fm/container/route.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Mode switch trigger tests with expected history order.
- Complexity: S
- Dependencies: app/api/admin/config/route.ts, app/api/auth/me/route.ts, app/api/fm/container/route.ts, app/api/fm/find/route.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=4, composite=3.7

### 57. IMP-SC-003 — Object enter/exit/modify triggers parity hardening (Later)
- Theme: Scripting & Events
- Description (FileMaker terms): Field focus and edit lifecycle triggers fire with predictable debounce semantics. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need object enter/exit/modify triggers so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Field focus and edit lifecycle triggers fire with predictable debounce semantics.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in docs/script-triggers.md, scripts/generate-audit-artifacts.mjs, src/lib/trigger-policy.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Input typing tests with OnObjectModify count and OnObjectExit commit interactions.
- Complexity: S
- Dependencies: docs/script-triggers.md, scripts/generate-audit-artifacts.mjs, src/lib/trigger-policy.ts, src/lib/triggers/index.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=4, composite=3.7

### 58. IMP-SC-004 — Record commit request veto parity hardening (Later)
- Theme: Scripting & Events
- Description (FileMaker terms): OnRecordCommitRequest can cancel commit before persistence. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need record commit request veto so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - OnRecordCommitRequest can cancel commit before persistence.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/trigger-policy.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Commit request policy tests for veto and allow paths.
- Complexity: S
- Dependencies: src/lib/trigger-policy.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=4, composite=3.7

### 80. IMP-SC-005 — Script call stack and local/global variable scopes parity hardening (Later)
- Theme: Scripting & Events
- Description (FileMaker terms): Nested Perform Script calls preserve local $ vars per frame and shared $$ globals. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need script call stack and local/global variable scopes so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Nested Perform Script calls preserve local $ vars per frame and shared $$ globals.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/runtime-kernel/script-engine.ts, src/lib/runtime-kernel/variable-store.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Nested script tests verifying scope isolation and return semantics.
- Complexity: S
- Dependencies: src/lib/runtime-kernel/script-engine.ts, src/lib/runtime-kernel/variable-store.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

### 81. IMP-SC-006 — Core script step subset execution parity hardening (Later)
- Theme: Scripting & Events
- Description (FileMaker terms): Common script steps (go to layout, set field, commit, find, loop) execute deterministically. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need core script step subset execution so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Common script steps (go to layout, set field, commit, find, loop) execute deterministically.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/runtime-kernel/script-engine-advanced.test.mts, src/lib/runtime-kernel/script-engine.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Script engine fixture tests for common step sequences and control flow.
- Complexity: S
- Dependencies: src/lib/runtime-kernel/script-engine-advanced.test.mts, src/lib/runtime-kernel/script-engine.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

### 82. IMP-SC-007 — Error capture and LastError/LastMessage semantics parity hardening (Later)
- Theme: Scripting & Events
- Description (FileMaker terms): Set Error Capture controls halt/continue behavior and updates last error/message state. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need error capture and lasterror/lastmessage semantics so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Set Error Capture controls halt/continue behavior and updates last error/message state.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/runtime-kernel/script-engine-advanced.test.mts, src/lib/runtime-kernel/script-engine.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Error capture tests with failing actions and nested scripts.
- Complexity: S
- Dependencies: src/lib/runtime-kernel/script-engine-advanced.test.mts, src/lib/runtime-kernel/script-engine.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

### 83. IMP-SC-008 — Transaction-aware script execution parity hardening (Later)
- Theme: Scripting & Events
- Description (FileMaker terms): Script-level transaction begin/commit/revert semantics stage and apply operations predictably. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need transaction-aware script execution so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Script-level transaction begin/commit/revert semantics stage and apply operations predictably.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/runtime-kernel/script-engine.ts, src/lib/runtime-kernel/transaction-manager.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Transaction manager tests for partial failure rollback behavior.
- Complexity: S
- Dependencies: src/lib/runtime-kernel/script-engine.ts, src/lib/runtime-kernel/transaction-manager.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

### 84. IMP-SC-009 — Script-on-server bridge fallback parity hardening (Later)
- Theme: Scripting & Events
- Description (FileMaker terms): Unsupported local steps can bridge to server script execution with result propagation. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need script-on-server bridge fallback so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Unsupported local steps can bridge to server script execution with result propagation.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in app/api/fm/capabilities/route.ts, app/api/fm/scripts/route.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Script execution route tests for runtime fallback to /api/fm/scripts.
- Complexity: S
- Dependencies: app/api/fm/capabilities/route.ts, app/api/fm/scripts/route.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

### 85. IMP-SC-012 — Menu and button action -> script routing parity hardening (Later)
- Theme: Scripting & Events
- Description (FileMaker terms): UI actions route to configured scripts with parameters and context. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need menu and button action -> script routing so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - UI actions route to configured scripts with parameters and context.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/app-layer-menu.test.mts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Action dispatch tests for button/menu commands with parameter passing.
- Complexity: S
- Dependencies: src/lib/app-layer-menu.test.mts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

### 86. IMP-SC-013 — Trigger history diagnostics parity hardening (Later)
- Theme: Scripting & Events
- Description (FileMaker terms): Developers can see trigger firing order and outcomes in debug tools. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need trigger history diagnostics so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Developers can see trigger firing order and outcomes in debug tools.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in docs/find-mode.md, docs/fmcalc-lite.md, docs/foundset.md, then close parity gaps with deterministic behavior tests.
- Test Strategy: Debug snapshot tests include ordered trigger history and outcomes.
- Complexity: S
- Dependencies: docs/find-mode.md, docs/fmcalc-lite.md, docs/foundset.md, docs/layout-fidelity.md
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

### 87. IMP-SC-014 — Plugin-registered script step execution parity hardening (Later)
- Theme: Scripting & Events
- Description (FileMaker terms): Plugin SDK can register custom script steps with validation and isolated failures. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need plugin-registered script step execution so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Plugin SDK can register custom script steps with validation and isolated failures.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/plugins/manager.ts, src/plugins/plugin-sdk.test.mts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Plugin SDK tests for custom step registration and execution isolation.
- Complexity: S
- Dependencies: src/plugins/manager.ts, src/plugins/plugin-sdk.test.mts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

### 88. IMP-SC-015 — Script context stack alignment with windows parity hardening (Later)
- Theme: Scripting & Events
- Description (FileMaker terms): Script context resolves active window/layout/record correctly in multi-window sessions. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need script context stack alignment with windows so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Script context resolves active window/layout/record correctly in multi-window sessions.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/runtime-kernel/context-stack.ts, src/lib/runtime-kernel/kernel.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Kernel tests for script context in focused and card windows.
- Complexity: S
- Dependencies: src/lib/runtime-kernel/context-stack.ts, src/lib/runtime-kernel/kernel.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

### 93. IMP-SC-010 — Script debugger stepping parity hardening (Later)
- Theme: Scripting & Events
- Description (FileMaker terms): Debugger supports stepping and call-stack inspection in dev workflows. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need script debugger stepping so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Debugger supports stepping and call-stack inspection in dev workflows.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in docs/script-engine-advanced.md, then close parity gaps with deterministic behavior tests.
- Test Strategy: Debug-step tests confirm deterministic advancement and state snapshots.
- Complexity: S
- Dependencies: docs/script-engine-advanced.md
- Scoring: impact=4, parity=3, complexity=2, risk=3, leverage=3, composite=3.45

### 94. IMP-SC-011 — Data Viewer current/watch panels parity hardening (Later)
- Theme: Scripting & Events
- Description (FileMaker terms): Data Viewer displays current values and watch expressions in runtime context. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need data viewer current/watch panels so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Data Viewer displays current values and watch expressions in runtime context.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in app/globals.css, docs/app-layer-parity-matrix.md, docs/script-triggers.md, then close parity gaps with deterministic behavior tests.
- Test Strategy: Data viewer tests for expression evaluation against current context.
- Complexity: S
- Dependencies: app/globals.css, docs/app-layer-parity-matrix.md, docs/script-triggers.md
- Scoring: impact=4, parity=3, complexity=2, risk=3, leverage=3, composite=3.45

## Theme: Schema/DDR tooling

### 28. IMP-DR-013 — DDR import workspace and layout normalization parity hardening (Next)
- Theme: Schema/DDR tooling
- Description (FileMaker terms): DDR import creates normalized workspace/layout metadata ready for rendering and editing. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need ddr import workspace and layout normalization so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - DDR import creates normalized workspace/layout metadata ready for rendering and editing.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in app/api/workspaces/import/route.ts, scripts/import-ddr-layouts.mjs, then close parity gaps with deterministic behavior tests.
- Test Strategy: Import route tests with summary and direct DDR uploads, asserting workspace/layout artifacts.
- Complexity: S
- Dependencies: app/api/workspaces/import/route.ts, scripts/import-ddr-layouts.mjs
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=5, composite=3.85

### 29. IMP-DR-014 — Schema snapshot and diff tooling parity hardening (Next)
- Theme: Schema/DDR tooling
- Description (FileMaker terms): Developers can snapshot, diff, and assess schema changes across versions/files. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need schema snapshot and diff tooling so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Developers can snapshot, diff, and assess schema changes across versions/files.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in components/developer-tools-panel.tsx, src/lib/schemaDiff/diff.ts, src/lib/schemaDiff/index.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Dev tools tests for snapshot creation and diff result determinism.
- Complexity: S
- Dependencies: components/developer-tools-panel.tsx, src/lib/schemaDiff/diff.ts, src/lib/schemaDiff/index.ts, src/lib/schemaDiff/types.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=5, composite=3.85

### 30. IMP-DR-015 — Relationship graph visualization parity hardening (Next)
- Theme: Schema/DDR tooling
- Description (FileMaker terms): TO relationships can be explored visually, including cross-file edges. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need relationship graph visualization so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - TO relationships can be explored visually, including cross-file edges.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in components/developer-tools-panel.tsx, src/lib/relationshipGraph/index.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Graph builder tests and developer tools UI filter/search interactions.
- Complexity: S
- Dependencies: components/developer-tools-panel.tsx, src/lib/relationshipGraph/index.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=5, composite=3.85

## Theme: Developer Experience

### 66. IMP-DX-001 — Developer tools hub parity parity hardening (Later)
- Theme: Developer Experience
- Description (FileMaker terms): Developers can access schema snapshots, diffs, impacts, and migrations in one place. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need developer tools hub parity so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Developers can access schema snapshots, diffs, impacts, and migrations in one place.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in app/api/workspaces/[workspaceId]/developer-tools/route.ts, components/developer-tools-panel.tsx, then close parity gaps with deterministic behavior tests.
- Test Strategy: Dev tools API and panel tests for snapshot->diff->impact workflows.
- Complexity: S
- Dependencies: app/api/workspaces/[workspaceId]/developer-tools/route.ts, components/developer-tools-panel.tsx
- Scoring: impact=3, parity=3, complexity=2, risk=2, leverage=5, composite=3.55

### 67. IMP-DX-002 — Migration plan generation and apply parity hardening (Later)
- Theme: Developer Experience
- Description (FileMaker terms): Schema diffs can become ordered migration plans with safety metadata. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need migration plan generation and apply so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Schema diffs can become ordered migration plans with safety metadata.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/migrations/apply.ts, src/lib/migrations/generate.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Migration generate/apply unit tests with reversible and destructive flags.
- Complexity: S
- Dependencies: src/lib/migrations/apply.ts, src/lib/migrations/generate.ts
- Scoring: impact=3, parity=3, complexity=2, risk=2, leverage=5, composite=3.55

### 68. IMP-DX-003 — Impact analysis across layouts/scripts/value lists parity hardening (Later)
- Theme: Developer Experience
- Description (FileMaker terms): Change impact reports identify broken references and affected artifacts. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need impact analysis across layouts/scripts/value lists so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Change impact reports identify broken references and affected artifacts.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/dev-tools.test.mts, src/lib/impactAnalysis/index.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Impact analysis tests for deleted field references.
- Complexity: S
- Dependencies: src/lib/dev-tools.test.mts, src/lib/impactAnalysis/index.ts
- Scoring: impact=3, parity=3, complexity=2, risk=2, leverage=5, composite=3.55

### 69. IMP-DX-004 — Schema snapshot determinism parity hardening (Later)
- Theme: Developer Experience
- Description (FileMaker terms): Snapshots are stable and comparable across runs. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need schema snapshot determinism so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Snapshots are stable and comparable across runs.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/dev-tools.test.mts, src/lib/schemaSnapshot/normalize.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Snapshot normalization tests with stable ordering assertions.
- Complexity: S
- Dependencies: src/lib/dev-tools.test.mts, src/lib/schemaSnapshot/normalize.ts
- Scoring: impact=3, parity=3, complexity=2, risk=2, leverage=5, composite=3.55

### 95. IMP-DX-005 — Manage menu capability gating parity hardening (Later)
- Theme: Developer Experience
- Description (FileMaker terms): Manage/app-layer items are implemented, partial, or disabled with rationale and docs links. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need manage menu capability gating so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Manage/app-layer items are implemented, partial, or disabled with rationale and docs links.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/config/appLayerCapabilities.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: App-layer capability tests for enabled/disabled behavior and rationale modal.
- Complexity: S
- Dependencies: src/config/appLayerCapabilities.ts
- Scoring: impact=3, parity=3, complexity=2, risk=2, leverage=3, composite=3.25

### 96. IMP-DX-006 — Manager dialogs workspace/file context parity hardening (Later)
- Theme: Developer Experience
- Description (FileMaker terms): Manager screens include context selectors for multi-file workspaces. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need manager dialogs workspace/file context so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Manager screens include context selectors for multi-file workspaces.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/server/app-layer-storage.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Manager screen tests for file selector state changes.
- Complexity: S
- Dependencies: src/server/app-layer-storage.ts
- Scoring: impact=3, parity=3, complexity=2, risk=2, leverage=3, composite=3.25

### 97. IMP-DX-007 — Unsaved changes protection in app-layer dialogs parity hardening (Later)
- Theme: Developer Experience
- Description (FileMaker terms): Closing dirty dialogs prompts user before discarding changes. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need unsaved changes protection in app-layer dialogs so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Closing dirty dialogs prompts user before discarding changes.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in app/api/workspaces/[workspaceId]/governance/route.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Dialog close interception tests with dirty state.
- Complexity: S
- Dependencies: app/api/workspaces/[workspaceId]/governance/route.ts
- Scoring: impact=3, parity=3, complexity=2, risk=2, leverage=3, composite=3.25

### 98. IMP-DX-008 — UI regression suite for high-risk parity flows parity hardening (Later)
- Theme: Developer Experience
- Description (FileMaker terms): Key UI flows are covered by regression tests to prevent repeated break/fix cycles. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need ui regression suite for high-risk parity flows so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Key UI flows are covered by regression tests to prevent repeated break/fix cycles.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in package.json, src/lib/menu-action-coverage.test.mts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Run test:ui-regression with portal + mode-switch + menu-action fixtures.
- Complexity: S
- Dependencies: package.json, src/lib/menu-action-coverage.test.mts
- Scoring: impact=3, parity=3, complexity=2, risk=2, leverage=3, composite=3.25

### 99. IMP-DX-009 — Layout fidelity harness and baseline update flow parity hardening (Later)
- Theme: Developer Experience
- Description (FileMaker terms): Visual fidelity regressions are detected with screenshot baselines and metric reports. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need layout fidelity harness and baseline update flow so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Visual fidelity regressions are detected with screenshot baselines and metric reports.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in docs/layout-fidelity-fixtures.json, scripts/layout-fidelity.mts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Run test:layout-fidelity and baseline update scripts with fixture manifest.
- Complexity: S
- Dependencies: docs/layout-fidelity-fixtures.json, scripts/layout-fidelity.mts
- Scoring: impact=3, parity=3, complexity=2, risk=2, leverage=3, composite=3.25

### 100. IMP-DX-010 — Parity checklist generation in CI parity hardening (Later)
- Theme: Developer Experience
- Description (FileMaker terms): CI outputs parity status summaries for key domains before release. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need parity checklist generation in ci so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - CI outputs parity status summaries for key domains before release.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in .github/workflows/ci.yml, docs/runtime-gap-report.md, then close parity gaps with deterministic behavior tests.
- Test Strategy: CI workflow test to assert parity checklist files generated and non-empty.
- Complexity: S
- Dependencies: .github/workflows/ci.yml, docs/runtime-gap-report.md
- Scoring: impact=3, parity=3, complexity=2, risk=3, leverage=3, composite=3.15

## Theme: Performance

### 70. IMP-PF-001 — Found set paging for large datasets parity hardening (Later)
- Theme: Performance
- Description (FileMaker terms): Large found sets avoid full in-memory ids and support page-based navigation. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need found set paging for large datasets so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Large found sets avoid full in-memory ids and support page-based navigation.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in scripts/bench-perf.mts, src/lib/runtime-kernel/foundset-store.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Found set paging benchmarks with synthetic 100k scenarios.
- Complexity: S
- Dependencies: scripts/bench-perf.mts, src/lib/runtime-kernel/foundset-store.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

### 71. IMP-PF-002 — List/table virtualization parity hardening (Later)
- Theme: Performance
- Description (FileMaker terms): List and table rendering use virtualization for large record sets. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need list/table virtualization so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - List and table rendering use virtualization for large record sets.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/performance/virtual-window.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Virtual window tests for visible range correctness.
- Complexity: S
- Dependencies: src/lib/performance/virtual-window.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

### 72. IMP-PF-003 — Portal virtualization parity hardening (Later)
- Theme: Performance
- Description (FileMaker terms): Portal rows are incrementally rendered/paged for large related sets. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need portal virtualization so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Portal rows are incrementally rendered/paged for large related sets.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/performance/virtual-window.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Portal benchmark tests with high row counts and edit interactions.
- Complexity: S
- Dependencies: src/lib/performance/virtual-window.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

### 73. IMP-PF-004 — Request caching and in-flight dedupe parity hardening (Later)
- Theme: Performance
- Description (FileMaker terms): Repeated identical read requests share cache/in-flight promises. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need request caching and in-flight dedupe so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Repeated identical read requests share cache/in-flight promises.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/server/filemaker-client.ts, src/server/performance/request-cache.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Request cache tests validating hits/misses and coalescing.
- Complexity: S
- Dependencies: src/server/filemaker-client.ts, src/server/performance/request-cache.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

### 74. IMP-PF-005 — Retry/backoff and circuit-breaker behavior parity hardening (Later)
- Theme: Performance
- Description (FileMaker terms): Transient Data API failures are retried with bounded backoff and circuit state tracking. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need retry/backoff and circuit-breaker behavior so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Transient Data API failures are retried with bounded backoff and circuit state tracking.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/server/filemaker-client.ts, src/server/resilience/circuit-breaker.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Circuit breaker and retry unit tests with transient error simulation.
- Complexity: S
- Dependencies: src/server/filemaker-client.ts, src/server/resilience/circuit-breaker.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

### 75. IMP-PF-006 — FMCalc dependency-aware caching parity hardening (Later)
- Theme: Performance
- Description (FileMaker terms): Calc evaluations are bounded and re-evaluated only when dependencies change. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need fmcalc dependency-aware caching so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Calc evaluations are bounded and re-evaluated only when dependencies change.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/fmcalc/index.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Calc evaluation count tests after unrelated field edits.
- Complexity: S
- Dependencies: src/lib/fmcalc/index.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

### 76. IMP-PF-007 — Script execution overhead control parity hardening (Later)
- Theme: Performance
- Description (FileMaker terms): Script runtime avoids unnecessary context rebuilds and reports step timing. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need script execution overhead control so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Script runtime avoids unnecessary context rebuilds and reports step timing.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/runtime-kernel/script-engine.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Advanced script tests and perf metrics validation.
- Complexity: S
- Dependencies: src/lib/runtime-kernel/script-engine.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

### 77. IMP-PF-008 — Profiler and trace-id diagnostics parity hardening (Later)
- Theme: Performance
- Description (FileMaker terms): Developers can correlate UI actions with API and runtime metrics. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need profiler and trace-id diagnostics so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Developers can correlate UI actions with API and runtime metrics.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in scripts/bench-perf.mts, src/server/observability.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Profiler output schema tests and trace-id propagation checks.
- Complexity: S
- Dependencies: scripts/bench-perf.mts, src/server/observability.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

### 78. IMP-PF-009 — Deterministic benchmark harness parity hardening (Later)
- Theme: Performance
- Description (FileMaker terms): Performance benchmarks are repeatable and can gate CI regressions. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need deterministic benchmark harness so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Performance benchmarks are repeatable and can gate CI regressions.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in docs/performance-benchmarks.md, scripts/bench-perf.mts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Benchmark script deterministic output checks.
- Complexity: S
- Dependencies: docs/performance-benchmarks.md, scripts/bench-perf.mts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

### 79. IMP-PF-010 — Bounded cache and trace memory usage parity hardening (Later)
- Theme: Performance
- Description (FileMaker terms): Long sessions should avoid unbounded growth in cache and diagnostics buffers. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need bounded cache and trace memory usage so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Long sessions should avoid unbounded growth in cache and diagnostics buffers.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/server/performance/request-cache.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Stress tests with cache eviction assertions.
- Complexity: S
- Dependencies: src/server/performance/request-cache.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

## Theme: Security/Compliance

### 48. IMP-SE-001 — Session auth middleware and role context parity hardening (Next)
- Theme: Security/Compliance
- Description (FileMaker terms): API requests derive authenticated user/role context before executing privileged actions. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need session auth middleware and role context so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - API requests derive authenticated user/role context before executing privileged actions.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in middleware.ts, src/server/security/request-context.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Request guard tests for authenticated and unauthenticated API calls.
- Complexity: S
- Dependencies: middleware.ts, src/server/security/request-context.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=5, composite=3.85

### 49. IMP-SE-002 — JWT and trusted-header auth modes parity hardening (Next)
- Theme: Security/Compliance
- Description (FileMaker terms): Deployment can use trusted-header SSO or JWT modes without client secrets. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need jwt and trusted-header auth modes so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Deployment can use trusted-header SSO or JWT modes without client secrets.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/server/security/jwt.ts, src/server/security/middleware-auth.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Security hardening tests for JWT validation and trusted-header mode.
- Complexity: S
- Dependencies: src/server/security/jwt.ts, src/server/security/middleware-auth.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=5, composite=3.85

### 50. IMP-SE-003 — CSRF protection on mutating routes parity hardening (Next)
- Theme: Security/Compliance
- Description (FileMaker terms): Mutating API calls require valid CSRF cookie/header pairs when enabled. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need csrf protection on mutating routes so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Mutating API calls require valid CSRF cookie/header pairs when enabled.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/server/security/csrf.ts, src/server/security/request-context.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: CSRF mismatch tests return 403 with guidance.
- Complexity: S
- Dependencies: src/server/security/csrf.ts, src/server/security/request-context.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=5, composite=3.85

### 51. IMP-SE-004 — Rate limiting and retry guidance parity hardening (Later)
- Theme: Security/Compliance
- Description (FileMaker terms): Request bursts are controlled and users receive retry guidance when throttled. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need rate limiting and retry guidance so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Request bursts are controlled and users receive retry guidance when throttled.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in middleware.ts, src/server/security/rate-limit.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Middleware rate-limit tests for 429 responses and retry-after headers.
- Complexity: S
- Dependencies: middleware.ts, src/server/security/rate-limit.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=5, composite=3.85

### 52. IMP-SE-005 — Route-level action authorization parity hardening (Later)
- Theme: Security/Compliance
- Description (FileMaker terms): Every API route validates role permission for requested action. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need route-level action authorization so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Every API route validates role permission for requested action.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/server/security/authorization.ts, src/server/security/request-context.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Authorization denial tests for restricted actions.
- Complexity: S
- Dependencies: src/server/security/authorization.ts, src/server/security/request-context.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=5, composite=3.85

### 53. IMP-SE-006 — Runtime capability gating (layout/field/portal) parity hardening (Later)
- Theme: Security/Compliance
- Description (FileMaker terms): UI actions respect role-based runtime permissions for view/edit/delete operations. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need runtime capability gating (layout/field/portal) so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - UI actions respect role-based runtime permissions for view/edit/delete operations.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/runtime-capabilities.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Runtime capability tests for read-only and hidden field scenarios.
- Complexity: S
- Dependencies: src/lib/runtime-capabilities.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=5, composite=3.85

### 89. IMP-SE-007 — Structured audit logging for critical actions parity hardening (Later)
- Theme: Security/Compliance
- Description (FileMaker terms): Login, CRUD, script, routing, and management actions emit audit events. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need structured audit logging for critical actions so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Login, CRUD, script, routing, and management actions emit audit events.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/server/audit-log.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Audit log tests for event append and query filtering.
- Complexity: S
- Dependencies: src/server/audit-log.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

### 90. IMP-SE-008 — Admin diagnostics and metrics endpoints parity hardening (Later)
- Theme: Security/Compliance
- Description (FileMaker terms): Admin users can inspect health, metrics, and active diagnostics safely. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need admin diagnostics and metrics endpoints so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Admin users can inspect health, metrics, and active diagnostics safely.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in app/api/admin/console/route.ts, src/server/admin-console.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Admin endpoint role checks and payload schema tests.
- Complexity: S
- Dependencies: app/api/admin/console/route.ts, src/server/admin-console.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

### 91. IMP-SE-009 — Container URL host validation parity hardening (Later)
- Theme: Security/Compliance
- Description (FileMaker terms): Container fetch route rejects external host URLs to avoid leakage and SSRF risk. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need container url host validation so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Container fetch route rejects external host URLs to avoid leakage and SSRF risk.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in app/api/fm/container/route.ts, src/server/filemaker-client.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Container route tests for host mismatch rejection.
- Complexity: S
- Dependencies: app/api/fm/container/route.ts, src/server/filemaker-client.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

### 92. IMP-SE-010 — RBAC enforcement for governance endpoints parity hardening (Later)
- Theme: Security/Compliance
- Description (FileMaker terms): Versioning, promote, rollback, and admin workflows are role-restricted. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need rbac enforcement for governance endpoints so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Versioning, promote, rollback, and admin workflows are role-restricted.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in app/api/workspaces/[workspaceId]/governance/route.ts, src/lib/governance-rbac.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Governance tests for admin/developer/runtime role access differences.
- Complexity: S
- Dependencies: app/api/workspaces/[workspaceId]/governance/route.ts, src/lib/governance-rbac.ts
- Scoring: impact=4, parity=3, complexity=2, risk=2, leverage=3, composite=3.55

## Theme: Product Polish

### 4. IMP-BM-003 — Multi-request find editing and omit logic parity hardening (Now)
- Theme: Product Polish
- Description (FileMaker terms): Find mode supports multiple requests, omit flags, and request navigation. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need multi-request find editing and omit logic so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Find mode supports multiple requests, omit flags, and request navigation.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/find-mode.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Test add/duplicate/delete request and omit behavior against deterministic dataset.
- Complexity: S
- Dependencies: src/lib/find-mode.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=4, composite=4

### 5. IMP-BM-004 — Constrain/Extend/Show All found set operations parity hardening (Now)
- Theme: Product Polish
- Description (FileMaker terms): Found set commands modify active found set with clear status and deterministic behavior. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need constrain/extend/show all found set operations so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Found set commands modify active found set with clear status and deterministic behavior.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/find-mode.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Integration tests for constrain and extend preserving index when possible.
- Complexity: S
- Dependencies: src/lib/find-mode.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=4, composite=4

### 6. IMP-BM-005 — Saved finds lifecycle parity hardening (Now)
- Theme: Product Polish
- Description (FileMaker terms): Users can save, run, modify, duplicate, and delete saved finds. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need saved finds lifecycle so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Users can save, run, modify, duplicate, and delete saved finds.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/server/saved-search-storage.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Save/find/re-run/modify tests with persistence validation.
- Complexity: S
- Dependencies: src/server/saved-search-storage.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=4, composite=4

### 7. IMP-BM-011 — List view rendering and selection parity parity hardening (Now)
- Theme: Product Polish
- Description (FileMaker terms): List view supports stable row selection, keyboard navigation, and optional inline edit. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need list view rendering and selection parity so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - List view supports stable row selection, keyboard navigation, and optional inline edit.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in app/api/admin/metrics/route.ts, src/lib/list-table-runtime.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: List row select + keyboard up/down tests with selection sync.
- Complexity: S
- Dependencies: app/api/admin/metrics/route.ts, src/lib/list-table-runtime.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=4, composite=4

### 8. IMP-BM-012 — Table view column persistence and sorting parity hardening (Now)
- Theme: Product Polish
- Description (FileMaker terms): Table columns support reorder/resize/hide and header sort behavior with persistence. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need table view column persistence and sorting so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Table columns support reorder/resize/hide and header sort behavior with persistence.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/server/view-config-storage.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Column config persistence and header sort toggle tests.
- Complexity: S
- Dependencies: src/server/view-config-storage.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=4, composite=4

### 9. IMP-BM-013 — Preview mode print-oriented rendering parity hardening (Now)
- Theme: Product Polish
- Description (FileMaker terms): Preview mode is read-only, shows print-like output, and supports record navigation. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need preview mode print-oriented rendering so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Preview mode is read-only, shows print-like output, and supports record navigation.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in docs/preview-mode.md, then close parity gaps with deterministic behavior tests.
- Test Strategy: Browse->Preview->Browse state-preservation tests and preview snapshot checks.
- Complexity: S
- Dependencies: docs/preview-mode.md
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=4, composite=4

### 17. IMP-BM-014 — Value list controls in browse and find parity hardening (Now)
- Theme: Product Polish
- Description (FileMaker terms): Value list controls present consistent stored/display values in browse and find criteria contexts. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need value list controls in browse and find so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Value list controls present consistent stored/display values in browse and find criteria contexts.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in app/api/workspaces/[workspaceId]/developer-tools/route.ts, app/api/workspaces/[workspaceId]/manage-value-lists/route.ts, src/lib/value-list-cache.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Dropdown/radio/checkbox tests for display/stored mapping and find criteria.
- Complexity: S
- Dependencies: app/api/workspaces/[workspaceId]/developer-tools/route.ts, app/api/workspaces/[workspaceId]/manage-value-lists/route.ts, src/lib/value-list-cache.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

### 18. IMP-BM-015 — Date control icon and calendar toggle parity parity hardening (Now)
- Theme: Product Polish
- Description (FileMaker terms): Date controls show calendar icon when enabled and allow date picking in portal and non-portal contexts. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need date control icon and calendar toggle parity so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Date controls show calendar icon when enabled and allow date picking in portal and non-portal contexts.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in app/globals.css, then close parity gaps with deterministic behavior tests.
- Test Strategy: Visual and interaction tests for include-icon flag across view contexts.
- Complexity: S
- Dependencies: app/globals.css
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

### 19. IMP-BM-016 — Container field context menu actions parity hardening (Now)
- Theme: Product Polish
- Description (FileMaker terms): Container fields expose insert/export/clipboard actions with permission-aware states. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- User Story: As a FileMaker developer, I need container field context menu actions so FMWeb IDE behaves like native FileMaker for this workflow.
- Acceptance Criteria:
  - Container fields expose insert/export/clipboard actions with permission-aware states.
  - Behavior is deterministic across repeated runs.
  - Regression tests cover success and failure paths.
- Suggested Technical Approach: Refine existing implementation in src/lib/container-runtime.ts, then close parity gaps with deterministic behavior tests.
- Test Strategy: Container menu action tests for insert/export with mock and filemaker sources.
- Complexity: S
- Dependencies: src/lib/container-runtime.ts
- Scoring: impact=5, parity=3, complexity=2, risk=2, leverage=3, composite=3.85

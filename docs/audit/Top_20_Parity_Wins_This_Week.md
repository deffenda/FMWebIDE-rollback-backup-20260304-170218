# Top 20 Parity Wins This Week

High-value parity wins selected by composite score, weighted for FileMaker developer impact and implementation leverage.

## 1. IMP-LM-007 — Part creation and part resizing parity hardening
- Why it matters to FileMaker devs: Header/body/footer and summary parts resize with expected object repositioning semantics. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- How to implement in FMWeb IDE: Refine existing implementation in src/lib/layout-model.ts, then close parity gaps with deterministic behavior tests.
- Test plan: Part resize tests verify object y-offset transforms for adjacent parts.
- Complexity: S
- Composite score: 4.15

## 2. IMP-LM-016 — Portal setup dialog parity parity hardening
- Why it matters to FileMaker devs: Portal setup supports rows, sorting, filtering, delete permission, and row state toggles. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- How to implement in FMWeb IDE: Refine existing implementation in src/lib/portal-utils.ts, then close parity gaps with deterministic behavior tests.
- Test plan: Portal setup changes should alter browse-mode portal rendering and behavior.
- Complexity: S
- Composite score: 4.15

## 3. IMP-LM-017 — Portal template row editing in layout mode parity hardening
- Why it matters to FileMaker devs: Related fields are positioned in portal template row and row separator is visible. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- How to implement in FMWeb IDE: Refine existing implementation in app/globals.css, then close parity gaps with deterministic behavior tests.
- Test plan: Visual regression for portal layout mode with only native separator/overlay elements.
- Complexity: S
- Composite score: 4.15

## 4. IMP-BM-003 — Multi-request find editing and omit logic parity hardening
- Why it matters to FileMaker devs: Find mode supports multiple requests, omit flags, and request navigation. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- How to implement in FMWeb IDE: Refine existing implementation in src/lib/find-mode.ts, then close parity gaps with deterministic behavior tests.
- Test plan: Test add/duplicate/delete request and omit behavior against deterministic dataset.
- Complexity: S
- Composite score: 4

## 5. IMP-BM-004 — Constrain/Extend/Show All found set operations parity hardening
- Why it matters to FileMaker devs: Found set commands modify active found set with clear status and deterministic behavior. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- How to implement in FMWeb IDE: Refine existing implementation in src/lib/find-mode.ts, then close parity gaps with deterministic behavior tests.
- Test plan: Integration tests for constrain and extend preserving index when possible.
- Complexity: S
- Composite score: 4

## 6. IMP-BM-005 — Saved finds lifecycle parity hardening
- Why it matters to FileMaker devs: Users can save, run, modify, duplicate, and delete saved finds. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- How to implement in FMWeb IDE: Refine existing implementation in src/server/saved-search-storage.ts, then close parity gaps with deterministic behavior tests.
- Test plan: Save/find/re-run/modify tests with persistence validation.
- Complexity: S
- Composite score: 4

## 7. IMP-BM-011 — List view rendering and selection parity parity hardening
- Why it matters to FileMaker devs: List view supports stable row selection, keyboard navigation, and optional inline edit. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- How to implement in FMWeb IDE: Refine existing implementation in app/api/admin/metrics/route.ts, src/lib/list-table-runtime.ts, then close parity gaps with deterministic behavior tests.
- Test plan: List row select + keyboard up/down tests with selection sync.
- Complexity: S
- Composite score: 4

## 8. IMP-BM-012 — Table view column persistence and sorting parity hardening
- Why it matters to FileMaker devs: Table columns support reorder/resize/hide and header sort behavior with persistence. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- How to implement in FMWeb IDE: Refine existing implementation in src/server/view-config-storage.ts, then close parity gaps with deterministic behavior tests.
- Test plan: Column config persistence and header sort toggle tests.
- Complexity: S
- Composite score: 4

## 9. IMP-BM-013 — Preview mode print-oriented rendering parity hardening
- Why it matters to FileMaker devs: Preview mode is read-only, shows print-like output, and supports record navigation. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- How to implement in FMWeb IDE: Refine existing implementation in docs/preview-mode.md, then close parity gaps with deterministic behavior tests.
- Test plan: Browse->Preview->Browse state-preservation tests and preview snapshot checks.
- Complexity: S
- Composite score: 4

## 10. IMP-BM-001 — Browse/Find/Preview mode switching parity hardening
- Why it matters to FileMaker devs: Users can switch modes reliably without losing context or causing render loops. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- How to implement in FMWeb IDE: Refine existing implementation in src/lib/browse-url-state.ts, then close parity gaps with deterministic behavior tests.
- Test plan: Stress test repeated mode switches while editing and filtering records.
- Complexity: S
- Composite score: 3.85

## 11. IMP-BM-002 — Record navigator parity parity hardening
- Why it matters to FileMaker devs: First/prev/next/last and record jump update current record and status area consistently. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- How to implement in FMWeb IDE: Refine existing implementation in src/lib/runtime-kernel/foundset-store.ts, then close parity gaps with deterministic behavior tests.
- Test plan: Integration tests for first/prev/next/last + jump input across view modes.
- Complexity: S
- Composite score: 3.85

## 12. IMP-BM-006 — Saved found sets lifecycle parity hardening
- Why it matters to FileMaker devs: Users can persist found-set snapshots and reopen with graceful missing-record handling. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- How to implement in FMWeb IDE: Refine existing implementation in src/server/saved-search-storage.ts, then close parity gaps with deterministic behavior tests.
- Test plan: Saved found set open should skip missing ids and report reconciliation summary.
- Complexity: S
- Composite score: 3.85

## 13. IMP-BM-007 — Implicit save on field exit parity hardening
- Why it matters to FileMaker devs: Leaving a field commits changes when allowed, without forcing explicit save each time. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- How to implement in FMWeb IDE: Refine existing implementation in app/api/layouts/[id]/route.ts, src/lib/edit-session/index.ts, then close parity gaps with deterministic behavior tests.
- Test plan: Blur save test with record navigation and value persistence checks.
- Complexity: S
- Composite score: 3.85

## 14. IMP-BM-008 — Commit/Revert edit session semantics parity hardening
- Why it matters to FileMaker devs: Dirty edits can be committed or reverted with prompts on navigation changes. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- How to implement in FMWeb IDE: Refine existing implementation in src/lib/edit-session/index.ts, then close parity gaps with deterministic behavior tests.
- Test plan: Dirty prompt tests and per-record revert behavior validations.
- Complexity: S
- Composite score: 3.85

## 15. IMP-BM-009 — Field validation and required behavior parity hardening
- Why it matters to FileMaker devs: Validation rules block invalid commits with field-level guidance. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- How to implement in FMWeb IDE: Refine existing implementation in src/lib/field-engine.ts, then close parity gaps with deterministic behavior tests.
- Test plan: Validation failure tests for required/type/range/calc rules.
- Complexity: S
- Composite score: 3.85

## 16. IMP-BM-010 — Auto-enter on create/modify behavior parity hardening
- Why it matters to FileMaker devs: Auto-enter options apply timestamps, account names, serials, and calc defaults at proper times. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- How to implement in FMWeb IDE: Refine existing implementation in src/lib/field-engine.ts, then close parity gaps with deterministic behavior tests.
- Test plan: Create/update tests verifying auto-enter field values.
- Complexity: S
- Composite score: 3.85

## 17. IMP-BM-014 — Value list controls in browse and find parity hardening
- Why it matters to FileMaker devs: Value list controls present consistent stored/display values in browse and find criteria contexts. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- How to implement in FMWeb IDE: Refine existing implementation in app/api/workspaces/[workspaceId]/developer-tools/route.ts, app/api/workspaces/[workspaceId]/manage-value-lists/route.ts, src/lib/value-list-cache.ts, then close parity gaps with deterministic behavior tests.
- Test plan: Dropdown/radio/checkbox tests for display/stored mapping and find criteria.
- Complexity: S
- Composite score: 3.85

## 18. IMP-BM-015 — Date control icon and calendar toggle parity parity hardening
- Why it matters to FileMaker devs: Date controls show calendar icon when enabled and allow date picking in portal and non-portal contexts. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- How to implement in FMWeb IDE: Refine existing implementation in app/globals.css, then close parity gaps with deterministic behavior tests.
- Test plan: Visual and interaction tests for include-icon flag across view contexts.
- Complexity: S
- Composite score: 3.85

## 19. IMP-BM-016 — Container field context menu actions parity hardening
- Why it matters to FileMaker devs: Container fields expose insert/export/clipboard actions with permission-aware states. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- How to implement in FMWeb IDE: Refine existing implementation in src/lib/container-runtime.ts, then close parity gaps with deterministic behavior tests.
- Test plan: Container menu action tests for insert/export with mock and filemaker sources.
- Complexity: S
- Composite score: 3.85

## 20. IMP-BM-017 — Status area parity actions parity hardening
- Why it matters to FileMaker devs: Status area exposes key record/find/sort/view actions relevant to active mode. This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.
- How to implement in FMWeb IDE: Refine existing implementation in docs/status-menubar-parity.md, then close parity gaps with deterministic behavior tests.
- Test plan: Mode-specific status toolbar action tests with capability gating.
- Complexity: S
- Composite score: 3.85

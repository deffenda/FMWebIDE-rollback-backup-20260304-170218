# Edge Case Playbook: FileMaker on Web (FMWeb IDE)

This playbook documents high-risk parity failures when translating FileMaker-native interaction semantics to web runtime behavior.

Legend:
- `Automated`: covered by `tests/ui/native-parity/native-parity.spec.mts`
- `Planned`: documented, not yet fully automated

## Rendering + Geometry
| ID | Symptom | Why it happens on web | Expected FileMaker behavior | Likely FMWeb root cause | Mitigation approach | Test strategy |
| --- | --- | --- | --- | --- | --- | --- |
| EC-001 | Text clips in labels at 100% zoom | Browser font metrics differ from FileMaker rasterization | Text stays readable with stable line wrapping | CSS line-height not mapped from style stack | Normalize font metrics in style resolver; clamp line-height | Planned: screenshot diff @ zoom 100/110/125 |
| EC-002 | Baseline drift between field and label | CSS inline box model differs by font | Label baselines align with controls | Missing baseline compensation per control type | Add control-type baseline offsets | Planned: bounding-box assertions |
| EC-003 | Bold/italic pushes field text outside bounds | Browser glyph width differs across platforms | Styled text remains inside object bounds | Width calc assumes regular font metrics | Measure with fallback canvas metrics and reserve padding | Planned: style matrix tests |
| EC-004 | Shape stroke overflows neighboring object | CSS border box sizing mismatch | Shape renders in exact object frame | Border included in object geometry unexpectedly | Use `box-sizing: border-box` and geometry clamps | Planned: golden snapshots |
| EC-005 | High-DPI zoom changes object hit targets | CSS transforms and pixel rounding differ per scale | Object hit testing remains stable at zoom changes | Transform math and pointer hit area mismatch | Scale-aware hit target projection | Planned: pointer regression tests |
| EC-006 | Z-order mismatch in overlapping controls | DOM order and z-index conflict | Arrange order always deterministic | Runtime z-index or reorder commands diverge | Enforce deterministic z-index write-back | Automated: menu/selection smoke + z-order checks |
| EC-007 | Portal header draws like data row | Grid fallback and template stack overlap | Portal header and rows are distinct | Portal renderer mixed table fallback path | Gate template row path strictly | Planned: portal visual snapshots |
| EC-008 | Preview print area not obvious | Browser print preview differs from FM preview | Print area boundaries visible in Preview mode | Missing print guide overlay toggles | Keep explicit print-guide overlay and page pills | Automated: preview toggle + print-area button |

## Input + Focus + Keyboard
| ID | Symptom | Why it happens on web | Expected FileMaker behavior | Likely FMWeb root cause | Mitigation approach | Test strategy |
| --- | --- | --- | --- | --- | --- | --- |
| EC-009 | Typing goes to wrong field after click | Focus reassigned by rerender | Clicked field receives input immediately | Controlled input remount on state change | Stable keys + deferred state commits | Automated: focus invariant |
| EC-010 | Tab order follows DOM not design | Browser default tab sequence | Tab order follows layout object order/tab order model | Missing tab order manager in some views | Route tab through runtime tab-order resolver | Automated: tab navigation test |
| EC-011 | Enter commits when multiline should add newline | Default form submit semantics | Multiline Enter inserts newline; Return rules configurable | Key handler not control-type aware | Add multiline-aware key map | Planned: multiline key tests |
| EC-012 | Escape cancels wrong scope | Browser/global handler race | Escape reverts current scope only | Escape listeners attached to multiple scopes | Scope-aware escape router | Planned: command-scope tests |
| EC-013 | IME composition prematurely commits | Composition events differ from keydown | Composition commits only when finalized | Save-on-blur/keydown ignores IME state | Track `compositionstart/end` for save guard | Planned: IME synthetic event test |
| EC-014 | Copy/paste drops expected value list text | Browser clipboard normalization | Clipboard roundtrips user-visible values | Stored/display mapping ignored during paste | Clipboard transform by control metadata | Planned: clipboard fixture tests |
| EC-015 | Date picker icon missing intermittently | CSS class toggles race with control type render | Calendar icon shown when option enabled | Control class computed from stale props | Resolve icon flag from final runtime control config | Automated: date control visibility test |
| EC-016 | Drag-select text starts object move in Layout mode | Pointer handlers compete with text selection | Text selection and object drag are mode-aware | Pointer handler missing target filtering | Ignore drag-start for editable/selection regions | Planned: drag interaction tests |

## Portals + Related Data
| ID | Symptom | Why it happens on web | Expected FileMaker behavior | Likely FMWeb root cause | Mitigation approach | Test strategy |
| --- | --- | --- | --- | --- | --- | --- |
| EC-017 | Portal edit disappears after refresh | Async reload races with staged edit map | Row value persists after save/reload | Related write target resolution mismatch | Resolve row by recordId/modId and merge server echo | Planned: portal save regression |
| EC-018 | Portal placeholder row never creates record | Placeholder render path not connected to create pipeline | Entering data in create row makes related record | Missing create-row commit bridge | Explicit create-row state machine | Planned: portal create-row tests |
| EC-019 | Alternate row shading always visible | CSS class always applied | Alternate row shown only when enabled in setup | Portal state flags ignored at render | Bind shading class to portal flag | Planned: portal shading toggle test |
| EC-020 | Active row styling lost on scroll | Virtualization recycles row DOM | Active row persists through virtual scroll | Active-row key stored by index not row id | Track active row by stable related record id | Planned: virtualized portal tests |
| EC-021 | Delete row targets wrong related record | Row identity drifts after sort/filter | Delete acts on selected row context | Selected row pointer stale | Resolve selection after every filter/sort mutation | Planned: portal delete tests |
| EC-022 | Portal dropdown/date controls degrade to plain text | Fallback renderer path used | Portal cells render actual field controls | Portal template control mapping incomplete | Reuse field control renderer in portal cell | Automated: portal focus + date/value list smoke |
| EC-023 | Portal edits fail after parent record change | Parent navigation invalidates related context | Cross-record portal edits route to correct related row | Cached related context reused incorrectly | Reset related context on parent record transition | Planned: parent-switch portal save tests |
| EC-024 | Portal row separators wrong in Layout mode | CSS mismatch between design/runtime overlay | Layout mode shows native-like row separator only | Design-time portal chrome leaking runtime grid | Separate layout-only portal chrome classes | Planned: design-surface visual diff |

## Concurrency + Caching
| ID | Symptom | Why it happens on web | Expected FileMaker behavior | Likely FMWeb root cause | Mitigation approach | Test strategy |
| --- | --- | --- | --- | --- | --- | --- |
| EC-025 | Record value reverts after delayed refresh | stale fetch response overwrites committed value | Last successful commit remains visible | Request race without version guard | Use modId/version-aware merge strategy | Planned: delayed response simulation |
| EC-026 | Rapid mode switches cause update-depth loops | React effects chained on unstable deps | Mode changes are stable and bounded | effect dependency churn in browse state | memoize deps + state guards | Automated: mode switch smoke |
| EC-027 | Duplicate request burst on toolbar spam click | No in-flight dedupe in some actions | Single logical action -> bounded network calls | Missing request coalescing | In-flight key dedupe + action throttle | Planned: network request-count assertions |
| EC-028 | Layout switch keeps wrong found set cache | Context key not updated fully | Found set follows current layout/TO context | cache key omits layout context | include layout + file + TO in keys | Planned: cross-layout cache tests |
| EC-029 | Offline blip leaves staged status forever | transient failures not surfaced clearly | Failure returns clear recoverable status | retry/circuit state not exposed to UI | add explicit pending/retry status messaging | Planned: network drop integration tests |

## Value Lists + Conditional Logic
| ID | Symptom | Why it happens on web | Expected FileMaker behavior | Likely FMWeb root cause | Mitigation approach | Test strategy |
| --- | --- | --- | --- | --- | --- | --- |
| EC-030 | Value list shows display value but stores wrong token | display/stored map not normalized | Correct stored value, expected display text | stale value-list metadata or wrong key | normalize by explicit display/stored schema | Automated: popup control smoke; planned mapping deep test |
| EC-031 | Dependent value list does not refresh after parent field change | missing dependency invalidation | Child list updates immediately | cache invalidation misses parent dependency | invalidate cache by dependency graph | Planned: dependent value-list tests |
| EC-032 | Conditional formatting lags one interaction | async render updates out of order | Rule updates in same interaction cycle | deferred calc not synchronized | recalc on dependency change before paint | Planned: calc dependency tests |
| EC-033 | Tooltip/hide calc errors break rendering | unhandled calc exceptions | Errors degrade gracefully, object still renders | missing calc error boundary in object path | central calc try/catch + debug warning | Planned: calc error safety tests |
| EC-034 | “Other…” value list option missing where expected | option filtering too strict | Option appears when list config allows | generic filter strips custom option | include option by metadata flag | Planned |

## Security + Privileges
| ID | Symptom | Why it happens on web | Expected FileMaker behavior | Likely FMWeb root cause | Mitigation approach | Test strategy |
| --- | --- | --- | --- | --- | --- | --- |
| EC-035 | Read-only field still appears editable | client-only gating incomplete | Non-writable fields cannot be committed | control disable state not aligned with privileges | privilege-aware control props + server guard | Planned privilege UI tests |
| EC-036 | Hidden field appears in table/list view | column config ignores field visibility | Hidden fields stay hidden in every view | table/list projection bypasses hide rules | apply visibility gating in view projection | Planned |
| EC-037 | Unauthorized menu command executes partially | disabled state only on UI | Command blocked with clear error | missing server-side capability checks | enforce API-level RBAC for dangerous actions | Planned security integration tests |
| EC-038 | Cross-file inaccessible dependency crashes layout | missing graceful degrade path | Banner + read-only placeholders, no crash | exception bubbles from routing resolver | dependency status guard at fetch/commit boundary | Planned multi-file deny tests |

## Mode Separation + Navigation
| ID | Symptom | Why it happens on web | Expected FileMaker behavior | Likely FMWeb root cause | Mitigation approach | Test strategy |
| --- | --- | --- | --- | --- | --- | --- |
| EC-039 | Layout mode action mutates browse data | state stores accidentally shared | Layout edits only mutate layout metadata | shared mutable object references | immutable mode-scoped state boundaries | Automated: mode separation assertions |
| EC-040 | Browse edits mutate layout definitions | wrong persistence target on save | Browse commits only record data | save handler routes to layout store path | explicit persistence router by mode | Automated: mode separation assertions |
| EC-041 | Browser back/forward breaks layout context | URL state not fully encoded | navigation history restores mode/layout/record context | incomplete URL serialization | serialize mode/layout/view/record id | Planned history tests |
| EC-042 | Record navigation bypasses unsaved prompt | route change path skips dirty guard | navigation prompts or commits according to config | guard not attached to all navigation paths | central navigation guard middleware | Planned dirty-prompt tests |

## Dialogs + Error UX
| ID | Symptom | Why it happens on web | Expected FileMaker behavior | Likely FMWeb root cause | Mitigation approach | Test strategy |
| --- | --- | --- | --- | --- | --- | --- |
| EC-043 | Unsaved dialog loses focus trap | modal layering/focus race | dialog traps focus until resolved | no unified modal manager ordering | centralized modal stack + focus sentry | Planned dialog tests |
| EC-044 | Validation dialog appears behind menu | z-index stack collision | validation prompt is top-most actionable layer | menu/dialog z-index mismatch | harmonize modal z-index tokens | Planned |
| EC-045 | Delete confirmation dismissed by unintended click | backdrop click handling too permissive | delete requires explicit confirmation | backdrop handling not danger-aware | disable backdrop close for destructive confirms | Planned |
| EC-046 | Error banner too technical for end users | raw server errors surfaced directly | user guidance + optional developer detail | missing error mapping layer | normalize errors to friendly + debug detail | Automated smoke for error banner presence |
| EC-047 | Last command context lost after failure | no unified action trail | debugging shows last action/mode/layout/record | missing test/debug bridge state | `window.__FMWEB_NATIVE_UI_TEST__` last-action hook | Automated: command harness hook assertions |

## Automated Edge Cases in Phase 2
Automated directly in `tests/ui/native-parity/native-parity.spec.mts`:
- EC-006, EC-008, EC-009, EC-010, EC-015, EC-022, EC-026, EC-039, EC-040, EC-047
- Additional smoke coverage for EC-011/012/013/014/017/018/019/020/021/030 through mode/portal/control/menu workflows and command harness traversals.

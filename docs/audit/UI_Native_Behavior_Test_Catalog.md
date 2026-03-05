# UI Native Behavior Test Catalog

This catalog maps UI automation to FileMaker-native expectations.

Test implementation: `tests/ui/native-parity/native-parity.spec.mts`
Scenario implementation: `tests/ui/native-parity/scenarios.spec.mts` + `tests/ui/native-parity/scenarios/`

Scenario coverage groups:
- Browse mode record lifecycle (SCN-001..SCN-008)
- Find mode query semantics (SCN-009..SCN-013)
- Portals related-data flows (SCN-014..SCN-020)
- Layout mode safe edits (SCN-021..SCN-023)
- Navigation/history and menus (SCN-024..SCN-025)

## Menu / Commands
| Test ID | FileMaker expectation | Coverage | Status |
| --- | --- | --- | --- |
| NP-004 | File menu opens and commands are actionable/disabled with rationale | Layout top menubar File | Automated |
| NP-005 | View menu controls mode/view semantics | Layout top menubar View | Automated |
| NP-021 | Browse top menus open in context | File/Edit/Records/View/Layouts/Scripts/Window/Help | Automated |
| NP-022 | Commands can be iterated and executed from registry | Command registry + engine + coverage | Automated |

## Layout Mode
| Test ID | FileMaker expectation | Coverage | Status |
| --- | --- | --- | --- |
| NP-002 | Layout mode initializes with correct context | uiTest hook mode/layout state | Automated |
| NP-003 | Layout mode actions do not mutate runtime data mode | Mode separation invariant | Automated |
| NP-006 | Clicking an object selects exactly that object | Single-select behavior | Automated |
| NP-007 | Shift-click extends selection set | Multi-select behavior | Automated |
| NP-007b | Iterating layout objects keeps selection model stable | Multi-object click/select traversal | Automated |
| NP-007c | Undo command does not corrupt object selection state | Undo/redo smoke on selected object | Automated |
| NP-022 | Layout status/toolbar commands execute from registry | Toggle and menu actions | Automated |

## Browse Mode
| Test ID | FileMaker expectation | Coverage | Status |
| --- | --- | --- | --- |
| NP-008 | Browse mode initializes with runtime context | uiTest hook mode/layout state | Automated |
| NP-009 | Record navigator and status area are available | Current record control + nav buttons | Automated |
| NP-010 | View switch toggles Form/List/Table reliably | view tabs + aria-selected | Automated |
| NP-013 | Field focus receives typing without drift | Focus invariant on editable controls | Automated |
| NP-014 | Editing marks record as uncommitted/dirty | staged pill assertion | Automated |
| NP-015 | Save path clears staged state | Save + dirty pill clear | Automated |
| NP-016 | Cancel reverts staged state | Cancel + dirty pill clear | Automated |

## Find Mode
| Test ID | FileMaker expectation | Coverage | Status |
| --- | --- | --- | --- |
| NP-011 | Enter Find Mode exposes find request controls | Find split + perform/cancel controls | Automated |
| NP-022 | Find-capable commands can be dispatched via registry | command harness mode-aware actions | Automated |

## Preview Mode
| Test ID | FileMaker expectation | Coverage | Status |
| --- | --- | --- | --- |
| NP-012 | Preview mode shows print-oriented controls | Preview pill + print controls | Automated |
| NP-022 | Preview-capable commands can be dispatched via registry | command harness mode-aware actions | Automated |

## Portals
| Test ID | FileMaker expectation | Coverage | Status |
| --- | --- | --- | --- |
| NP-017 | Portal row controls are focusable/editable | Portal input focus in runtime portal rows | Automated (fixture-dependent skip if absent) |
| NP-022 | Portal-adjacent commands are included in command coverage | command registry traversal | Automated |

## Value Lists / Controls
| Test ID | FileMaker expectation | Coverage | Status |
| --- | --- | --- | --- |
| NP-018 | Popup/value-list controls are interactive | `.runtime-popup-menu` control smoke | Automated (fixture-dependent skip if absent) |
| NP-019 | Date controls render with expected affordance class | `.runtime-date-input` visibility | Automated (fixture-dependent skip if absent) |

## Keyboard / Focus
| Test ID | FileMaker expectation | Coverage | Status |
| --- | --- | --- | --- |
| NP-013 | Click focus is stable | focused editable field | Automated |
| NP-020 | Tab moves focus through runtime controls | tab sequencing smoke | Automated |

## Undo / Redo, Commit / Revert, Navigation
| Test ID | FileMaker expectation | Coverage | Status |
| --- | --- | --- | --- |
| NP-007c | Undo applies to layout editing scope and keeps selection stable | Edit menu Undo smoke | Automated |
| NP-015 | Commit flow (save) clears dirty state | Save button + staged state | Automated |
| NP-016 | Revert flow (cancel) clears dirty state | Cancel button + staged state | Automated |
| NP-009 | Navigation controls are available and mode-aware | first/prev/next/last controls | Automated |

## Dialogs / Errors / Diagnostics
| Test ID | FileMaker expectation | Coverage | Status |
| --- | --- | --- | --- |
| NP-022 | Last action diagnostics tracked during command execution | `window.__FMWEB_NATIVE_UI_TEST__` hook | Automated |

## Invariant Library Reuse
Invariant assertions are centralized in `tests/ui/native-parity/assertions.mts` and reused across the suite:
- Mode and layout context invariants
- Status/toolbar visibility
- Menu open semantics
- Find/preview mode indicators
- Focus and dirty-state behavior
- Mode separation constraints
- Record navigation visibility
- Last command/action hook consistency

# Phase 2 Summary (Runtime Parity)

Date: 2026-03-01

## Features Implemented
- Repeating field runtime parity in Browse mode:
  - stacked repetition controls in form mode
  - compact repetition display in list/table
  - edit-session integration per repetition
- Tab runtime parity layer:
  - active tab switching
  - calc-based tab label/visibility
  - active tab URL persistence (`tabs` query token)
  - scoped child visibility by tab
- Trigger expansion + veto path:
  - lifecycle/object trigger events
  - `OnRecordCommitRequest` veto handling before commit
  - trigger history/outcomes in debug overlay
- Value-list runtime hardening:
  - scoped cache utility + runtime cache usage
  - display/stored mapping path across runtime controls
- Privilege-aware runtime gating:
  - new `/api/fm/capabilities` route
  - field/layout/portal action gating in browse runtime
  - mock role simulation (`mockRole` query param)
- Debug overlay enhancements (`?debugRuntime=1`):
  - active tabs
  - repeating dirty summary
  - trigger history + outcomes
  - value-list cache state
  - privilege role
  - copy debug snapshot action
- Minimal popover/card window runtime (feature-flagged):
  - `NEXT_PUBLIC_RUNTIME_ENABLE_POPOVERS=1`
  - `NEXT_PUBLIC_RUNTIME_ENABLE_CARD_WINDOWS=1`

## Tests Added/Expanded
- Added to `npm test` chain:
  - `test:tabs` -> `src/lib/tabs-runtime.test.mts`
  - `test:triggers` -> `src/lib/triggers/triggers.test.mts`
  - `test:trigger-policy` -> `src/lib/trigger-policy.test.mts`
  - `test:value-lists` -> `src/lib/value-list-cache.test.mts`
  - `test:privileges` -> `src/lib/runtime-capabilities.test.mts`
- Existing suites still pass:
  - fmcalc, edit-session, runtime-parity, portal, browse-url, menu-actions, layout-import

## Validation Run
- `npm run typecheck` passed
- `npm run lint` passed (warnings remain)
- `npm test` passed

## Remaining Gaps
- Full FileMaker trigger/action parity (all trigger types + full script parameter semantics).
- Full tab/panel child association parity for all imported edge cases.
- Full privilege introspection from live FileMaker account context.
- Full popover/card window parity (stacking, scripting, persistence).
- Renderer modularization: `browse-mode.tsx` remains very large and should be decomposed.

## Phase 3 Recommendations
1. Extract runtime subsystems from `browse-mode.tsx` (tabs, repeating, portals, triggers, privileges).
2. Add integration tests that exercise runtime behavior via route/component harnesses (not only helper-level tests).
3. Expand capabilities route to consume live privilege metadata when available.
4. Harden portal related-record save path for complex TO/layout validation scenarios.

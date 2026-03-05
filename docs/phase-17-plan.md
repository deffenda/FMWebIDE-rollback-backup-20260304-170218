# Phase 17 Plan — Layout Fidelity v2 (Styles, Anchoring, Interaction)

## Scope
Phase 17 is focused on DDR layout fidelity only:
- anchor/autosize parity from DDR flags
- theme/style resolution parity stack
- object-identity interaction routing
- debug/fidelity instrumentation

Non-goals for this phase:
- new script-engine parity
- found set/runtime kernel expansion
- governance/admin features

## Current Baseline
Phase 16 already delivered:
- streaming DDR import and object extraction
- richer layout-object metadata in the internal model
- browse-mode fidelity warnings
- layout fidelity harness (`test:layout-fidelity`)

## P0 Work Items

### 1) Anchoring/autosize runtime engine
- Add a deterministic, pure anchor engine that computes runtime rectangles from:
  - base bounds
  - base/runtime container sizes
  - decoded DDR anchor flags
- Decode DDR object flags into anchor booleans.
- Add container-kind tracking (`layout`, `tab`, `slide`, `popover`, `portalRow`).

Acceptance criteria:
- deterministic output for all tested scenarios
- portal/tab/popover child anchoring resolved by parent context

### 2) Style resolution stack
- Resolve styles in stack order:
  - theme defaults
  - style variant
  - local overrides
  - conditional-format fallback layer
- Wire resolved styles into browse renderer.

Acceptance criteria:
- resolved style stack available per component
- final style can be inspected in debug overlay

### 3) Object-ID interaction routing
- Add objectId-based router for UI interactions.
- Route object enter/exit/click and button/portal row interactions.
- Keep handler isolation (router failures cannot crash runtime).

Acceptance criteria:
- last interaction event visible in debug overlay
- active object tracking is stable

### 4) Test coverage + script wiring
- Add unit tests for:
  - anchor engine
  - style resolver
  - interaction router
- Add npm script to run the fidelity engine tests as part of standard test flow.

## P1 Follow-ups
- Expand style mapper for deeper LocalCSS/stateful button variants.
- Add dedicated style/anchor debug toggle panel in browse UI.
- Extend fidelity harness metrics to include anchor-source coverage.

## P2 Follow-ups
- Optional websocket/poll interaction synchronization channel parity pass.
- Per-object visual mismatch heatmap in screenshot baseline workflow.

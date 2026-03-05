# Phase 10 Plan: Plugin SDK and Extensibility

Date: 2026-03-01

## Current Runtime Baseline (Phase 1-9)

Verified foundations already in repo:

- Runtime kernel + found sets + context stack + script engine + variables:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/kernel.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/script-engine.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/context-stack.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/foundset-store.ts`
- Browse/layout runtime rendering and trigger usage:
  - `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`
  - `/Users/deffenda/Code/FMWebIDE/components/layout-mode.tsx`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/triggers/index.ts`
- Multi-file routing + server data client:
  - `/Users/deffenda/Code/FMWebIDE/src/server/filemaker-client.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/workspace-multifile.ts`
- Enterprise hardening baseline (authz/csrf/audit/observability):
  - `/Users/deffenda/Code/FMWebIDE/src/server/security/*`
  - `/Users/deffenda/Code/FMWebIDE/src/server/audit-log.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/server/observability.ts`

Current gap: no formal plugin SDK/runtime extension contract exists; extensibility requires source edits.

## Phase 10 Scope

Build a versioned Plugin SDK with safe runtime integration for:

1. Script step extensions
2. Layout object/UI component extensions
3. Runtime lifecycle hooks
4. Data adapter interception
5. Plugin packaging/dev scaffold
6. Example plugins + tests + docs

## P0 Backlog

### P0.1 Plugin Core

- Add `/Users/deffenda/Code/FMWebIDE/src/plugins/*` with:
  - `PluginManager`
  - `PluginRegistry`
  - versioned API interfaces (`FMPlugin`, `PluginContext`)
  - compatibility checks
  - activation/deactivation lifecycle
  - plugin fault isolation
- Acceptance:
  - plugin registration/unregistration works
  - incompatible plugin rejected with clear error
  - plugin failure does not crash runtime

### P0.2 Script Step Extension API

- Extend script engine adapter with custom-step execution bridge.
- Allow plugins to register:
  - step executors
  - validators
  - custom error code catalog
- Integrate from kernel so runtime scripts can execute plugin steps.
- Acceptance:
  - custom step is discoverable and executable
  - validation failure produces deterministic error
  - custom error code surfaced in script result

### P0.3 Layout Object Extension API

- Allow plugin registration of layout component types with:
  - runtime renderer
  - preview renderer
  - inspector renderer metadata hook
- Add browse runtime bridge to render plugin component objects.
- Acceptance:
  - plugin component renders in browse/preview without core edits
  - renderer failure is isolated to component and logged

### P0.4 Runtime Hook Subscription

- Add plugin hook bus for:
  - `OnRecordLoad`
  - `OnRecordCommit`
  - `OnLayoutEnter`
  - `OnScriptStart` / `OnScriptEnd`
  - `OnTransactionStart` / `OnTransactionEnd`
- Wire core hook emission in runtime kernel/script flow.
- Acceptance:
  - plugin receives ordered hooks
  - hook failure is isolated

## P1 Backlog

### P1.1 Data Adapter Extensions

- Add plugin data adapter interception chain for CRUD/read/find operations.
- Provide operation contracts and pass-through/fallback behavior.
- Acceptance:
  - adapter can intercept and handle operation
  - unhandled operations route to native FileMaker client path

### P1.2 Sandbox Model

- Controlled API exposure via frozen plugin context
- No credential/secrets exposure through context
- Error boundaries around all plugin callbacks
- Acceptance:
  - sandbox policy documented
  - runtime survives plugin exceptions

### P1.3 Plugin Packaging + CLI Scaffold

- Add manifest contract (`manifest.json`) and validator.
- Add CLI scaffold: `fmweb-plugin init`.
- Acceptance:
  - scaffold outputs valid plugin structure
  - manifest validation errors are actionable

## P2 Backlog

### P2.1 Registry/Marketplace Stub

- Feature-flagged plugin discovery/install APIs (stubbed, non-production).
- Acceptance:
  - toggleable discovery endpoint exists
  - docs identify future hardening needs (signing, trust policy)

## Test Plan

New dedicated suite:

- `npm run test:plugin-sdk`

Coverage:

- plugin registration
- compatibility checks
- script step extensions
- layout object extensions
- hook subscriptions
- plugin isolation on throw
- data adapter interception

## Compatibility and Migration

- No breaking change to existing layouts/scripts required.
- Existing `LayoutComponent.type` handling remains intact; plugin types are additive.
- Script engine keeps current built-in step behavior; plugin step execution is fallback path.
- Plugin system default-enabled for local runtime, but can be feature-gated if needed.

## Risks and Mitigations

- Risk: plugin callback latency impacts render/script performance.
  - Mitigation: isolate failures, avoid synchronous blocking in core paths where possible.
- Risk: plugin misuse of DOM/global APIs.
  - Mitigation: constrained context API and documented sandbox limitations.
- Risk: incompatible plugin versions.
  - Mitigation: strict compatibility checks at registration/activation.

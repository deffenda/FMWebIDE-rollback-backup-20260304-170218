# Phase 12 Plan: App Layer Extras Parity

Date: 2026-03-02

## Scope
Phase 12 extends app-layer parity beyond File > Manage by covering global dialogs and tooling:
- Preferences
- Sharing/Hosting diagnostics
- File Options
- Recover/Clone/Compact
- Import/Export center
- Script Debugger
- Data Viewer
- File References
- Auth Profiles
- Plugin Manager
- Window management extras
- Help/About/Diagnostics

This phase intentionally avoids runtime-kernel rewrites and focuses on UI wiring, capability gating, persistence, and graceful behavior.

## A) Current App-Layer Inventory

### Menubar structure
- Layout Mode menubar:
  - `/Users/deffenda/Code/FMWebIDE/components/layout-mode.tsx`
  - Top-level: FileMaker, File, Edit, View, Insert, Format, Layouts, Arrange, Scripts, Tools, Window, Help
  - File > Manage submenu fully wired (Phase 11)
- Browse/Find/Preview menubar:
  - `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`
  - Top-level: FileMaker Pro, File, Edit, View, Insert, Format, Records, Scripts, Tools, Window, Help

### Command palette
- No standalone command palette module is currently present.
- App-layer routing currently uses explicit menubar action dispatchers and status-area controls.

### Global dialogs
- Existing:
  - Preferences (Browse mode only; lightweight)
  - Runtime Capabilities
  - Data Viewer (layout mode)
  - Manage Center + Manage Database + Manage Custom Menus + Value Lists
  - Import Solution + Solution Settings

### Status area actions
- Browse mode status area supports:
  - mode switching, record navigation, find actions, saved finds/found sets, sort/list/table actions
- Layout mode status area supports:
  - reload/save, formatting toggle, guides/rulers, device frame controls

### Existing app-layer managers
- Central capability registry:
  - `/Users/deffenda/Code/FMWebIDE/src/config/appLayerCapabilities.ts`
- Workspace app-layer storage:
  - `/Users/deffenda/Code/FMWebIDE/src/server/app-layer-storage.ts`
  - `/Users/deffenda/Code/FMWebIDE/app/api/workspaces/[workspaceId]/app-layer/route.ts`
- Error model/banner:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/app-layer-errors.ts`
  - `/Users/deffenda/Code/FMWebIDE/components/app-layer-error-banner.tsx`

## B) APPX Coverage Baseline

See:
- `/Users/deffenda/Code/FMWebIDE/docs/app-layer-parity-matrix.md`

Phase-12 target IDs:
- APPX-201 Preferences
- APPX-202 Sharing/Hosting
- APPX-203 File Options
- APPX-204 Recover/Clone/Compact
- APPX-205 Import/Export
- APPX-206 Script Debugger
- APPX-207 Data Viewer
- APPX-208 File References
- APPX-209 Auth Profiles
- APPX-210 Plugin Manager
- APPX-211 Window Management Extras
- APPX-212 Help/About/Diagnostics

## C) P0 / P1 / P2 Implementation Roadmap

### P0
1. Capability registry uplift for APPX-201..APPX-212
   - Add explicit APPX entries and required modules metadata.
   - Ensure disabled entries always show rationale modal and docs link.
2. App-layer dialogs for core workflows:
   - Preferences (tabbed, persisted per workspace)
   - Sharing/Hosting diagnostics (read-only + test connection)
   - File Options (default layout, OnOpen/OnClose script metadata)
   - Import/Export center (CSV/JSON export + CSV import mapping preview)
   - File References manager (dependency mapping + validation)
   - Auth Profiles manager (per-file profile mapping + login test)
   - Help/About/Diagnostics (about modal + JSON diagnostics export)
3. Toggle non-feasible operations:
   - Recover/Clone/Compact desktop file ops
   - Tile/Cascade native desktop window layout semantics
4. App-layer tests:
   - Expand `test:app-layer` coverage for APPX items and disabled rationale behavior.

### P1
1. Script Debugger panel parity uplift (if runtime step mode available in current build)
2. Data Viewer panel expansion:
   - variable and context-stack inspection + FMCalc-lite eval helper
3. Plugin Manager:
   - list plugins, show status/version compatibility, enable/disable toggles

### P2
1. Additional import adapters (XLSX) if safely supportable
2. Deeper window management parity beyond browser-safe operations
3. Advanced diagnostics pack (bundle export with optional logs)

## D) Acceptance Criteria

1. Every APPX item is either:
   - Implemented, or
   - Partial with explicit “Not yet supported”, or
   - Disabled/toggled with rationale + docs link.
2. Menubar actions do not silently no-op.
3. Implemented dialogs show workspace/file context where relevant and are safe in mock mode.
4. Unsupported actions always produce an explicit not-supported rationale UX.
5. `npm run test:app-layer` includes APPX coverage and passes.

## E) Risks and Mitigations

1. Layout-mode component size/complexity risk
   - Mitigation: keep state additive; use centralized app-layer storage schema.
2. Backward compatibility risk for existing app-layer JSON
   - Mitigation: normalize with defaults and non-breaking optional fields.
3. Browser security/runtime limitations for desktop-native actions
   - Mitigation: explicit feature toggles and rationale dialog.

## F) Backward Compatibility

1. Keep Phase-11 APP-101..APP-110 manage capabilities intact.
2. Add APPX entries in parallel for extras.
3. Preserve existing app-layer storage fields; append new optional sections with defaults.

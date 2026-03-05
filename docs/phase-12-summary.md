# Phase 12 Summary: App Layer Extras Parity

Date: 2026-03-02

## Scope Completed

Phase 12 completed the app-layer extras sweep beyond File > Manage, with capability-gated behavior and parity documentation for:
- APPX-201 Preferences
- APPX-202 Sharing / Hosting
- APPX-203 File Options
- APPX-204 Recover / Clone / Compact
- APPX-205 Import / Export
- APPX-206 Script Debugger
- APPX-207 Data Viewer
- APPX-208 File References
- APPX-209 Auth Profiles
- APPX-210 Plugin Manager
- APPX-211 Window Management Extras
- APPX-212 Help / About / Diagnostics

## Features Implemented

## 1) Capability registry and disabled rationale UX
- Central APPX capability entries implemented in:
  - `/Users/deffenda/Code/FMWebIDE/src/config/appLayerCapabilities.ts`
- Menubar actions now resolve capability status and show rationale modal for disabled paths instead of failing silently.
- Required module metadata and doc links are available per capability.

## 2) App-layer manager shell expansion
- `Manage Center` in Layout Mode now includes:
  - Preferences
  - Sharing / Hosting diagnostics
  - File Options
  - Import / Export center
  - File References
  - Auth Profiles
  - Plugin Manager
  - Help / Diagnostics
- Implemented in:
  - `/Users/deffenda/Code/FMWebIDE/components/layout-mode.tsx`

## 3) Workspace persistence model expansion
- App-layer storage now persists Phase-12 domains:
  - `preferences`
  - `fileOptions`
  - `fileReferences`
  - `authProfiles`
  - `pluginPreferences`
- Implemented in:
  - `/Users/deffenda/Code/FMWebIDE/src/server/app-layer-storage.ts`
  - `/Users/deffenda/Code/FMWebIDE/app/api/workspaces/[workspaceId]/app-layer/route.ts`

## 4) Implemented APPX workflows
- Preferences:
  - General/Runtime/Debug/Security settings, persisted and applied at runtime where supported.
- Sharing/Hosting:
  - read-only health/routing diagnostics and `Test Connection`.
- File Options:
  - per-file default layout + OnOpen/OnClose script metadata.
- Import/Export:
  - CSV/JSON export; CSV import parsing, preview, and batch create.
- File References:
  - dependency mapping and missing-reference validation summary.
- Auth Profiles:
  - create/delete profile mappings and per-profile connection test status.
- Plugin Manager:
  - runtime plugin state + persisted enable/disable preference synchronization.
- Help/Diagnostics:
  - diagnostics JSON export including workspace/app-layer snapshot and health context.

## Feature-Toggled / Not Feasible Areas

- APPX-204 Recover/Clone/Compact:
  - Disabled (browser runtime cannot safely perform desktop file maintenance).
- APPX-205 advanced formats (for example XLSX import):
  - Partial; CSV/JSON supported, richer format parity deferred.
- APPX-211 tile/cascade:
  - Disabled/experimental due to browser windowing constraints.
- APPX-206 full native debugger parity:
  - Partial; routed to existing debug/script workspace flow.
- APPX-207 full native data viewer parity:
  - Partial; current data viewer remains runtime-focused and web-safe.

## Tests Added / Updated

- Capability and APPX coverage:
  - `/Users/deffenda/Code/FMWebIDE/src/config/appLayerCapabilities.test.mts`
- App-layer menu wiring and parity checklist output:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/app-layer-menu.test.mts`
- App-layer storage schema/persistence coverage:
  - `/Users/deffenda/Code/FMWebIDE/src/server/app-layer-storage.test.mts`

Commands:
- `npm run test:app-layer`
- `npm run test:menu-actions`
- `npm run typecheck`

## Remaining Gaps (Phase 13 Suggestions)

1. Full FileMaker Script Debugger parity:
   - true breakpoint management, step over/into/out, and stack frame variable inspection fidelity.
2. Full Data Viewer parity:
   - watch expressions, richer typed views, and script-context variable panes.
3. Advanced import/export formats:
   - XLSX import/export and richer mapping templates.
4. Deeper window management parity:
   - browser-safe alternatives for tile/cascade orchestration.
5. Command palette parity:
   - a dedicated command palette wired to all app-layer actions/capabilities.

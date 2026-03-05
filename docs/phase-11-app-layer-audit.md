# Phase 11 App Layer Audit

Date: 2026-03-01

## Scope
Audit of FileMaker-style app-layer parity in FM Web IDE, focused on global menus, status actions, and manager dialogs/screens.

## A) App Layer Inventory

### 1) Menubar surfaces

#### Layout Mode menubar
Defined and rendered in:
- `components/layout-mode.tsx`

Key coverage:
- Top-level menus: `FileMaker`, `File`, `Edit`, `View`, `Insert`, `Format`, `Layouts`, `Arrange`, `Scripts`, `Tools`, `Window`, `Help`
- File > Manage submenu includes:
  - `Database...`
  - `Security...`
  - `Value Lists...`
  - `Layouts...`
  - `Scripts...`
  - `External Data Sources...`
  - `Containers...`
  - `Custom Functions...`
  - `Custom Menus...`
  - `Themes...`
- Action dispatcher:
  - `handleTopMenubarAction(actionId)` in `components/layout-mode.tsx`

#### Browse/Find/Preview menubar
Defined and rendered in:
- `components/browse-mode.tsx`

Key coverage:
- Top-level menus: `FileMaker Pro`, `File`, `Edit`, `View`, `Insert`, `Format`, `Records`, `Scripts`, `Tools`, `Window`, `Help`
- Action dispatcher:
  - `handleTopMenubarAction(actionId)` in `components/browse-mode.tsx`

### 2) Status area surfaces

#### Layout Mode status area
Defined in:
- `components/layout-mode.tsx`

Includes (feature/config dependent):
- layout picker
- toolbar toggles (formatting bar, guides/rulers/grid)
- save/reload actions
- mode switching and device frame options

#### Browse/Find/Preview status area
Defined in:
- `components/browse-mode.tsx`

Includes:
- mode switching (`Browse`/`Find`/`Preview`)
- record navigation
- found set actions (show all, constrain, extend, saved finds/found sets)
- sort and list/table controls

### 3) Global dialogs and manager-like screens

#### Existing manager dialogs in Layout Mode
- Manage Database dialog:
  - `components/layout-mode.tsx`
  - tabs for tables/fields/relationships with graph interaction
- Manage Value Lists dialog:
  - `components/layout-mode.tsx`
- Manage Custom Menus dialog:
  - `components/layout-mode.tsx`

#### Existing supporting dialogs (app-layer relevant)
- Solution Settings:
  - `components/layout-mode.tsx`
- Import Solution:
  - `components/layout-mode.tsx`
- Script Workspace:
  - `components/layout-mode.tsx`
- Data Viewer:
  - `components/layout-mode.tsx`
- Runtime Capabilities dialog:
  - `components/browse-mode.tsx`

### 4) Workspace/settings/admin surfaces

Workspace APIs and metadata persistence:
- `app/api/workspaces/[workspaceId]/route.ts`
- `app/api/workspaces/[workspaceId]/custom-menus/route.ts`
- `app/api/workspaces/[workspaceId]/saved-searches/route.ts`
- `app/api/workspaces/[workspaceId]/view-configs/route.ts`
- `src/server/workspace-context.ts`

Admin and enterprise app-layer endpoints (no full app-layer UI shell yet):
- `app/api/admin/config/route.ts`
- `app/api/admin/metrics/route.ts`
- `app/api/admin/audit/route.ts`

### 5) Capability/feature gating foundation

Current runtime feature flags:
- `src/config/featureFlags.ts`

Current status/menubar parity notes:
- `docs/status-menubar-parity.md`

Gap (historical, now addressed in Phase 11):
- Centralized app-layer capability registry is now implemented in `src/config/appLayerCapabilities.ts`.
- App-layer capabilities modal/screen is now wired in Layout Mode (`View > App Layer Capabilities...`).

## B) FileMaker App Layer parity matrix linkage

Detailed matrix is maintained in:
- `docs/app-layer-parity-matrix.md`

Tracking IDs use `APP-###` and include:
- Manage submenu entries are mapped to `APP-101` through `APP-110`.
- expected FM behavior
- current implementation status (`✅` / `🟡` / `❌` / `🚫`)
- feasibility decision and implementation/toggle plan

## C) Screenshot/Reference Notes

Provided FileMaker Manage submenu reference contains:
- `Database...`
- `Security...`
- `Value Lists...`
- `Layouts...`
- `Scripts...`
- `External Data Sources...`
- `Containers...`
- `Custom Functions...`
- `Custom Menus...`
- `Themes...`

FM Web IDE now exposes all listed entries under File > Manage in Layout Mode with capability-gated behavior.

## D) Additional likely app-layer gaps beyond Manage submenu

Included in matrix for explicit implementation/toggle decisions:
- Preferences / Settings parity
- File Options parity
- Sharing/hosting status surface
- Recover flow
- Script Debugger controls
- Data Viewer parity details
- Window tiling/cascade parity (currently feature-flagged runtime support)
- Help/About + diagnostics consistency across modes

## E) Implementation gating rule for Phase 11

Before introducing new app-layer entries:
1. Add centralized app-layer capability registry.
2. Route every app-layer menu action through capability checks.
3. If unsupported:
   - disabled menu item OR blocked action with rationale modal
   - link to parity matrix tracking ID
4. Add app-layer integration tests and parity checklist output.

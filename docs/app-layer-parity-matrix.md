# App Layer Parity Matrix

Date: 2026-03-02

Legend:
- ✅ Implemented
- 🟡 Partial
- ❌ Missing
- 🚫 Not Feasible
- ⛔ Not Applicable

## Phase 11 baseline (Manage submenu)

| ID | Menu Path | Status | Notes |
|---|---|---|---|
| APP-101 | File > Manage > Database... | 🟡 | Workspace schema manager with diagnostics; live FM schema mutation intentionally limited |
| APP-102 | File > Manage > Security... | 🟡 | Read-only privilege diagnostics + role simulation |
| APP-103 | File > Manage > Value Lists... | 🟡 | Workspace value-list management with partial native parity |
| APP-104 | File > Manage > Layouts... | 🟡 | Workspace-local layout management operations |
| APP-105 | File > Manage > Scripts... | 🟡 | Script list/run + workspace integration, partial authoring parity |
| APP-106 | File > Manage > External Data Sources... | 🟡 | Registry placeholders and diagnostics, no ESS runtime parity |
| APP-107 | File > Manage > Containers... | 🟡 | Proxy/cache diagnostics and upload policy controls |
| APP-108 | File > Manage > Custom Functions... | 🟡 | FMCalc-lite subset support |
| APP-109 | File > Manage > Custom Menus... | 🟡 | Workspace menu model + runtime hooks for supported actions |
| APP-110 | File > Manage > Themes... | 🟡 | Workspace theme management and apply flow |

## Phase 12 targets (APPX-201..APPX-212)

| ID | Surface | Expected FM-style behavior | Current | Feasibility decision |
|---|---|---|---|---|
| APPX-201 | Preferences | General/Runtime/Debug/Security preferences | ✅ | Implemented as workspace-persisted preference panel; native OS-level preferences remain out-of-scope |
| APPX-202 | Sharing / Hosting | Hosting controls and connection state | ✅ | Implemented read-only diagnostics + connection test; host mutation is feature-toggled |
| APPX-203 | File Options | OnOpen/OnClose script + default layout options | ✅ | Implemented workspace-level file options per file context |
| APPX-204 | Recover / Clone / Compact | File maintenance ops | 🚫 | Explicitly toggled as not feasible in browser runtime |
| APPX-205 | Import / Export | CSV/JSON export and CSV import mapping flow | 🟡 | Implemented import/export center (CSV preview + batch create + CSV/JSON export); XLSX remains toggled |
| APPX-206 | Script Debugger | Step controls/call stack/variables | 🟡 | Routed through capability-gated Script Debugger entry (opens script workspace debug flow) |
| APPX-207 | Data Viewer | Variables/fields/context + calc eval | 🟡 | Capability-gated Data Viewer dialog available in Layout Mode |
| APPX-208 | File References | Dependency mapping and validation | ✅ | Implemented file reference manager with dependency validation summary |
| APPX-209 | Auth Profiles | Per-file auth profile manager + test login | ✅ | Implemented auth profile registry + per-profile connection test |
| APPX-210 | Plugin Manager | Enable/disable plugins + version compatibility | ✅ | Implemented plugin manager panel backed by runtime plugin SDK state/preferences |
| APPX-211 | Window Management Extras | New/Close/Next/Previous windows + tile/cascade | 🟡 | Implemented browser-safe new/close/next/previous; tile/cascade remains gated |
| APPX-212 | Help / About / Diagnostics | About dialog + diagnostics export | ✅ | Implemented diagnostics manager with JSON export + help links |

Phase 12 verification:
- `npm run test:app-layer` validates APPX capability IDs, disabled rationale behavior, and parity checklist output.
- `npm run test:menu-actions` validates menu action coverage for top-level routing.

## Phase 15 governance targets (APP-119..APP-123)

| ID | Surface | Expected behavior | Current | Feasibility decision |
|---|---|---|---|---|
| APP-119 | View > App Layer Capabilities... | Centralized capability registry with rationale and docs links | ✅ | Implemented; single source of truth for app-layer gating |
| APP-120 | File > Version History... | Workspace checkpoint history, version diff, rollback/export | 🟡 | Implemented for workspace metadata/version bundles; live FileMaker file rollback is not feasible |
| APP-121 | File > Publish / Promote... | Dev/Test/Prod promotion flow with approval checklist and rollback | 🟡 | Implemented for workspace environment pointers and release metadata; full external deployment orchestration remains partial |
| APP-122 | Window > Admin Console... | Admin-only operations hub with workspace health, versions, audit and metrics | 🟡 | Implemented via admin API + manager screen; external SIEM integrations remain partial |
| APP-123 | Help > Recovery / Safe Mode... | Safe-mode recovery controls and diagnostics export after instability | 🟡 | Implemented for browser runtime/session state; desktop crash-recovery parity is not feasible |

## APPX anchors

<a id="APPX-201"></a>
### APPX-201 Preferences
Delivered: Preferences panel in Manage Center with workspace-persisted General/Runtime/Debug/Security options and immediate runtime application for toolbar/formatting.

<a id="APPX-202"></a>
### APPX-202 Sharing / Hosting
Delivered: Read-only hosting diagnostics and connection test flow per selected workspace file.

<a id="APPX-203"></a>
### APPX-203 File Options
Delivered: Workspace-level file options editor (default layout, OnOpen, OnClose) keyed by file.

<a id="APPX-204"></a>
### APPX-204 Recover / Clone / Compact
Delivered: Explicitly disabled capability with rationale and parity-link guidance.

<a id="APPX-205"></a>
### APPX-205 Import / Export
Delivered: Import/Export Center with CSV preview + batch import and CSV/JSON export for selected table occurrence.

<a id="APPX-206"></a>
### APPX-206 Script Debugger
Delivered: Capability-gated Script Debugger route from Tools menu (script workspace debug flow).

<a id="APPX-207"></a>
### APPX-207 Data Viewer
Delivered: Capability-gated Data Viewer dialog remains available for runtime inspection.

<a id="APPX-208"></a>
### APPX-208 File References
Delivered: File References manager with add/remove and missing-reference validation summary.

<a id="APPX-209"></a>
### APPX-209 Auth Profiles
Delivered: Auth Profiles manager with add/remove and per-profile connection test status.

<a id="APPX-210"></a>
### APPX-210 Plugin Manager
Delivered: Plugin Manager panel showing runtime plugin states and persisted enable/disable preferences.

<a id="APPX-211"></a>
### APPX-211 Window Management Extras
Delivered: Browser-safe window extras (next/previous/close/new) plus gated tile/cascade options.

<a id="APPX-212"></a>
### APPX-212 Help / About / Diagnostics
Delivered: Help/Diagnostics panel with documentation shortcuts and diagnostics JSON export.

<a id="APP-119"></a>
### APP-119 App Layer Capabilities
Delivered: Capability dialog with searchable APP/APPX status, rationale, required modules, and parity links.

<a id="APP-120"></a>
### APP-120 Workspace Version History
Delivered: Version History manager section with checkpoint creation, baseline/target selection, diff summary, rollback, and version bundle export.

<a id="APP-121"></a>
### APP-121 Publish / Promote
Delivered: Publish/Promote manager section with environment pointers (`dev/test/prod`), promotion checklist-gated actions, and rollback of environment pointers.

<a id="APP-122"></a>
### APP-122 Admin Console
Delivered: Admin Console manager section backed by `/api/admin/console` showing workspace governance health, dependency status, audit counts, and metrics counters.

<a id="APP-123"></a>
### APP-123 Recovery / Safe Mode
Delivered: Recovery manager section with Safe Mode toggle, reload shortcut, and diagnostics export for instability triage.

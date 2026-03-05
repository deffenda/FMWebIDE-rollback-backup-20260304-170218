import type { ParityTaxonomyItem, UncertaintyLevel } from "./types";

type Seed = {
  subcategory: string;
  capability_name: string;
  expected_filemaker_behavior: string;
  typical_user_value: string;
  suggested_validation_test: string;
  keywords: string[];
  pathHints: string[];
  uncertainty_level?: UncertaintyLevel;
};

function buildCategory(prefix: string, category: string, seeds: Seed[]): ParityTaxonomyItem[] {
  return seeds.map((seed, index) => ({
    id: `${prefix}-${String(index + 1).padStart(3, "0")}`,
    category,
    subcategory: seed.subcategory,
    capability_name: seed.capability_name,
    expected_filemaker_behavior: seed.expected_filemaker_behavior,
    typical_user_value: seed.typical_user_value,
    suggested_validation_test: seed.suggested_validation_test,
    uncertainty_level: seed.uncertainty_level ?? "med",
    keywords: seed.keywords,
    pathHints: seed.pathHints
  }));
}

const layoutModeSeeds: Seed[] = [
  {
    subcategory: "Selection",
    capability_name: "Object selection and multi-select marquee",
    expected_filemaker_behavior: "Layout Mode supports precise click, shift-click, and marquee selection with deterministic selection sets.",
    typical_user_value: "Designers can edit multiple objects quickly without accidental deselection.",
    suggested_validation_test: "Run pointer interaction tests for click, shift-click, marquee-add, marquee-remove across grouped and portal objects.",
    keywords: ["marquee", "selection", "shift", "groupId"],
    pathHints: ["components/layout-mode.tsx", "src/lib/layout-arrange.ts"],
    uncertainty_level: "low"
  },
  {
    subcategory: "Selection",
    capability_name: "Group and ungroup object lifecycle",
    expected_filemaker_behavior: "Grouped objects move and resize as a unit while preserving child relative geometry.",
    typical_user_value: "Complex layouts can be composed from reusable grouped blocks.",
    suggested_validation_test: "Group/un-group roundtrip tests must preserve child bounds and z-order.",
    keywords: ["group", "ungroup", "locked", "arrange"],
    pathHints: ["components/layout-mode.tsx", "src/lib/layout-model.ts"]
  },
  {
    subcategory: "Arrange",
    capability_name: "Bring forward/backward and front/back",
    expected_filemaker_behavior: "Arrange commands deterministically change object stacking order.",
    typical_user_value: "Visual layering is predictable for overlapping controls and labels.",
    suggested_validation_test: "Z-order point-hit tests across overlapping object fixtures.",
    keywords: ["bringFront", "sendBack", "z", "arrange"],
    pathHints: ["components/layout-mode.tsx", "src/lib/layout-arrange.ts"]
  },
  {
    subcategory: "Arrange",
    capability_name: "Align/distribute for multi-object selections",
    expected_filemaker_behavior: "Align/distribute uses selected object boundary math similar to FileMaker.",
    typical_user_value: "Developers can tidy forms quickly without manual coordinate edits.",
    suggested_validation_test: "Unit tests for left/right/top/bottom/center align and distribute spacing on mixed selections.",
    keywords: ["align", "distribute", "selection"],
    pathHints: ["src/lib/layout-arrange.ts", "components/layout-mode.tsx"]
  },
  {
    subcategory: "Guides",
    capability_name: "Rulers and guides with snap behavior",
    expected_filemaker_behavior: "Rulers and guides are visually aligned to canvas coordinates and snapping toggles.",
    typical_user_value: "Pixel-level placement confidence during layout editing.",
    suggested_validation_test: "Visual regressions at different zoom levels for ruler ticks and guide intersections.",
    keywords: ["ruler", "guide", "snap", "grid"],
    pathHints: ["components/layout-mode.tsx", "app/globals.css"]
  },
  {
    subcategory: "Canvas",
    capability_name: "Canvas lock and autosize anchor editing",
    expected_filemaker_behavior: "Canvas can be locked in Layout Mode while autosize anchor metadata remains editable.",
    typical_user_value: "Prevents accidental geometry edits on mature layouts.",
    suggested_validation_test: "Mutation commands should no-op when canvas locked; anchor props still persist.",
    keywords: ["canvas", "locked", "autosize", "anchor"],
    pathHints: ["components/layout-mode.tsx", "src/lib/layout-model.ts"]
  },
  {
    subcategory: "Layout Parts",
    capability_name: "Part creation and part resizing",
    expected_filemaker_behavior: "Header/body/footer and summary parts resize with expected object repositioning semantics.",
    typical_user_value: "Report and form layouts can be structured exactly as FileMaker parts.",
    suggested_validation_test: "Part resize tests verify object y-offset transforms for adjacent parts.",
    keywords: ["parts", "header", "footer", "body", "subSummary"],
    pathHints: ["src/lib/layout-model.ts", "components/layout-mode.tsx"]
  },
  {
    subcategory: "Palette",
    capability_name: "Field placement from schema browser",
    expected_filemaker_behavior: "Dragging fields onto layout can create field+label patterns with consistent placement modes.",
    typical_user_value: "Fast layout prototyping with data-bound controls.",
    suggested_validation_test: "Drag field placement snapshot tests for side-by-side and stacked modes.",
    keywords: ["field picker", "drag", "labelPlacement", "binding"],
    pathHints: ["components/layout-mode.tsx", "src/lib/layout-utils.ts"]
  },
  {
    subcategory: "Inspector",
    capability_name: "Inspector position/size panel parity",
    expected_filemaker_behavior: "Inspector edits x/y/width/height and z values directly with immediate visual update.",
    typical_user_value: "Precise numeric adjustment for alignment-sensitive layouts.",
    suggested_validation_test: "Inspector value updates should mutate selected object and persist to layout JSON.",
    keywords: ["position", "width", "height", "inspector"],
    pathHints: ["components/layout-mode.tsx", "src/lib/layout-model.ts"]
  },
  {
    subcategory: "Inspector",
    capability_name: "Inspector typography and color controls",
    expected_filemaker_behavior: "Font, size, color, alignment, borders, fills, shadows map to object styles.",
    typical_user_value: "Design-time styles mirror runtime rendering without manual CSS edits.",
    suggested_validation_test: "Style field changes must persist and map to runtime style resolver output.",
    keywords: ["font", "fill", "lineColor", "textAlign", "style"],
    pathHints: ["components/layout-mode.tsx", "src/lib/layout-fidelity/style-resolver.ts"]
  },
  {
    subcategory: "Inspector",
    capability_name: "Conditional formatting and hide condition editors",
    expected_filemaker_behavior: "Developers can define conditional style and visibility rules at object level.",
    typical_user_value: "Dynamic layout behavior can be authored without scripts for common cases.",
    suggested_validation_test: "Rule save + runtime eval tests for hideObjectWhen and conditional formatting outputs.",
    keywords: ["hideObjectWhen", "conditional", "tooltip", "calculation"],
    pathHints: ["components/layout-mode.tsx", "src/lib/fmcalc/index.ts"]
  },
  {
    subcategory: "Objects",
    capability_name: "Field control type parity (edit/popup/dropdown/checkbox/radio/date)",
    expected_filemaker_behavior: "Field objects support control types and display options matching inspector settings.",
    typical_user_value: "Forms behave like native FileMaker for end users.",
    suggested_validation_test: "Render each control type in layout and browse mode and assert visual affordances.",
    keywords: ["controlType", "popup", "dropdown", "checkbox", "date"],
    pathHints: ["components/layout-mode.tsx", "components/browse-mode.tsx"]
  },
  {
    subcategory: "Objects",
    capability_name: "Button and button bar authoring",
    expected_filemaker_behavior: "Buttons support script/layout actions; button bars support segment configuration.",
    typical_user_value: "Navigation and workflows can be authored visually.",
    suggested_validation_test: "Button action bindings should execute correct runtime command in browse mode.",
    keywords: ["button", "buttonBarSegments", "events", "runScript"],
    pathHints: ["components/layout-mode.tsx", "src/lib/layout-model.ts"]
  },
  {
    subcategory: "Objects",
    capability_name: "Tab control and slide control authoring",
    expected_filemaker_behavior: "Panel objects support tab labels, default tab, and panel navigation properties.",
    typical_user_value: "Complex multi-panel layouts are manageable in one layout.",
    suggested_validation_test: "Panel config changes should alter browse-mode panel behavior and active tab serialization.",
    keywords: ["panel", "tab", "slide", "panelTabLabels"],
    pathHints: ["components/layout-mode.tsx", "src/lib/tabs-runtime.ts"]
  },
  {
    subcategory: "Objects",
    capability_name: "Popover object authoring",
    expected_filemaker_behavior: "Popover button and popover panel metadata can be configured in layout mode.",
    typical_user_value: "Compact forms can expose advanced controls in contextual popovers.",
    suggested_validation_test: "Popover config persists and runtime popover opens with expected geometry and title.",
    keywords: ["popover", "popoverTitle", "popoverWidth", "popoverHeight"],
    pathHints: ["components/layout-mode.tsx", "components/browse-mode.tsx"]
  },
  {
    subcategory: "Portals",
    capability_name: "Portal setup dialog parity",
    expected_filemaker_behavior: "Portal setup supports rows, sorting, filtering, delete permission, and row state toggles.",
    typical_user_value: "Related record UX can be tuned without custom code.",
    suggested_validation_test: "Portal setup changes should alter browse-mode portal rendering and behavior.",
    keywords: ["portalSetup", "portalSort", "portalFilter", "portalAllowDelete"],
    pathHints: ["components/layout-mode.tsx", "src/lib/portal-utils.ts"]
  },
  {
    subcategory: "Portals",
    capability_name: "Portal template row editing in layout mode",
    expected_filemaker_behavior: "Related fields are positioned in portal template row and row separator is visible.",
    typical_user_value: "Designers can shape portal rows accurately before runtime data exists.",
    suggested_validation_test: "Visual regression for portal layout mode with only native separator/overlay elements.",
    keywords: ["portal", "row", "separator", "template"],
    pathHints: ["components/layout-mode.tsx", "app/globals.css"]
  },
  {
    subcategory: "Workflow",
    capability_name: "Create New Layout wizard with templates",
    expected_filemaker_behavior: "New Layout flow offers template choices and generates reasonable starter layout structures.",
    typical_user_value: "Teams can quickly bootstrap layouts following FileMaker patterns.",
    suggested_validation_test: "Template selection should produce expected parts and starter object sets.",
    keywords: ["newLayout", "template", "wizard"],
    pathHints: ["components/layout-mode.tsx", "src/server/layout-storage.ts"]
  },
  {
    subcategory: "Workflow",
    capability_name: "Clipboard and duplicate object workflows",
    expected_filemaker_behavior: "Copy/paste/duplicate operations preserve style/binding semantics and assign new ids.",
    typical_user_value: "Rapid iterative design without manual recreation.",
    suggested_validation_test: "Duplicated objects must receive unique ids and retain props except identity.",
    keywords: ["duplicate", "copy", "paste", "id"],
    pathHints: ["components/layout-mode.tsx", "src/lib/layout-utils.ts"]
  },
  {
    subcategory: "Workflow",
    capability_name: "Set Tab Order mode and validation",
    expected_filemaker_behavior: "Tab order editing overlays numeric sequence and resolves to deterministic runtime order.",
    typical_user_value: "Data-entry keyboard flow matches expected business workflow.",
    suggested_validation_test: "Tab order assignment and runtime traversal tests for hidden/disabled/portal contexts.",
    keywords: ["tabOrder", "tab stop", "Set Tab Order"],
    pathHints: ["components/layout-mode.tsx", "src/lib/tab-order.ts"],
    uncertainty_level: "low"
  }
];

const browseModeSeeds: Seed[] = [
  {
    subcategory: "Navigation",
    capability_name: "Browse/Find/Preview mode switching",
    expected_filemaker_behavior: "Users can switch modes reliably without losing context or causing render loops.",
    typical_user_value: "Daily workflows remain stable across query, review, and print flows.",
    suggested_validation_test: "Stress test repeated mode switches while editing and filtering records.",
    keywords: ["isFindMode", "isPreviewMode", "setStatus", "mode"],
    pathHints: ["components/browse-mode.tsx", "src/lib/browse-url-state.ts"],
    uncertainty_level: "low"
  },
  {
    subcategory: "Navigation",
    capability_name: "Record navigator parity",
    expected_filemaker_behavior: "First/prev/next/last and record jump update current record and status area consistently.",
    typical_user_value: "Fast record traversal with predictable indexing.",
    suggested_validation_test: "Integration tests for first/prev/next/last + jump input across view modes.",
    keywords: ["recordJump", "first", "next", "prev", "last"],
    pathHints: ["components/browse-mode.tsx", "src/lib/runtime-kernel/foundset-store.ts"]
  },
  {
    subcategory: "Find",
    capability_name: "Multi-request find editing and omit logic",
    expected_filemaker_behavior: "Find mode supports multiple requests, omit flags, and request navigation.",
    typical_user_value: "Complex searches can be authored from UI without script workarounds.",
    suggested_validation_test: "Test add/duplicate/delete request and omit behavior against deterministic dataset.",
    keywords: ["findRequest", "omit", "Perform Find", "criteria"],
    pathHints: ["components/browse-mode.tsx", "src/lib/find-mode.ts"]
  },
  {
    subcategory: "Find",
    capability_name: "Constrain/Extend/Show All found set operations",
    expected_filemaker_behavior: "Found set commands modify active found set with clear status and deterministic behavior.",
    typical_user_value: "Analysts can iteratively narrow or broaden result sets.",
    suggested_validation_test: "Integration tests for constrain and extend preserving index when possible.",
    keywords: ["Constrain", "Extend", "Show all", "found set"],
    pathHints: ["components/browse-mode.tsx", "src/lib/find-mode.ts"]
  },
  {
    subcategory: "Find",
    capability_name: "Saved finds lifecycle",
    expected_filemaker_behavior: "Users can save, run, modify, duplicate, and delete saved finds.",
    typical_user_value: "Repeated business queries are reusable and shareable.",
    suggested_validation_test: "Save/find/re-run/modify tests with persistence validation.",
    keywords: ["saved find", "savedFind", "saveFindDialog", "modify"],
    pathHints: ["components/browse-mode.tsx", "src/server/saved-search-storage.ts"]
  },
  {
    subcategory: "Found Sets",
    capability_name: "Saved found sets lifecycle",
    expected_filemaker_behavior: "Users can persist found-set snapshots and reopen with graceful missing-record handling.",
    typical_user_value: "Teams can bookmark important result sets.",
    suggested_validation_test: "Saved found set open should skip missing ids and report reconciliation summary.",
    keywords: ["saved found set", "saveFoundSet", "recordIds"],
    pathHints: ["components/browse-mode.tsx", "src/server/saved-search-storage.ts"]
  },
  {
    subcategory: "Editing",
    capability_name: "Implicit save on field exit",
    expected_filemaker_behavior: "Leaving a field commits changes when allowed, without forcing explicit save each time.",
    typical_user_value: "Data entry speed and confidence like native FileMaker.",
    suggested_validation_test: "Blur save test with record navigation and value persistence checks.",
    keywords: ["staged", "Saving", "Saved", "fieldSaveStatus"],
    pathHints: ["components/browse-mode.tsx", "src/lib/edit-session/index.ts"],
    uncertainty_level: "low"
  },
  {
    subcategory: "Editing",
    capability_name: "Commit/Revert edit session semantics",
    expected_filemaker_behavior: "Dirty edits can be committed or reverted with prompts on navigation changes.",
    typical_user_value: "Users avoid accidental data loss while keeping efficient editing workflows.",
    suggested_validation_test: "Dirty prompt tests and per-record revert behavior validations.",
    keywords: ["commit", "revert", "dirty", "edit session"],
    pathHints: ["components/browse-mode.tsx", "src/lib/edit-session/index.ts"]
  },
  {
    subcategory: "Editing",
    capability_name: "Field validation and required behavior",
    expected_filemaker_behavior: "Validation rules block invalid commits with field-level guidance.",
    typical_user_value: "Data quality enforcement without custom scripts.",
    suggested_validation_test: "Validation failure tests for required/type/range/calc rules.",
    keywords: ["validation", "required", "strictDataType", "validationMessage"],
    pathHints: ["src/lib/field-engine.ts", "components/browse-mode.tsx"]
  },
  {
    subcategory: "Editing",
    capability_name: "Auto-enter on create/modify behavior",
    expected_filemaker_behavior: "Auto-enter options apply timestamps, account names, serials, and calc defaults at proper times.",
    typical_user_value: "Metadata and audit fields are maintained automatically.",
    suggested_validation_test: "Create/update tests verifying auto-enter field values.",
    keywords: ["autoEnter", "creation", "modification", "serial"],
    pathHints: ["src/lib/field-engine.ts", "components/browse-mode.tsx"]
  },
  {
    subcategory: "Views",
    capability_name: "List view rendering and selection parity",
    expected_filemaker_behavior: "List view supports stable row selection, keyboard navigation, and optional inline edit.",
    typical_user_value: "High-speed scanning and editing across many records.",
    suggested_validation_test: "List row select + keyboard up/down tests with selection sync.",
    keywords: ["list", "row", "virtual", "selection"],
    pathHints: ["components/browse-mode.tsx", "src/lib/list-table-runtime.ts"]
  },
  {
    subcategory: "Views",
    capability_name: "Table view column persistence and sorting",
    expected_filemaker_behavior: "Table columns support reorder/resize/hide and header sort behavior with persistence.",
    typical_user_value: "Users can tailor data grids to role-specific workflows.",
    suggested_validation_test: "Column config persistence and header sort toggle tests.",
    keywords: ["tableColumns", "header sort", "column", "persist"],
    pathHints: ["components/browse-mode.tsx", "src/server/view-config-storage.ts"]
  },
  {
    subcategory: "Views",
    capability_name: "Preview mode print-oriented rendering",
    expected_filemaker_behavior: "Preview mode is read-only, shows print-like output, and supports record navigation.",
    typical_user_value: "Accurate print review without leaving application context.",
    suggested_validation_test: "Browse->Preview->Browse state-preservation tests and preview snapshot checks.",
    keywords: ["Preview", "print", "page", "read-only"],
    pathHints: ["components/browse-mode.tsx", "docs/preview-mode.md"]
  },
  {
    subcategory: "Controls",
    capability_name: "Value list controls in browse and find",
    expected_filemaker_behavior: "Value list controls present consistent stored/display values in browse and find criteria contexts.",
    typical_user_value: "Less data-entry error and consistent filtering behavior.",
    suggested_validation_test: "Dropdown/radio/checkbox tests for display/stored mapping and find criteria.",
    keywords: ["value list", "dropdown", "radio", "checkbox"],
    pathHints: ["components/browse-mode.tsx", "src/lib/value-list-cache.ts"]
  },
  {
    subcategory: "Controls",
    capability_name: "Date control icon and calendar toggle parity",
    expected_filemaker_behavior: "Date controls show calendar icon when enabled and allow date picking in portal and non-portal contexts.",
    typical_user_value: "Date entry is fast and intuitive.",
    suggested_validation_test: "Visual and interaction tests for include-icon flag across view contexts.",
    keywords: ["calendarIncludeIcon", "date", "icon"],
    pathHints: ["components/browse-mode.tsx", "app/globals.css"],
    uncertainty_level: "low"
  },
  {
    subcategory: "Controls",
    capability_name: "Container field context menu actions",
    expected_filemaker_behavior: "Container fields expose insert/export/clipboard actions with permission-aware states.",
    typical_user_value: "Media and file workflows operate similarly to FileMaker Pro.",
    suggested_validation_test: "Container menu action tests for insert/export with mock and filemaker sources.",
    keywords: ["container", "insert-picture", "insert-file", "export"],
    pathHints: ["components/browse-mode.tsx", "src/lib/container-runtime.ts"]
  },
  {
    subcategory: "Runtime",
    capability_name: "Status area parity actions",
    expected_filemaker_behavior: "Status area exposes key record/find/sort/view actions relevant to active mode.",
    typical_user_value: "Users can operate quickly without deep menu navigation.",
    suggested_validation_test: "Mode-specific status toolbar action tests with capability gating.",
    keywords: ["status", "toolbar", "record", "find"],
    pathHints: ["components/browse-mode.tsx", "docs/status-menubar-parity.md"]
  },
  {
    subcategory: "Runtime",
    capability_name: "Menubar parity and shortcut execution",
    expected_filemaker_behavior: "Menubar displays expected command groups and keyboard shortcuts execute supported commands.",
    typical_user_value: "Power users retain familiar command muscle memory.",
    suggested_validation_test: "Menu command and shortcut dispatch tests by mode and role.",
    keywords: ["menubar", "shortcut", "Window", "Help", "Tools"],
    pathHints: ["components/browse-mode.tsx", "components/layout-mode.tsx"]
  },
  {
    subcategory: "Runtime",
    capability_name: "Window/context switching",
    expected_filemaker_behavior: "Users can switch among workspaces/files/windows with stable context and no stale entries.",
    typical_user_value: "Multi-solution workflows stay coherent and navigable.",
    suggested_validation_test: "Window menu list hygiene tests and workspace switch route tests.",
    keywords: ["workspace", "window", "switch", "layout"],
    pathHints: ["components/browse-mode.tsx", "src/server/workspace-context.ts"]
  },
  {
    subcategory: "Runtime",
    capability_name: "Error banner usability and guidance",
    expected_filemaker_behavior: "Runtime failures show actionable guidance while preserving debug details for developers.",
    typical_user_value: "Users can recover quickly from transient and configuration errors.",
    suggested_validation_test: "Error rendering tests for known Data API failures and guidance mapping.",
    keywords: ["error", "guidance", "Update failed", "status"],
    pathHints: ["components/app-layer-error-banner.tsx", "components/browse-mode.tsx"]
  }
];

const scriptingSeeds: Seed[] = [
  {
    subcategory: "Triggers",
    capability_name: "Layout enter/exit triggers",
    expected_filemaker_behavior: "OnLayoutEnter/OnLayoutExit trigger hooks fire in deterministic order.",
    typical_user_value: "Developers can attach navigation and setup automation reliably.",
    suggested_validation_test: "Trigger sequencing tests across layout switch scenarios.",
    keywords: ["OnLayoutEnter", "OnLayoutExit", "trigger"],
    pathHints: ["src/lib/triggers/index.ts", "components/browse-mode.tsx"]
  },
  {
    subcategory: "Triggers",
    capability_name: "Mode enter/exit triggers",
    expected_filemaker_behavior: "OnModeEnter/OnModeExit fire when switching browse/find/preview modes.",
    typical_user_value: "Mode-dependent scripts can initialize and cleanup correctly.",
    suggested_validation_test: "Mode switch trigger tests with expected history order.",
    keywords: ["OnModeEnter", "OnModeExit", "mode"],
    pathHints: ["src/lib/triggers/index.ts", "components/browse-mode.tsx"]
  },
  {
    subcategory: "Triggers",
    capability_name: "Object enter/exit/modify triggers",
    expected_filemaker_behavior: "Field focus and edit lifecycle triggers fire with predictable debounce semantics.",
    typical_user_value: "Validation and helper scripts can run on user interaction boundaries.",
    suggested_validation_test: "Input typing tests with OnObjectModify count and OnObjectExit commit interactions.",
    keywords: ["OnObjectEnter", "OnObjectExit", "OnObjectModify"],
    pathHints: ["src/lib/triggers/index.ts", "src/lib/trigger-policy.ts"]
  },
  {
    subcategory: "Triggers",
    capability_name: "Record commit request veto",
    expected_filemaker_behavior: "OnRecordCommitRequest can cancel commit before persistence.",
    typical_user_value: "Business rules can block invalid saves centrally.",
    suggested_validation_test: "Commit request policy tests for veto and allow paths.",
    keywords: ["OnRecordCommitRequest", "veto", "commit"],
    pathHints: ["src/lib/trigger-policy.ts", "components/browse-mode.tsx"]
  },
  {
    subcategory: "Engine",
    capability_name: "Script call stack and local/global variable scopes",
    expected_filemaker_behavior: "Nested Perform Script calls preserve local $ vars per frame and shared $$ globals.",
    typical_user_value: "Complex script workflows execute predictably.",
    suggested_validation_test: "Nested script tests verifying scope isolation and return semantics.",
    keywords: ["Perform Script", "callStack", "$", "$$"],
    pathHints: ["src/lib/runtime-kernel/script-engine.ts", "src/lib/runtime-kernel/variable-store.ts"]
  },
  {
    subcategory: "Engine",
    capability_name: "Core script step subset execution",
    expected_filemaker_behavior: "Common script steps (go to layout, set field, commit, find, loop) execute deterministically.",
    typical_user_value: "Existing scripts can run with minimal rewrites.",
    suggested_validation_test: "Script engine fixture tests for common step sequences and control flow.",
    keywords: ["Go to Layout", "Set Field", "Loop", "Perform Find"],
    pathHints: ["src/lib/runtime-kernel/script-engine.ts", "src/lib/runtime-kernel/script-engine-advanced.test.mts"]
  },
  {
    subcategory: "Engine",
    capability_name: "Error capture and LastError/LastMessage semantics",
    expected_filemaker_behavior: "Set Error Capture controls halt/continue behavior and updates last error/message state.",
    typical_user_value: "Scripts can intentionally handle expected failure conditions.",
    suggested_validation_test: "Error capture tests with failing actions and nested scripts.",
    keywords: ["Set Error Capture", "LastError", "LastMessage"],
    pathHints: ["src/lib/runtime-kernel/script-engine.ts", "src/lib/runtime-kernel/script-engine-advanced.test.mts"]
  },
  {
    subcategory: "Engine",
    capability_name: "Transaction-aware script execution",
    expected_filemaker_behavior: "Script-level transaction begin/commit/revert semantics stage and apply operations predictably.",
    typical_user_value: "Batch business operations can succeed or fail atomically at runtime level.",
    suggested_validation_test: "Transaction manager tests for partial failure rollback behavior.",
    keywords: ["Begin Transaction", "Commit Transaction", "Revert Transaction"],
    pathHints: ["src/lib/runtime-kernel/transaction-manager.ts", "src/lib/runtime-kernel/script-engine.ts"]
  },
  {
    subcategory: "Engine",
    capability_name: "Script-on-server bridge fallback",
    expected_filemaker_behavior: "Unsupported local steps can bridge to server script execution with result propagation.",
    typical_user_value: "Gradual migration from native script stacks to web runtime.",
    suggested_validation_test: "Script execution route tests for runtime fallback to /api/fm/scripts.",
    keywords: ["performScriptOnServer", "runScript", "source"],
    pathHints: ["components/browse-mode.tsx", "app/api/fm/scripts/route.ts"]
  },
  {
    subcategory: "Debugger",
    capability_name: "Script debugger stepping",
    expected_filemaker_behavior: "Debugger supports stepping and call-stack inspection in dev workflows.",
    typical_user_value: "Script troubleshooting is faster for complex automation.",
    suggested_validation_test: "Debug-step tests confirm deterministic advancement and state snapshots.",
    keywords: ["debug", "step", "script", "trace"],
    pathHints: ["components/browse-mode.tsx", "docs/script-engine-advanced.md"],
    uncertainty_level: "high"
  },
  {
    subcategory: "Debugger",
    capability_name: "Data Viewer current/watch panels",
    expected_filemaker_behavior: "Data Viewer displays current values and watch expressions in runtime context.",
    typical_user_value: "Developers can inspect variable and calc state without mutating data.",
    suggested_validation_test: "Data viewer tests for expression evaluation against current context.",
    keywords: ["Data Viewer", "watch", "expression", "variables"],
    pathHints: ["components/layout-mode.tsx", "docs/script-triggers.md"],
    uncertainty_level: "high"
  },
  {
    subcategory: "Integration",
    capability_name: "Menu and button action -> script routing",
    expected_filemaker_behavior: "UI actions route to configured scripts with parameters and context.",
    typical_user_value: "Interface interactions trigger expected business logic.",
    suggested_validation_test: "Action dispatch tests for button/menu commands with parameter passing.",
    keywords: ["runScript", "parameter", "onClick", "menu"],
    pathHints: ["components/browse-mode.tsx", "src/lib/app-layer-menu.test.mts"]
  },
  {
    subcategory: "Integration",
    capability_name: "Trigger history diagnostics",
    expected_filemaker_behavior: "Developers can see trigger firing order and outcomes in debug tools.",
    typical_user_value: "Root-cause analysis for complex script trigger behavior.",
    suggested_validation_test: "Debug snapshot tests include ordered trigger history and outcomes.",
    keywords: ["trigger history", "debugRuntime", "lastTrigger"],
    pathHints: ["components/browse-mode.tsx", "src/lib/triggers/triggers.test.mts"]
  },
  {
    subcategory: "Integration",
    capability_name: "Plugin-registered script step execution",
    expected_filemaker_behavior: "Plugin SDK can register custom script steps with validation and isolated failures.",
    typical_user_value: "Teams extend runtime behavior safely for enterprise integrations.",
    suggested_validation_test: "Plugin SDK tests for custom step registration and execution isolation.",
    keywords: ["registerScriptStep", "plugin", "executeScriptStep"],
    pathHints: ["src/plugins/manager.ts", "src/plugins/plugin-sdk.test.mts"]
  },
  {
    subcategory: "Integration",
    capability_name: "Script context stack alignment with windows",
    expected_filemaker_behavior: "Script context resolves active window/layout/record correctly in multi-window sessions.",
    typical_user_value: "Scripts behave predictably in card windows and multi-layout workflows.",
    suggested_validation_test: "Kernel tests for script context in focused and card windows.",
    keywords: ["window", "context", "script", "runtime kernel"],
    pathHints: ["src/lib/runtime-kernel/kernel.ts", "src/lib/runtime-kernel/context-stack.ts"]
  }
];

const dataRelationalSeeds: Seed[] = [
  {
    subcategory: "TO Context",
    capability_name: "Table occurrence context resolution",
    expected_filemaker_behavior: "Field references resolve via current TO or explicit TO::Field with deterministic fallback.",
    typical_user_value: "Related data access is predictable across layouts.",
    suggested_validation_test: "Context stack tests for explicit and implicit TO field references.",
    keywords: ["tableOccurrence", "resolveFieldRef", "context"],
    pathHints: ["src/lib/runtime-kernel/context-stack.ts", "components/browse-mode.tsx"]
  },
  {
    subcategory: "Relationships",
    capability_name: "Relationship traversal across files",
    expected_filemaker_behavior: "Cross-file relationships route reads/writes to correct database and layout context.",
    typical_user_value: "Multi-file solutions behave like single integrated systems.",
    suggested_validation_test: "Workspace-multifile integration tests for cross-file field and portal actions.",
    keywords: ["workspace", "multifile", "relationship", "fileId", "databaseName"],
    pathHints: ["src/server/workspace-multifile.ts", "src/server/filemaker-client.ts"],
    uncertainty_level: "low"
  },
  {
    subcategory: "Relationships",
    capability_name: "API layout mapping by TO",
    expected_filemaker_behavior: "Runtime can map each TO to writable layout context for Data API operations.",
    typical_user_value: "Writes do not fail due to wrong layout/table context.",
    suggested_validation_test: "Routing tests for missing and resolved apiLayoutsByTableOccurrence mappings.",
    keywords: ["apiLayout", "toIndex", "layoutIndex", "routing"],
    pathHints: ["src/server/workspace-context.ts", "src/server/workspace-multifile.ts"]
  },
  {
    subcategory: "Found Sets",
    capability_name: "Found set paging and index stability",
    expected_filemaker_behavior: "Large found sets support stable paging and current-record index semantics.",
    typical_user_value: "Users can navigate large datasets without losing context.",
    suggested_validation_test: "Found set store tests for goto index, refresh, and page transitions.",
    keywords: ["foundSet", "paging", "currentIndex", "recordIds"],
    pathHints: ["src/lib/runtime-kernel/foundset-store.ts", "src/lib/list-table-runtime.ts"]
  },
  {
    subcategory: "Found Sets",
    capability_name: "Sort/group/subsummary integration",
    expected_filemaker_behavior: "Sort and grouping specs drive grouped rows and summary outputs in list/table/preview.",
    typical_user_value: "Report-style analysis is available in runtime views.",
    suggested_validation_test: "Sort reporting tests for summary rows and grouped output stability.",
    keywords: ["sort", "group", "subsummary", "summary"],
    pathHints: ["src/lib/sort-reporting.ts", "src/lib/summary-engine.ts"]
  },
  {
    subcategory: "Portals",
    capability_name: "Portal row rendering as template controls",
    expected_filemaker_behavior: "Portal rows render placed field objects and preserve control styles.",
    typical_user_value: "Related data looks and behaves like native FileMaker portals.",
    suggested_validation_test: "Portal render tests ensuring no fallback grid overlays when template children exist.",
    keywords: ["portal", "row", "template", "portalData"],
    pathHints: ["components/browse-mode.tsx", "src/lib/portal-runtime.ts"],
    uncertainty_level: "low"
  },
  {
    subcategory: "Portals",
    capability_name: "Portal active row and delete rules",
    expected_filemaker_behavior: "Active row state and row delete actions obey portal setup and privileges.",
    typical_user_value: "Users can safely edit related records without accidental deletions.",
    suggested_validation_test: "Portal active-row selection and delete action tests with allow-delete toggles.",
    keywords: ["portalAllowDelete", "active row", "delete portal row"],
    pathHints: ["src/lib/portal-runtime.ts", "components/browse-mode.tsx"]
  },
  {
    subcategory: "Portals",
    capability_name: "Portal placeholder row create behavior",
    expected_filemaker_behavior: "When relationship allows creation, bottom portal placeholder row can create related records.",
    typical_user_value: "Quickly add related rows inline without extra dialogs.",
    suggested_validation_test: "Portal placeholder row create tests with allow-create true/false fixtures.",
    keywords: ["placeholder", "related", "create", "portal"],
    pathHints: ["components/browse-mode.tsx", "src/lib/portal-utils.ts"],
    uncertainty_level: "high"
  },
  {
    subcategory: "Portals",
    capability_name: "Portal row write target resolution",
    expected_filemaker_behavior: "Portal field writes resolve to correct related record id/mod id across parent navigation.",
    typical_user_value: "No disappearing portal edits or unresolved-row save errors.",
    suggested_validation_test: "Portal save regression tests across multiple parent records.",
    keywords: ["resolvePortalRelatedWriteTarget", "recordId", "modId", "1708", "102"],
    pathHints: ["src/lib/portal-runtime.ts", "components/browse-mode.tsx"],
    uncertainty_level: "low"
  },
  {
    subcategory: "Portals",
    capability_name: "Portal alternate/active row visual states",
    expected_filemaker_behavior: "Alternate row shading only appears when configured; active row state is explicit.",
    typical_user_value: "Portal readability and focus feedback are predictable.",
    suggested_validation_test: "Row visual state tests for alternate and active flags combinations.",
    keywords: ["alternate", "active", "portalUseAlternateRowState", "portalUseActiveRowState"],
    pathHints: ["src/lib/portal-runtime.ts", "components/layout-mode.tsx"]
  },
  {
    subcategory: "Repetition",
    capability_name: "Repeating field render/edit parity",
    expected_filemaker_behavior: "Repeating fields render and commit per repetition with stable binding.",
    typical_user_value: "Legacy repeating field layouts remain functional after import.",
    suggested_validation_test: "Repeating field binding tests for parse/update/commit paths.",
    keywords: ["repetition", "repeating", "repetitionsFrom", "repetitionsTo"],
    pathHints: ["src/lib/repeating-fields.ts", "components/browse-mode.tsx"]
  },
  {
    subcategory: "Containers",
    capability_name: "Container fetch/upload via secure proxy",
    expected_filemaker_behavior: "Container assets can be fetched and uploaded without exposing Data API auth to browser.",
    typical_user_value: "Image/PDF/file workflows remain secure and practical.",
    suggested_validation_test: "Container GET/POST route tests with host validation and upload success.",
    keywords: ["container", "fetchContainerAsset", "upload", "proxy"],
    pathHints: ["app/api/fm/container/route.ts", "app/api/fm/container/upload/route.ts"]
  },
  {
    subcategory: "Import",
    capability_name: "DDR import workspace and layout normalization",
    expected_filemaker_behavior: "DDR import creates normalized workspace/layout metadata ready for rendering and editing.",
    typical_user_value: "Existing FileMaker solutions can be onboarded quickly.",
    suggested_validation_test: "Import route tests with summary and direct DDR uploads, asserting workspace/layout artifacts.",
    keywords: ["importDdrToWorkspace", "Summary.xml", "workspace", "layout"],
    pathHints: ["scripts/import-ddr-layouts.mjs", "app/api/workspaces/import/route.ts"],
    uncertainty_level: "low"
  },
  {
    subcategory: "Import",
    capability_name: "Schema snapshot and diff tooling",
    expected_filemaker_behavior: "Developers can snapshot, diff, and assess schema changes across versions/files.",
    typical_user_value: "Change safety and release planning improve dramatically.",
    suggested_validation_test: "Dev tools tests for snapshot creation and diff result determinism.",
    keywords: ["schemaSnapshot", "schemaDiff", "impactAnalysis", "migrations"],
    pathHints: ["src/lib/schemaSnapshot", "src/lib/schemaDiff", "components/developer-tools-panel.tsx"]
  },
  {
    subcategory: "Import",
    capability_name: "Relationship graph visualization",
    expected_filemaker_behavior: "TO relationships can be explored visually, including cross-file edges.",
    typical_user_value: "Developers understand context and routing for complex schema networks.",
    suggested_validation_test: "Graph builder tests and developer tools UI filter/search interactions.",
    keywords: ["relationshipGraph", "nodes", "edges", "Developer Tools"],
    pathHints: ["src/lib/relationshipGraph/index.ts", "components/developer-tools-panel.tsx"]
  }
];

const securitySeeds: Seed[] = [
  {
    subcategory: "Auth",
    capability_name: "Session auth middleware and role context",
    expected_filemaker_behavior: "API requests derive authenticated user/role context before executing privileged actions.",
    typical_user_value: "Security posture is enforceable in enterprise deployments.",
    suggested_validation_test: "Request guard tests for authenticated and unauthenticated API calls.",
    keywords: ["middleware", "session", "roles", "guardApiRequest"],
    pathHints: ["middleware.ts", "src/server/security/request-context.ts"],
    uncertainty_level: "low"
  },
  {
    subcategory: "Auth",
    capability_name: "JWT and trusted-header auth modes",
    expected_filemaker_behavior: "Deployment can use trusted-header SSO or JWT modes without client secrets.",
    typical_user_value: "Flexible enterprise identity integration.",
    suggested_validation_test: "Security hardening tests for JWT validation and trusted-header mode.",
    keywords: ["jwt", "trusted-header", "auth mode", "validateJwt"],
    pathHints: ["src/server/security/jwt.ts", "src/server/security/middleware-auth.ts"]
  },
  {
    subcategory: "Auth",
    capability_name: "CSRF protection on mutating routes",
    expected_filemaker_behavior: "Mutating API calls require valid CSRF cookie/header pairs when enabled.",
    typical_user_value: "Reduced risk of cross-site mutation exploits.",
    suggested_validation_test: "CSRF mismatch tests return 403 with guidance.",
    keywords: ["csrf", "validateCsrfRequest", "headerName", "cookieName"],
    pathHints: ["src/server/security/csrf.ts", "src/server/security/request-context.ts"]
  },
  {
    subcategory: "Auth",
    capability_name: "Rate limiting and retry guidance",
    expected_filemaker_behavior: "Request bursts are controlled and users receive retry guidance when throttled.",
    typical_user_value: "Better resilience and predictable behavior under load.",
    suggested_validation_test: "Middleware rate-limit tests for 429 responses and retry-after headers.",
    keywords: ["rate limit", "429", "retry", "windowMs"],
    pathHints: ["src/server/security/rate-limit.ts", "middleware.ts"]
  },
  {
    subcategory: "Authorization",
    capability_name: "Route-level action authorization",
    expected_filemaker_behavior: "Every API route validates role permission for requested action.",
    typical_user_value: "Dangerous operations cannot be executed by unauthorized users.",
    suggested_validation_test: "Authorization denial tests for restricted actions.",
    keywords: ["canPerformAction", "authorization", "forbidden"],
    pathHints: ["src/server/security/authorization.ts", "src/server/security/request-context.ts"]
  },
  {
    subcategory: "Authorization",
    capability_name: "Runtime capability gating (layout/field/portal)",
    expected_filemaker_behavior: "UI actions respect role-based runtime permissions for view/edit/delete operations.",
    typical_user_value: "Users only see actions they are allowed to perform.",
    suggested_validation_test: "Runtime capability tests for read-only and hidden field scenarios.",
    keywords: ["runtimeCapabilities", "canEdit", "canView", "role"],
    pathHints: ["src/lib/runtime-capabilities.ts", "components/browse-mode.tsx"]
  },
  {
    subcategory: "Audit",
    capability_name: "Structured audit logging for critical actions",
    expected_filemaker_behavior: "Login, CRUD, script, routing, and management actions emit audit events.",
    typical_user_value: "Compliance and troubleshooting support.",
    suggested_validation_test: "Audit log tests for event append and query filtering.",
    keywords: ["appendAuditEvent", "audit", "eventType", "status"],
    pathHints: ["src/server/audit-log.ts", "app/api/admin/audit/route.ts"]
  },
  {
    subcategory: "Audit",
    capability_name: "Admin diagnostics and metrics endpoints",
    expected_filemaker_behavior: "Admin users can inspect health, metrics, and active diagnostics safely.",
    typical_user_value: "Operations visibility without direct server shell access.",
    suggested_validation_test: "Admin endpoint role checks and payload schema tests.",
    keywords: ["admin", "metrics", "console", "health"],
    pathHints: ["app/api/admin/console/route.ts", "src/server/admin-console.ts"]
  },
  {
    subcategory: "Data Safety",
    capability_name: "Container URL host validation",
    expected_filemaker_behavior: "Container fetch route rejects external host URLs to avoid leakage and SSRF risk.",
    typical_user_value: "Secure container access patterns in hosted environments.",
    suggested_validation_test: "Container route tests for host mismatch rejection.",
    keywords: ["Container URL", "host", "resolveContainerUrl"],
    pathHints: ["src/server/filemaker-client.ts", "app/api/fm/container/route.ts"]
  },
  {
    subcategory: "Governance",
    capability_name: "RBAC enforcement for governance endpoints",
    expected_filemaker_behavior: "Versioning, promote, rollback, and admin workflows are role-restricted.",
    typical_user_value: "Enterprise governance controls are enforceable.",
    suggested_validation_test: "Governance tests for admin/developer/runtime role access differences.",
    keywords: ["governance", "rbac", "versioning", "promote"],
    pathHints: ["src/lib/governance-rbac.ts", "app/api/workspaces/[workspaceId]/governance/route.ts"]
  }
];

const performanceSeeds: Seed[] = [
  {
    subcategory: "Found Sets",
    capability_name: "Found set paging for large datasets",
    expected_filemaker_behavior: "Large found sets avoid full in-memory ids and support page-based navigation.",
    typical_user_value: "Responsive navigation on enterprise-scale datasets.",
    suggested_validation_test: "Found set paging benchmarks with synthetic 100k scenarios.",
    keywords: ["paging", "found set", "100k", "page"],
    pathHints: ["src/lib/runtime-kernel/foundset-store.ts", "scripts/bench-perf.mts"]
  },
  {
    subcategory: "Rendering",
    capability_name: "List/table virtualization",
    expected_filemaker_behavior: "List and table rendering use virtualization for large record sets.",
    typical_user_value: "Smooth scrolling and lower memory pressure.",
    suggested_validation_test: "Virtual window tests for visible range correctness.",
    keywords: ["virtual", "window", "overscan", "table"],
    pathHints: ["src/lib/performance/virtual-window.ts", "components/browse-mode.tsx"]
  },
  {
    subcategory: "Rendering",
    capability_name: "Portal virtualization",
    expected_filemaker_behavior: "Portal rows are incrementally rendered/paged for large related sets.",
    typical_user_value: "Usable portals with thousands of related records.",
    suggested_validation_test: "Portal benchmark tests with high row counts and edit interactions.",
    keywords: ["portal", "virtual", "row", "scroll"],
    pathHints: ["components/browse-mode.tsx", "src/lib/performance/virtual-window.ts"]
  },
  {
    subcategory: "Data Access",
    capability_name: "Request caching and in-flight dedupe",
    expected_filemaker_behavior: "Repeated identical read requests share cache/in-flight promises.",
    typical_user_value: "Reduced server load and faster UI response.",
    suggested_validation_test: "Request cache tests validating hits/misses and coalescing.",
    keywords: ["request cache", "hits", "misses", "inflight"],
    pathHints: ["src/server/performance/request-cache.ts", "src/server/filemaker-client.ts"]
  },
  {
    subcategory: "Data Access",
    capability_name: "Retry/backoff and circuit-breaker behavior",
    expected_filemaker_behavior: "Transient Data API failures are retried with bounded backoff and circuit state tracking.",
    typical_user_value: "Reduced user-visible failures during temporary backend issues.",
    suggested_validation_test: "Circuit breaker and retry unit tests with transient error simulation.",
    keywords: ["retry", "backoff", "circuit", "429", "503"],
    pathHints: ["src/server/resilience/circuit-breaker.ts", "src/server/filemaker-client.ts"]
  },
  {
    subcategory: "Calc",
    capability_name: "FMCalc dependency-aware caching",
    expected_filemaker_behavior: "Calc evaluations are bounded and re-evaluated only when dependencies change.",
    typical_user_value: "Dynamic UI remains responsive on dense layouts.",
    suggested_validation_test: "Calc evaluation count tests after unrelated field edits.",
    keywords: ["fmcalc", "dependency", "evaluate", "cache"],
    pathHints: ["src/lib/fmcalc/index.ts", "components/browse-mode.tsx"]
  },
  {
    subcategory: "Script",
    capability_name: "Script execution overhead control",
    expected_filemaker_behavior: "Script runtime avoids unnecessary context rebuilds and reports step timing.",
    typical_user_value: "Automation remains performant at scale.",
    suggested_validation_test: "Advanced script tests and perf metrics validation.",
    keywords: ["script", "stepTrace", "timing", "runId"],
    pathHints: ["src/lib/runtime-kernel/script-engine.ts", "components/browse-mode.tsx"]
  },
  {
    subcategory: "Observability",
    capability_name: "Profiler and trace-id diagnostics",
    expected_filemaker_behavior: "Developers can correlate UI actions with API and runtime metrics.",
    typical_user_value: "Faster performance troubleshooting.",
    suggested_validation_test: "Profiler output schema tests and trace-id propagation checks.",
    keywords: ["profiler", "trace", "correlation", "metrics"],
    pathHints: ["scripts/bench-perf.mts", "src/server/observability.ts"]
  },
  {
    subcategory: "Benchmarks",
    capability_name: "Deterministic benchmark harness",
    expected_filemaker_behavior: "Performance benchmarks are repeatable and can gate CI regressions.",
    typical_user_value: "Teams can prevent accidental performance regressions.",
    suggested_validation_test: "Benchmark script deterministic output checks.",
    keywords: ["bench", "performance", "budget", "threshold"],
    pathHints: ["scripts/bench-perf.mts", "docs/performance-benchmarks.md"]
  },
  {
    subcategory: "Memory",
    capability_name: "Bounded cache and trace memory usage",
    expected_filemaker_behavior: "Long sessions should avoid unbounded growth in cache and diagnostics buffers.",
    typical_user_value: "Stable runtime for all-day usage.",
    suggested_validation_test: "Stress tests with cache eviction assertions.",
    keywords: ["maxEntries", "ttl", "evictions", "buffer"],
    pathHints: ["src/server/performance/request-cache.ts", "components/browse-mode.tsx"]
  }
];

const developerExperienceSeeds: Seed[] = [
  {
    subcategory: "Tooling",
    capability_name: "Developer tools hub parity",
    expected_filemaker_behavior: "Developers can access schema snapshots, diffs, impacts, and migrations in one place.",
    typical_user_value: "Faster change analysis and safer schema evolution.",
    suggested_validation_test: "Dev tools API and panel tests for snapshot->diff->impact workflows.",
    keywords: ["Developer Tools", "snapshot", "diff", "migration"],
    pathHints: ["components/developer-tools-panel.tsx", "app/api/workspaces/[workspaceId]/developer-tools/route.ts"]
  },
  {
    subcategory: "Tooling",
    capability_name: "Migration plan generation and apply",
    expected_filemaker_behavior: "Schema diffs can become ordered migration plans with safety metadata.",
    typical_user_value: "Schema change execution is predictable and auditable.",
    suggested_validation_test: "Migration generate/apply unit tests with reversible and destructive flags.",
    keywords: ["migrations", "generate", "apply", "allowDestructive"],
    pathHints: ["src/lib/migrations/generate.ts", "src/lib/migrations/apply.ts"]
  },
  {
    subcategory: "Tooling",
    capability_name: "Impact analysis across layouts/scripts/value lists",
    expected_filemaker_behavior: "Change impact reports identify broken references and affected artifacts.",
    typical_user_value: "Developers know what will break before applying schema changes.",
    suggested_validation_test: "Impact analysis tests for deleted field references.",
    keywords: ["impact", "affected", "references"],
    pathHints: ["src/lib/impactAnalysis/index.ts", "src/lib/dev-tools.test.mts"]
  },
  {
    subcategory: "Tooling",
    capability_name: "Schema snapshot determinism",
    expected_filemaker_behavior: "Snapshots are stable and comparable across runs.",
    typical_user_value: "Diff results are trustworthy and noise-free.",
    suggested_validation_test: "Snapshot normalization tests with stable ordering assertions.",
    keywords: ["schemaSnapshot", "normalize", "deterministic"],
    pathHints: ["src/lib/schemaSnapshot/normalize.ts", "src/lib/dev-tools.test.mts"]
  },
  {
    subcategory: "App Layer",
    capability_name: "Manage menu capability gating",
    expected_filemaker_behavior: "Manage/app-layer items are implemented, partial, or disabled with rationale and docs links.",
    typical_user_value: "Developers know exactly what is supported and why.",
    suggested_validation_test: "App-layer capability tests for enabled/disabled behavior and rationale modal.",
    keywords: ["appLayerCapabilities", "Manage", "disabled", "rationale"],
    pathHints: ["src/config/appLayerCapabilities.ts", "components/layout-mode.tsx"]
  },
  {
    subcategory: "App Layer",
    capability_name: "Manager dialogs workspace/file context",
    expected_filemaker_behavior: "Manager screens include context selectors for multi-file workspaces.",
    typical_user_value: "Edits target intended file and context reliably.",
    suggested_validation_test: "Manager screen tests for file selector state changes.",
    keywords: ["manageCenter", "selectedFile", "workspace"],
    pathHints: ["components/layout-mode.tsx", "src/server/app-layer-storage.ts"]
  },
  {
    subcategory: "App Layer",
    capability_name: "Unsaved changes protection in app-layer dialogs",
    expected_filemaker_behavior: "Closing dirty dialogs prompts user before discarding changes.",
    typical_user_value: "Prevents accidental configuration loss.",
    suggested_validation_test: "Dialog close interception tests with dirty state.",
    keywords: ["unsaved", "confirm", "dirty", "cancel"],
    pathHints: ["components/layout-mode.tsx", "components/browse-mode.tsx"]
  },
  {
    subcategory: "Quality",
    capability_name: "UI regression suite for high-risk parity flows",
    expected_filemaker_behavior: "Key UI flows are covered by regression tests to prevent repeated break/fix cycles.",
    typical_user_value: "Higher confidence when iterating on portals, modes, and controls.",
    suggested_validation_test: "Run test:ui-regression with portal + mode-switch + menu-action fixtures.",
    keywords: ["test:ui-regression", "portal", "menu-actions"],
    pathHints: ["package.json", "src/lib/menu-action-coverage.test.mts"]
  },
  {
    subcategory: "Quality",
    capability_name: "Layout fidelity harness and baseline update flow",
    expected_filemaker_behavior: "Visual fidelity regressions are detected with screenshot baselines and metric reports.",
    typical_user_value: "Rendering changes are measurable and trackable over time.",
    suggested_validation_test: "Run test:layout-fidelity and baseline update scripts with fixture manifest.",
    keywords: ["layout-fidelity", "baselines", "screenshot", "manifest"],
    pathHints: ["scripts/layout-fidelity.mts", "docs/layout-fidelity-fixtures.json"]
  },
  {
    subcategory: "Quality",
    capability_name: "Parity checklist generation in CI",
    expected_filemaker_behavior: "CI outputs parity status summaries for key domains before release.",
    typical_user_value: "Release decisions are informed by objective parity evidence.",
    suggested_validation_test: "CI workflow test to assert parity checklist files generated and non-empty.",
    keywords: ["checklist", "ci", "parity", "summary"],
    pathHints: [".github/workflows/ci.yml", "docs/runtime-gap-report.md"],
    uncertainty_level: "high"
  }
];

export const parityTaxonomy: ParityTaxonomyItem[] = [
  ...buildCategory("LM", "Layout Mode", layoutModeSeeds),
  ...buildCategory("BM", "Browse Mode", browseModeSeeds),
  ...buildCategory("SC", "Scripting & Events", scriptingSeeds),
  ...buildCategory("DR", "Data & Relational", dataRelationalSeeds),
  ...buildCategory("SE", "Security", securitySeeds),
  ...buildCategory("PF", "Performance", performanceSeeds),
  ...buildCategory("DX", "Developer Experience", developerExperienceSeeds)
].sort((a, b) => a.id.localeCompare(b.id));

export function getParityTaxonomy(): ParityTaxonomyItem[] {
  return parityTaxonomy;
}

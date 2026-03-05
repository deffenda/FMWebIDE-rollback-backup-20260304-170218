import type { NativeParityScenario } from "./types.mts";

const LAYOUT = "Asset Details";
const FIRST_EDITABLE =
  ".runtime-canvas-wrap input:not([type='hidden']):not([disabled]), .runtime-canvas-wrap textarea:not([disabled]), .runtime-canvas-wrap select:not([disabled])";

export const browseRecordLifecycleScenarios: NativeParityScenario[] = [
  {
    id: "SCN-001",
    title: "Create record and commit through status action",
    group: "browse-record-lifecycle",
    requiredLayouts: [LAYOUT],
    prerequisites: { mode: "browse", layoutName: LAYOUT },
    steps: [
      { action: "click", selector: ".fm-status-main button:has-text('New Record')", description: "Create a new record", optional: true },
      { action: "fillFirstEditable", value: "UI parity record create", description: "Enter field data" },
      { action: "click", selector: ".fm-status-main button:has-text('Save')", description: "Commit record", optional: true }
    ],
    expectedInvariants: ["assertModeHook", "assertDirtyStatePill", "assertRecordNavigatorInputVisible"],
    smoke: true
  },
  {
    id: "SCN-002",
    title: "Edit multiple fields then commit by leaving field",
    group: "browse-record-lifecycle",
    requiredLayouts: [LAYOUT],
    prerequisites: { mode: "browse", layoutName: LAYOUT },
    steps: [
      { action: "fillFirstEditable", value: "Edit A", description: "Edit first field" },
      { action: "press", key: "Tab", description: "Move to next field" },
      { action: "fill", selector: FIRST_EDITABLE, value: "Edit B", description: "Edit active field", optional: true },
      { action: "click", selector: ".fm-status-main", description: "Blur out of field to commit" }
    ],
    expectedInvariants: ["assertFocusOnFirstEditableField", "assertDirtyStatePill"],
    smoke: true
  },
  {
    id: "SCN-003",
    title: "Edit then cancel to revert dirty state",
    group: "browse-record-lifecycle",
    requiredLayouts: [LAYOUT],
    prerequisites: { mode: "browse", layoutName: LAYOUT },
    steps: [
      { action: "fillFirstEditable", value: "Revert me", description: "Edit a field" },
      { action: "click", selector: ".fm-status-main button:has-text('Cancel')", description: "Revert record edits", optional: true }
    ],
    expectedInvariants: ["assertDirtyStatePill"],
    smoke: true
  },
  {
    id: "SCN-004",
    title: "Duplicate current record from Records menu",
    group: "browse-record-lifecycle",
    requiredLayouts: [LAYOUT],
    prerequisites: { mode: "browse", layoutName: LAYOUT },
    steps: [
      { action: "click", selector: ".fm-layout-menubar .fm-layout-menubar-button:has-text('Records')", description: "Open Records menu" },
      { action: "click", selector: ".fm-view-menu button:has-text('Duplicate Record')", description: "Duplicate current record", optional: true }
    ],
    expectedInvariants: ["assertRecordNavigatorInputVisible", "assertStatusToolbarVisible"],
    smoke: false
  },
  {
    id: "SCN-005",
    title: "Delete record with confirmation flow",
    group: "browse-record-lifecycle",
    requiredLayouts: [LAYOUT],
    prerequisites: { mode: "browse", layoutName: LAYOUT },
    steps: [
      { action: "click", selector: ".fm-layout-menubar .fm-layout-menubar-button:has-text('Records')", description: "Open Records menu" },
      { action: "click", selector: ".fm-view-menu button:has-text('Delete Record')", description: "Start delete action", optional: true }
    ],
    expectedInvariants: ["assertStatusToolbarVisible", "assertRecordNavigatorInputVisible"],
    smoke: false
  },
  {
    id: "SCN-006",
    title: "Validation error blocks commit and preserves focus",
    group: "browse-record-lifecycle",
    requiredLayouts: [LAYOUT],
    prerequisites: { mode: "browse", layoutName: LAYOUT },
    steps: [
      { action: "fillFirstEditable", value: "", description: "Clear required field where possible" },
      { action: "click", selector: ".fm-status-main button:has-text('Save')", description: "Attempt commit", optional: true }
    ],
    expectedInvariants: ["assertFocusOnFirstEditableField", "assertDirtyStatePill"],
    smoke: false
  },
  {
    id: "SCN-007",
    title: "Navigate next record after edits and verify commit/prompt behavior",
    group: "browse-record-lifecycle",
    requiredLayouts: [LAYOUT],
    prerequisites: { mode: "browse", layoutName: LAYOUT },
    steps: [
      { action: "fillFirstEditable", value: "Navigate after edit", description: "Make a pending edit" },
      { action: "click", selector: "button[aria-label='Next record']", description: "Move to next record", optional: true }
    ],
    expectedInvariants: ["assertDirtyStatePill", "assertRecordNavigatorInputVisible"],
    smoke: true
  },
  {
    id: "SCN-008",
    title: "Show all records resets constrained/filtered set",
    group: "browse-record-lifecycle",
    requiredLayouts: [LAYOUT],
    prerequisites: { mode: "browse", layoutName: LAYOUT },
    steps: [{ action: "click", selector: ".fm-status-main button:has-text('Show All')", description: "Reset found set", optional: true }],
    expectedInvariants: ["assertStatusToolbarVisible", "assertRecordNavigatorInputVisible"],
    smoke: true
  }
];

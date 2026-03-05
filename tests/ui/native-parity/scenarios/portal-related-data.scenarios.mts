import type { NativeParityScenario } from "./types.mts";

const LAYOUT = "Asset Details";
const PORTAL_EDITABLE =
  ".runtime-portal-wrap .runtime-portal-input:not([disabled]), .runtime-portal-wrap input:not([disabled]), .runtime-portal-wrap textarea:not([disabled]), .runtime-portal-wrap select:not([disabled])";

export const portalRelatedDataScenarios: NativeParityScenario[] = [
  {
    id: "SCN-014",
    title: "Edit existing portal row and commit",
    group: "portal-related-data",
    requiredLayouts: [LAYOUT],
    prerequisites: { mode: "browse", layoutName: LAYOUT },
    steps: [
      { action: "fill", selector: PORTAL_EDITABLE, value: "portal edit", description: "Edit first portal row field", optional: true },
      { action: "click", selector: ".fm-status-main button:has-text('Save')", description: "Commit portal edits", optional: true }
    ],
    expectedInvariants: ["assertDirtyStatePill", "assertStatusToolbarVisible"],
    smoke: true
  },
  {
    id: "SCN-015",
    title: "Add related portal row with placeholder row pattern",
    group: "portal-related-data",
    requiredLayouts: [LAYOUT],
    prerequisites: { mode: "browse", layoutName: LAYOUT },
    steps: [{ action: "fill", selector: PORTAL_EDITABLE, value: "new related row", description: "Populate placeholder row fields", optional: true }],
    expectedInvariants: ["assertStatusToolbarVisible", "assertModeHook"],
    smoke: false
  },
  {
    id: "SCN-016",
    title: "Delete portal row with confirmation",
    group: "portal-related-data",
    requiredLayouts: [LAYOUT],
    prerequisites: { mode: "browse", layoutName: LAYOUT },
    steps: [{ action: "click", selector: ".runtime-portal-wrap button:has-text('Delete')", description: "Delete selected portal row", optional: true }],
    expectedInvariants: ["assertStatusToolbarVisible", "assertRecordNavigatorInputVisible"],
    smoke: false
  },
  {
    id: "SCN-017",
    title: "Portal scroll keeps edited row values bound",
    group: "portal-related-data",
    requiredLayouts: [LAYOUT],
    prerequisites: { mode: "browse", layoutName: LAYOUT },
    steps: [
      { action: "fill", selector: PORTAL_EDITABLE, value: "scroll preserve", description: "Edit portal field", optional: true },
      { action: "press", key: "PageDown", description: "Scroll within viewport", optional: true },
      { action: "press", key: "PageUp", description: "Scroll back", optional: true }
    ],
    expectedInvariants: ["assertStatusToolbarVisible", "assertModeHook"],
    smoke: true
  },
  {
    id: "SCN-018",
    title: "Portal sort or filter does not lose dirty row edits",
    group: "portal-related-data",
    requiredLayouts: [LAYOUT],
    prerequisites: { mode: "browse", layoutName: LAYOUT },
    steps: [
      { action: "fill", selector: PORTAL_EDITABLE, value: "pending portal sort", description: "Create dirty portal state", optional: true },
      { action: "click", selector: ".runtime-portal-wrap [data-portal-sort]", description: "Invoke portal sort/filter", optional: true }
    ],
    expectedInvariants: ["assertDirtyStatePill", "assertStatusToolbarVisible"],
    smoke: false
  },
  {
    id: "SCN-019",
    title: "Portal row validation shows inline error safely",
    group: "portal-related-data",
    requiredLayouts: [LAYOUT],
    prerequisites: { mode: "browse", layoutName: LAYOUT },
    steps: [
      { action: "fill", selector: PORTAL_EDITABLE, value: "", description: "Enter invalid portal data", optional: true },
      { action: "click", selector: ".fm-status-main button:has-text('Save')", description: "Attempt commit", optional: true }
    ],
    expectedInvariants: ["assertStatusToolbarVisible", "assertModeHook"],
    smoke: false
  },
  {
    id: "SCN-020",
    title: "Dirty portal row prompts when navigating layouts",
    group: "portal-related-data",
    requiredLayouts: [LAYOUT],
    prerequisites: { mode: "browse", layoutName: LAYOUT },
    steps: [
      { action: "fill", selector: PORTAL_EDITABLE, value: "dirty portal nav", description: "Create portal dirty state", optional: true },
      { action: "click", selector: ".fm-layout-menubar .fm-layout-menubar-button:has-text('Layouts')", description: "Open Layouts menu" },
      { action: "click", selector: ".fm-view-menu button:has-text('Go to Layout')", description: "Navigate while dirty", optional: true }
    ],
    expectedInvariants: ["assertStatusToolbarVisible", "assertModeHook"],
    smoke: true
  }
];

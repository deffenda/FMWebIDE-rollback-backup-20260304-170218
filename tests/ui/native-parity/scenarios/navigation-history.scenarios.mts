import type { NativeParityScenario } from "./types.mts";

const LAYOUT = "Asset Details";

export const navigationHistoryScenarios: NativeParityScenario[] = [
  {
    id: "SCN-024",
    title: "Go to layout via menu and return context",
    group: "navigation-history",
    requiredLayouts: [LAYOUT],
    prerequisites: { mode: "browse", layoutName: LAYOUT },
    steps: [
      { action: "click", selector: ".fm-layout-menubar .fm-layout-menubar-button:has-text('Layouts')", description: "Open Layouts menu" },
      { action: "click", selector: ".fm-view-menu button:has-text('Go to Layout')", description: "Use layout chooser", optional: true }
    ],
    expectedInvariants: ["assertModeHook", "assertRecordNavigatorInputVisible"],
    smoke: true
  },
  {
    id: "SCN-025",
    title: "Back/forward history restores browse context",
    group: "navigation-history",
    requiredLayouts: [LAYOUT],
    prerequisites: { mode: "browse", layoutName: LAYOUT },
    steps: [
      { action: "switchView", value: "List", description: "Switch to list view", optional: true },
      { action: "press", key: "Alt+Left", description: "History back", optional: true },
      { action: "press", key: "Alt+Right", description: "History forward", optional: true }
    ],
    expectedInvariants: ["assertModeHook", "assertStatusToolbarVisible"],
    smoke: true
  }
];

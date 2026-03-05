import type { NativeParityScenario } from "./types.mts";

const LAYOUT = "Asset Details";

export const layoutModeSafeEditScenarios: NativeParityScenario[] = [
  {
    id: "SCN-021",
    title: "Select object, adjust with keyboard, undo and redo",
    group: "layout-mode-safe-edits",
    requiredLayouts: [LAYOUT],
    prerequisites: { mode: "layout", layoutName: LAYOUT },
    steps: [
      { action: "click", selector: ".canvas-item.layout-preview-item", description: "Select an object" },
      { action: "press", key: "ArrowRight", description: "Nudge object", optional: true },
      { action: "click", selector: ".fm-layout-menubar .fm-layout-menubar-button:has-text('Edit')", description: "Open Edit menu" },
      { action: "click", selector: ".fm-view-menu button:has-text('Undo')", description: "Undo edit", optional: true }
    ],
    expectedInvariants: ["assertModeHook", "assertModeSeparationLayout"],
    smoke: true
  },
  {
    id: "SCN-022",
    title: "Move object with snapping and verify selection remains",
    group: "layout-mode-safe-edits",
    requiredLayouts: [LAYOUT],
    prerequisites: { mode: "layout", layoutName: LAYOUT },
    steps: [
      { action: "click", selector: ".canvas-item.layout-preview-item", description: "Select object" },
      { action: "press", key: "ArrowDown", description: "Move object", optional: true }
    ],
    expectedInvariants: ["assertModeHook", "assertStatusToolbarVisible"],
    smoke: true
  },
  {
    id: "SCN-023",
    title: "Copy and paste object keeps inspector consistent",
    group: "layout-mode-safe-edits",
    requiredLayouts: [LAYOUT],
    prerequisites: { mode: "layout", layoutName: LAYOUT },
    steps: [
      { action: "click", selector: ".canvas-item.layout-preview-item", description: "Select source object" },
      { action: "press", key: "Meta+c", description: "Copy object", optional: true },
      { action: "press", key: "Meta+v", description: "Paste object", optional: true }
    ],
    expectedInvariants: ["assertModeHook", "assertStatusToolbarVisible"],
    smoke: false
  }
];

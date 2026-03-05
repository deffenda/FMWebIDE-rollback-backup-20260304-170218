import type { NativeParityScenario } from "./types.mts";

const LAYOUT = "Asset Details";

export const findModeQueryScenarios: NativeParityScenario[] = [
  {
    id: "SCN-009",
    title: "Enter find mode and perform find",
    group: "find-mode-query",
    requiredLayouts: [LAYOUT],
    prerequisites: { mode: "browse", layoutName: LAYOUT },
    steps: [
      { action: "enterFindMode", description: "Switch to Find mode" },
      { action: "fillFirstEditable", value: "test", description: "Enter criteria" },
      { action: "click", selector: ".fm-status-main button:has-text('Perform Find')", description: "Run find", optional: true }
    ],
    expectedInvariants: ["assertFindModeActive", "assertStatusToolbarVisible"],
    smoke: true
  },
  {
    id: "SCN-010",
    title: "Cancel find mode and return to browse mode",
    group: "find-mode-query",
    requiredLayouts: [LAYOUT],
    prerequisites: { mode: "browse", layoutName: LAYOUT },
    steps: [
      { action: "enterFindMode", description: "Switch to Find mode" },
      { action: "click", selector: ".fm-status-main button:has-text('Cancel Find')", description: "Cancel find", optional: true }
    ],
    expectedInvariants: ["assertStatusToolbarVisible", "assertRecordNavigatorInputVisible"],
    smoke: true
  },
  {
    id: "SCN-011",
    title: "Find with no results flow stays stable",
    group: "find-mode-query",
    requiredLayouts: [LAYOUT],
    prerequisites: { mode: "browse", layoutName: LAYOUT },
    steps: [
      { action: "enterFindMode", description: "Switch to Find mode" },
      { action: "fillFirstEditable", value: "___unlikely_no_results___", description: "Enter no-match criteria" },
      { action: "click", selector: ".fm-status-main button:has-text('Perform Find')", description: "Perform no-result find", optional: true }
    ],
    expectedInvariants: ["assertStatusToolbarVisible", "assertModeHook"],
    smoke: false
  },
  {
    id: "SCN-012",
    title: "Modify find criteria from found set actions",
    group: "find-mode-query",
    requiredLayouts: [LAYOUT],
    prerequisites: { mode: "browse", layoutName: LAYOUT },
    steps: [{ action: "click", selector: ".fm-status-main button:has-text('Modify Find')", description: "Open modify find", optional: true }],
    expectedInvariants: ["assertStatusToolbarVisible", "assertModeHook"],
    smoke: false
  },
  {
    id: "SCN-013",
    title: "Sort after find request flow",
    group: "find-mode-query",
    requiredLayouts: [LAYOUT],
    prerequisites: { mode: "browse", layoutName: LAYOUT },
    steps: [
      { action: "click", selector: ".fm-layout-menubar .fm-layout-menubar-button:has-text('Records')", description: "Open Records menu" },
      { action: "click", selector: ".fm-view-menu button:has-text('Sort Records')", description: "Apply sort", optional: true }
    ],
    expectedInvariants: ["assertStatusToolbarVisible", "assertRecordNavigatorInputVisible"],
    smoke: false
  }
];

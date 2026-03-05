export type ParityCoverageMapEntry = {
  parityTaxonomyId: string;
  testTitlePatterns: string[];
  scenarioIds: string[];
  invariants: string[];
};

export const parityCoverageMap: ParityCoverageMapEntry[] = [
  {
    parityTaxonomyId: "BM-001",
    testTitlePatterns: ["browse view switch form/list/table", "preview toggle shows preview controls"],
    scenarioIds: ["SCN-009", "SCN-010", "SCN-024"],
    invariants: ["assertModeHook", "assertViewTabSelected", "assertPreviewModeActive"]
  },
  {
    parityTaxonomyId: "BM-002",
    testTitlePatterns: ["record navigator invariant", "click-everything command harness"],
    scenarioIds: ["SCN-007", "SCN-008"],
    invariants: ["assertRecordNavigatorInputVisible"]
  },
  {
    parityTaxonomyId: "BM-003",
    testTitlePatterns: ["enter find mode and show find controls"],
    scenarioIds: ["SCN-009", "SCN-011", "SCN-012"],
    invariants: ["assertFindModeActive"]
  },
  {
    parityTaxonomyId: "BM-004",
    testTitlePatterns: ["enter find mode and show find controls", "top menu coverage in browse mode"],
    scenarioIds: ["SCN-008", "SCN-013"],
    invariants: ["assertStatusToolbarVisible"]
  },
  {
    parityTaxonomyId: "BM-007",
    testTitlePatterns: ["dirty-state invariant", "commit invariant", "revert invariant"],
    scenarioIds: ["SCN-001", "SCN-002", "SCN-003", "SCN-007"],
    invariants: ["assertDirtyStatePill"]
  },
  {
    parityTaxonomyId: "BM-011",
    testTitlePatterns: ["browse view switch form/list/table"],
    scenarioIds: ["SCN-025"],
    invariants: ["assertViewTabSelected"]
  },
  {
    parityTaxonomyId: "BM-012",
    testTitlePatterns: ["browse view switch form/list/table", "top menu coverage in browse mode"],
    scenarioIds: ["SCN-013", "SCN-025"],
    invariants: ["assertStatusToolbarVisible"]
  },
  {
    parityTaxonomyId: "BM-014",
    testTitlePatterns: ["preview toggle shows preview controls"],
    scenarioIds: ["SCN-024"],
    invariants: ["assertPreviewModeActive", "assertRecordNavigatorInputVisible"]
  },
  {
    parityTaxonomyId: "BM-015",
    testTitlePatterns: ["focus invariant", "keyboard focus edge case"],
    scenarioIds: ["SCN-002"],
    invariants: ["assertFocusOnFirstEditableField"]
  },
  {
    parityTaxonomyId: "BM-016",
    testTitlePatterns: ["value list edge case", "date control edge case"],
    scenarioIds: ["SCN-014", "SCN-017"],
    invariants: ["assertStatusToolbarVisible"]
  },
  {
    parityTaxonomyId: "BM-017",
    testTitlePatterns: ["portal edge case: first portal input can be focused"],
    scenarioIds: ["SCN-014", "SCN-015", "SCN-017", "SCN-020"],
    invariants: ["assertStatusToolbarVisible"]
  },
  {
    parityTaxonomyId: "BM-019",
    testTitlePatterns: ["top menu coverage in browse mode"],
    scenarioIds: ["SCN-024", "SCN-025"],
    invariants: ["assertStatusToolbarVisible", "assertModeHook"]
  },
  {
    parityTaxonomyId: "LM-001",
    testTitlePatterns: ["single-select invariant", "multi-select with shift"],
    scenarioIds: ["SCN-021", "SCN-022"],
    invariants: ["assertModeHook", "assertModeSeparationLayout"]
  },
  {
    parityTaxonomyId: "LM-003",
    testTitlePatterns: ["layout undo/redo smoke"],
    scenarioIds: ["SCN-021"],
    invariants: ["assertModeHook"]
  },
  {
    parityTaxonomyId: "LM-004",
    testTitlePatterns: ["layout object multi-select with shift"],
    scenarioIds: ["SCN-021", "SCN-022"],
    invariants: ["assertModeHook"]
  },
  {
    parityTaxonomyId: "LM-009",
    testTitlePatterns: ["layout mode status area and mode-separation invariants"],
    scenarioIds: ["SCN-021", "SCN-022"],
    invariants: ["assertStatusToolbarVisible"]
  },
  {
    parityTaxonomyId: "LM-012",
    testTitlePatterns: ["layout mode top menubar file menu opens", "layout mode top menubar view menu opens"],
    scenarioIds: ["SCN-023"],
    invariants: ["assertTopMenuOpen", "assertModeHook"]
  },
  {
    parityTaxonomyId: "LM-016",
    testTitlePatterns: ["layout object coverage iteration across visible nodes"],
    scenarioIds: ["SCN-021", "SCN-022"],
    invariants: ["assertModeHook"]
  },
  {
    parityTaxonomyId: "LM-019",
    testTitlePatterns: ["layout mode installs uiTest hook"],
    scenarioIds: ["SCN-023"],
    invariants: ["assertLayoutIdHook", "assertModeHook"]
  },
  {
    parityTaxonomyId: "DR-001",
    testTitlePatterns: ["portal edge case: first portal input can be focused"],
    scenarioIds: ["SCN-014", "SCN-015", "SCN-017"],
    invariants: ["assertStatusToolbarVisible"]
  },
  {
    parityTaxonomyId: "DR-002",
    testTitlePatterns: ["portal edge case: first portal input can be focused"],
    scenarioIds: ["SCN-015", "SCN-016"],
    invariants: ["assertStatusToolbarVisible"]
  },
  {
    parityTaxonomyId: "DR-004",
    testTitlePatterns: ["portal edge case: first portal input can be focused"],
    scenarioIds: ["SCN-014", "SCN-017", "SCN-019"],
    invariants: ["assertDirtyStatePill"]
  },
  {
    parityTaxonomyId: "DR-006",
    testTitlePatterns: ["portal edge case: first portal input can be focused"],
    scenarioIds: ["SCN-015", "SCN-020"],
    invariants: ["assertStatusToolbarVisible", "assertModeHook"]
  },
  {
    parityTaxonomyId: "DR-009",
    testTitlePatterns: ["date control edge case", "value list edge case"],
    scenarioIds: ["SCN-014", "SCN-017"],
    invariants: ["assertStatusToolbarVisible"]
  },
  {
    parityTaxonomyId: "SE-001",
    testTitlePatterns: ["top menu coverage in browse mode", "click-everything command harness"],
    scenarioIds: ["SCN-024"],
    invariants: ["assertModeHook"]
  },
  {
    parityTaxonomyId: "SE-003",
    testTitlePatterns: ["layout mode installs uiTest hook", "browse mode installs uiTest hook"],
    scenarioIds: ["SCN-001", "SCN-021"],
    invariants: ["assertModeHook", "assertLayoutIdHook"]
  },
  {
    parityTaxonomyId: "SE-006",
    testTitlePatterns: ["commit invariant", "revert invariant"],
    scenarioIds: ["SCN-001", "SCN-003", "SCN-014"],
    invariants: ["assertDirtyStatePill"]
  },
  {
    parityTaxonomyId: "SE-008",
    testTitlePatterns: ["click-everything command harness + coverage report"],
    scenarioIds: ["SCN-024", "SCN-025"],
    invariants: ["assertLastActionHook"]
  },
  {
    parityTaxonomyId: "PF-001",
    testTitlePatterns: ["click-everything command harness + coverage report"],
    scenarioIds: ["SCN-017", "SCN-020"],
    invariants: ["assertStatusToolbarVisible"]
  },
  {
    parityTaxonomyId: "PF-004",
    testTitlePatterns: ["portal edge case: first portal input can be focused"],
    scenarioIds: ["SCN-017"],
    invariants: ["assertStatusToolbarVisible"]
  },
  {
    parityTaxonomyId: "PF-007",
    testTitlePatterns: ["focus invariant", "keyboard focus edge case"],
    scenarioIds: ["SCN-002"],
    invariants: ["assertFocusOnFirstEditableField"]
  },
  {
    parityTaxonomyId: "DX-001",
    testTitlePatterns: ["layout mode installs uiTest hook", "browse mode installs uiTest hook"],
    scenarioIds: ["SCN-024"],
    invariants: ["assertLayoutIdHook", "assertModeHook"]
  },
  {
    parityTaxonomyId: "DX-004",
    testTitlePatterns: ["click-everything command harness + coverage report"],
    scenarioIds: ["SCN-024"],
    invariants: ["assertLastActionHook"]
  }
];

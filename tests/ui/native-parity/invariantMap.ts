export type InvariantMapping = {
  invariantId: string;
  testTitlePatterns: string[];
  scenarioIds: string[];
  description: string;
};

export const invariantMappings: InvariantMapping[] = [
  {
    invariantId: "assertModeHook",
    description: "UI hook reports the current mode correctly.",
    testTitlePatterns: ["layout mode installs uiTest hook", "browse mode installs uiTest hook", "mode-separation invariants"],
    scenarioIds: ["SCN-001", "SCN-021", "SCN-024"]
  },
  {
    invariantId: "assertLayoutIdHook",
    description: "UI hook reports active layout id.",
    testTitlePatterns: ["layout mode installs uiTest hook", "browse mode installs uiTest hook"],
    scenarioIds: []
  },
  {
    invariantId: "assertStatusToolbarVisible",
    description: "Status toolbar remains visible during normal workflows.",
    testTitlePatterns: ["status area", "record navigator invariant", "top menu coverage in browse mode"],
    scenarioIds: ["SCN-001", "SCN-008", "SCN-014", "SCN-024", "SCN-025"]
  },
  {
    invariantId: "assertTopMenuOpen",
    description: "Top menus open and are discoverable.",
    testTitlePatterns: ["top menubar file menu opens", "top menubar view menu opens", "top menu coverage in browse mode"],
    scenarioIds: []
  },
  {
    invariantId: "assertFindModeActive",
    description: "Find mode controls appear when in find mode.",
    testTitlePatterns: ["enter find mode and show find controls"],
    scenarioIds: ["SCN-009", "SCN-010"]
  },
  {
    invariantId: "assertPreviewModeActive",
    description: "Preview mode controls appear when in preview mode.",
    testTitlePatterns: ["preview toggle shows preview controls"],
    scenarioIds: []
  },
  {
    invariantId: "assertViewTabSelected",
    description: "Selected browse view tab is explicit and consistent.",
    testTitlePatterns: ["browse view switch form/list/table"],
    scenarioIds: ["SCN-025"]
  },
  {
    invariantId: "assertFocusOnFirstEditableField",
    description: "Focus remains on the field under edit.",
    testTitlePatterns: ["focus invariant", "keyboard focus edge case"],
    scenarioIds: ["SCN-002"]
  },
  {
    invariantId: "assertDirtyStatePill",
    description: "Dirty state marker is shown/cleared consistently.",
    testTitlePatterns: ["dirty-state invariant", "commit invariant", "revert invariant"],
    scenarioIds: ["SCN-001", "SCN-003", "SCN-007", "SCN-014"]
  },
  {
    invariantId: "assertModeSeparationLayout",
    description: "Layout mode does not render browse runtime canvas.",
    testTitlePatterns: ["mode-separation invariants"],
    scenarioIds: ["SCN-021"]
  },
  {
    invariantId: "assertModeSeparationBrowse",
    description: "Browse mode does not render layout authoring chrome.",
    testTitlePatterns: ["browse mode installs uiTest hook"],
    scenarioIds: []
  },
  {
    invariantId: "assertRecordNavigatorInputVisible",
    description: "Record navigator input remains visible in browse flows.",
    testTitlePatterns: ["record navigator invariant", "top menu coverage in browse mode"],
    scenarioIds: ["SCN-007", "SCN-008", "SCN-024"]
  },
  {
    invariantId: "assertLastActionHook",
    description: "Last action hook is populated by command harness.",
    testTitlePatterns: ["click-everything command harness + coverage report"],
    scenarioIds: []
  }
];

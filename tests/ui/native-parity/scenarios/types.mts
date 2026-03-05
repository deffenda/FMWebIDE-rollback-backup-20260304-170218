export type ScenarioGroup =
  | "browse-record-lifecycle"
  | "find-mode-query"
  | "portal-related-data"
  | "layout-mode-safe-edits"
  | "navigation-history";

export type ScenarioStepAction =
  | "gotoHome"
  | "gotoLayout"
  | "gotoBrowse"
  | "click"
  | "fill"
  | "fillFirstEditable"
  | "press"
  | "switchView"
  | "enterFindMode"
  | "enterPreviewMode"
  | "assertVisible"
  | "assertHidden";

export type ScenarioStep = {
  action: ScenarioStepAction;
  description: string;
  selector?: string;
  value?: string;
  key?: string;
  layoutName?: string;
  mode?: "browse" | "find" | "preview";
  optional?: boolean;
};

export type NativeParityScenario = {
  id: string;
  title: string;
  group: ScenarioGroup;
  requiredLayouts: string[];
  prerequisites: {
    mode: "home" | "layout" | "browse";
    layoutName?: string;
  };
  steps: ScenarioStep[];
  expectedInvariants: string[];
  smoke: boolean;
};

export type UncertaintyLevel = "low" | "med" | "high";

export type ParityStatus = "Implemented" | "Partial" | "Missing" | "Unknown";

export type ComplexityBand = "S" | "M" | "L" | "XL";

export type RiskBand = "Low" | "Med" | "High";

export type ParityTaxonomyItem = {
  id: string;
  category: string;
  subcategory: string;
  capability_name: string;
  expected_filemaker_behavior: string;
  typical_user_value: string;
  suggested_validation_test: string;
  uncertainty_level: UncertaintyLevel;
  keywords: string[];
  pathHints: string[];
};

export type EvidenceHit = {
  file: string;
  line: number;
  excerpt: string;
  reason: "keyword" | "pathHint";
};

export type ParityStatusItem = {
  id: string;
  category: string;
  subcategory: string;
  capability_name: string;
  expected_filemaker_behavior: string;
  typical_user_value: string;
  suggested_validation_test: string;
  uncertainty_level: UncertaintyLevel;
  status: ParityStatus;
  evidence: EvidenceHit[];
};

export type ToolchainSummary = {
  packageManager: string;
  nextVersion: string;
  reactVersion: string;
  typescriptVersion: string;
  hasStrictTypescript: boolean;
  linting: string[];
  testScripts: string[];
};

export type RepoBaseline = {
  generatedAt: string;
  repoRoot: string;
  toolchain: ToolchainSummary;
  architecture: {
    entrypoints: string[];
    layoutModeModules: string[];
    browseModeModules: string[];
    ddrModules: string[];
    dataApiModules: string[];
    securityModules: string[];
    pluginModules: string[];
    testingModules: string[];
  };
  inventory: {
    apiRouteCount: number;
    componentCount: number;
    libModuleCount: number;
    serverModuleCount: number;
  };
  findings: {
    stateManagement: string;
    dataAccess: string;
    storage: string;
    renderingPipeline: string;
    securityPosture: string;
  };
  knownRisks: string[];
};

export type BacklogItem = {
  improvement_id: string;
  source_capability_id: string;
  theme: string;
  title: string;
  description_filemaker_terms: string;
  user_story: string;
  acceptance_criteria: string[];
  suggested_technical_approach: string;
  test_strategy: string;
  complexity: ComplexityBand;
  dependencies: string[];
  user_impact: number;
  parity_importance: number;
  complexity_score: number;
  risk: number;
  leverage: number;
  composite_score: number;
};

export type AuditOutputs = {
  baseline: RepoBaseline;
  parityStatuses: ParityStatusItem[];
  backlog: BacklogItem[];
};

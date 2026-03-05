export type DiffSeverity = "breaking" | "warn" | "info";

export type DiffProbableRename = {
  from: string;
  to: string;
  confidence: number;
  reason: string;
};

export type DiffChangeEntry = {
  key: string;
  fileId: string;
  entity: "table" | "field" | "tableOccurrence" | "relationship" | "valueList" | "layout" | "script";
  changeType:
    | "added"
    | "removed"
    | "probable-rename"
    | "type-changed"
    | "options-changed"
    | "base-changed"
    | "binding-changed";
  severity: DiffSeverity;
  description: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

export type SchemaDiffSummary = {
  totalChanges: number;
  breakingChanges: number;
  warnings: number;
  info: number;
  filesChanged: number;
  tablesAdded: number;
  tablesRemoved: number;
  fieldsAdded: number;
  fieldsRemoved: number;
  fieldsTypeChanged: number;
  relationshipsAdded: number;
  relationshipsRemoved: number;
  valueListsAdded: number;
  valueListsRemoved: number;
};

export type SchemaDiffResult = {
  version: 1;
  generatedAt: string;
  baselineSnapshotId: string;
  targetSnapshotId: string;
  summary: SchemaDiffSummary;
  probableRenames: DiffProbableRename[];
  changes: DiffChangeEntry[];
  impactedEntityKeys: string[];
};


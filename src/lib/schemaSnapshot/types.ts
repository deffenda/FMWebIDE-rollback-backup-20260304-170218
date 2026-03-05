export type SchemaSnapshotSource = "workspace" | "ddr-import" | "manual" | "migration-apply";

export type SchemaSnapshotField = {
  id: string;
  name: string;
  type: string;
  fieldType?: string;
  options?: string;
  comment?: string;
  source?: string;
};

export type SchemaSnapshotTable = {
  id: string;
  name: string;
  source?: string;
  comment?: string;
  fields: SchemaSnapshotField[];
};

export type SchemaSnapshotTableOccurrence = {
  id: string;
  name: string;
  baseTableId?: string;
  baseTableName?: string;
  apiLayoutName?: string;
  relationshipTargets: string[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

export type SchemaSnapshotRelationship = {
  id: string;
  leftFileId: string;
  leftTableOccurrence: string;
  rightFileId: string;
  rightTableOccurrence: string;
  predicate?: string;
  leftField?: string;
  rightField?: string;
};

export type SchemaSnapshotValueList = {
  id: string;
  name: string;
  source?: string;
  sourceFields: string[];
  values: string[];
};

export type SchemaSnapshotPortalRef = {
  componentId: string;
  tableOccurrence: string;
  rowFields: string[];
};

export type SchemaSnapshotLayoutRef = {
  layoutId: string;
  layoutName: string;
  baseTableOccurrence: string;
  baseTable?: string;
  apiLayoutName?: string;
  referencedFields: string[];
  referencedTableOccurrences: string[];
  referencedValueLists: string[];
  portals: SchemaSnapshotPortalRef[];
};

export type SchemaSnapshotScriptRef = {
  scriptId: string;
  scriptName: string;
  referencedFields: string[];
  referencedLayouts: string[];
  referencedTableOccurrences: string[];
  stepCount: number;
};

export type SchemaSnapshotFile = {
  fileId: string;
  workspaceId: string;
  displayName?: string;
  databaseName: string;
  primary: boolean;
  dependencies: string[];
  tables: SchemaSnapshotTable[];
  tableOccurrences: SchemaSnapshotTableOccurrence[];
  relationships: SchemaSnapshotRelationship[];
  valueLists: SchemaSnapshotValueList[];
  layouts: SchemaSnapshotLayoutRef[];
  scripts: SchemaSnapshotScriptRef[];
};

export type SchemaSnapshot = {
  version: 1;
  snapshotId: string;
  label?: string;
  workspaceId: string;
  createdAt: string;
  source: SchemaSnapshotSource;
  fileIds: string[];
  files: SchemaSnapshotFile[];
  metadata: {
    ddrPaths: string[];
    warnings: string[];
  };
};

export type SchemaSnapshotCollection = {
  version: 1;
  snapshots: SchemaSnapshot[];
};

export type CreateSchemaSnapshotOptions = {
  workspaceId?: string;
  label?: string;
  includeRuntimeValueLists?: boolean;
  source?: SchemaSnapshotSource;
  ddrPathOverrideByFileId?: Record<string, string>;
};

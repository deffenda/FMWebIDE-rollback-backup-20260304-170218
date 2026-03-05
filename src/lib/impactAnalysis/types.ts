import type { SchemaDiffResult } from "../schemaDiff/types.ts";
import type { SchemaSnapshot } from "../schemaSnapshot/types.ts";

export type ReferenceEntityType = "layout" | "script" | "valueList" | "portal" | "menu";

export type WorkspaceReferenceEntry = {
  key: string;
  fileId: string;
  entityType: ReferenceEntityType;
  entityId: string;
  entityName: string;
  relation: string;
  details?: Record<string, unknown>;
};

export type WorkspaceReferenceIndex = {
  version: 1;
  generatedAt: string;
  workspaceId: string;
  snapshotId: string;
  byEntityKey: Record<string, WorkspaceReferenceEntry[]>;
};

export type ImpactSeverity = "blocker" | "warn" | "info";

export type ImpactItem = {
  id: string;
  severity: ImpactSeverity;
  fileId: string;
  impactedEntityKey: string;
  entityType: ReferenceEntityType;
  entityId: string;
  entityName: string;
  relation: string;
  reason: string;
  recommendedAction: string;
  relatedChanges: string[];
};

export type ImpactReport = {
  version: 1;
  generatedAt: string;
  workspaceId: string;
  baselineSnapshotId: string;
  targetSnapshotId: string;
  summary: {
    total: number;
    blockers: number;
    warnings: number;
    info: number;
    layoutsAffected: number;
    scriptsAffected: number;
    valueListsAffected: number;
    menusAffected: number;
    portalsAffected: number;
  };
  impacts: ImpactItem[];
  recommendations: string[];
  unmatchedImpactedKeys: string[];
};

export type AnalyzeImpactOptions = {
  includeInfoItems?: boolean;
  maxItems?: number;
};

export type AnalyzeImpactInput = {
  baselineSnapshot: SchemaSnapshot;
  targetSnapshot: SchemaSnapshot;
  diffResult: SchemaDiffResult;
  referenceIndex?: WorkspaceReferenceIndex;
  options?: AnalyzeImpactOptions;
};

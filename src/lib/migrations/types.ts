import type { SchemaDiffResult } from "../schemaDiff/types.ts";
import type { SchemaSnapshot } from "../schemaSnapshot/types.ts";

export type MigrationRisk = "safe" | "warn" | "danger";

export type MigrationStepType =
  | "CreateTable"
  | "DropTable"
  | "AddField"
  | "DropField"
  | "RenameField"
  | "ChangeFieldType"
  | "ChangeFieldOptions"
  | "CreateTO"
  | "DropTO"
  | "RenameTO"
  | "UpdateTOBase"
  | "CreateRelationship"
  | "DropRelationship"
  | "CreateValueList"
  | "UpdateValueList"
  | "DropValueList"
  | "LayoutRefFix";

export type MigrationStep = {
  id: string;
  type: MigrationStepType;
  fileId: string;
  title: string;
  description: string;
  risk: MigrationRisk;
  reversible: boolean;
  payload: Record<string, unknown>;
  sourceChangeKey?: string;
  dependencies: string[];
};

export type MigrationGenerationOptions = {
  allowDestructive?: boolean;
  autoRenameFixes?: boolean;
  crossFileAware?: boolean;
};

export type MigrationPlan = {
  version: 1;
  id: string;
  workspaceId: string;
  baselineSnapshotId: string;
  targetSnapshotId: string;
  createdAt: string;
  generatedFromDiff: {
    generatedAt: string;
    summary: SchemaDiffResult["summary"];
  };
  options: Required<MigrationGenerationOptions>;
  steps: MigrationStep[];
  skippedChanges: Array<{
    changeKey: string;
    reason: string;
  }>;
  warnings: string[];
  summary: {
    totalSteps: number;
    safeSteps: number;
    warningSteps: number;
    dangerSteps: number;
  };
};

export type MigrationApplyResult = {
  ok: boolean;
  appliedAt: string;
  planId: string;
  workspaceId: string;
  baselineSnapshotId: string;
  resultingSnapshot: SchemaSnapshot;
  appliedStepIds: string[];
  skippedStepIds: string[];
  warnings: string[];
};

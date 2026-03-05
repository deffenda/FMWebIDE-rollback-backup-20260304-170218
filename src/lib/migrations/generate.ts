import { randomUUID } from "node:crypto";
import type { DiffChangeEntry, DiffProbableRename, SchemaDiffResult } from "../schemaDiff/types.ts";
import type {
  MigrationGenerationOptions,
  MigrationPlan,
  MigrationStep,
  MigrationStepType
} from "./types.ts";

function cleanToken(value: unknown): string {
  return String(value ?? "").trim();
}

function canonicalKey(value: string): string {
  return cleanToken(value).toLowerCase();
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const value of values) {
    const cleaned = cleanToken(value);
    if (!cleaned) {
      continue;
    }
    const key = canonicalKey(cleaned);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    next.push(cleaned);
  }
  return next;
}

function normalizeOptions(options?: MigrationGenerationOptions): Required<MigrationGenerationOptions> {
  return {
    allowDestructive: options?.allowDestructive === true,
    autoRenameFixes: options?.autoRenameFixes === true,
    crossFileAware: options?.crossFileAware !== false
  };
}

function extractTableAndFieldTokens(change: DiffChangeEntry): {
  tableName?: string;
  fieldName?: string;
} {
  const fieldPattern = /([A-Za-z0-9_.:-]+)::([A-Za-z0-9_.:-]+)/;
  const match = change.description.match(fieldPattern);
  if (!match) {
    return {};
  }
  return {
    tableName: cleanToken(match[1]),
    fieldName: cleanToken(match[2])
  };
}

function inferRisk(change: DiffChangeEntry): MigrationStep["risk"] {
  if (change.severity === "breaking") {
    if (change.changeType === "removed") {
      return "danger";
    }
    return "warn";
  }
  if (change.severity === "warn") {
    return "warn";
  }
  return "safe";
}

function stepTypeForChange(change: DiffChangeEntry): MigrationStepType | null {
  if (change.entity === "table") {
    if (change.changeType === "added") {
      return "CreateTable";
    }
    if (change.changeType === "removed") {
      return "DropTable";
    }
    return null;
  }
  if (change.entity === "field") {
    if (change.changeType === "added") {
      return "AddField";
    }
    if (change.changeType === "removed") {
      return "DropField";
    }
    if (change.changeType === "type-changed") {
      return "ChangeFieldType";
    }
    if (change.changeType === "options-changed") {
      return "ChangeFieldOptions";
    }
    return null;
  }
  if (change.entity === "tableOccurrence") {
    if (change.changeType === "added") {
      return "CreateTO";
    }
    if (change.changeType === "removed") {
      return "DropTO";
    }
    if (change.changeType === "base-changed") {
      return "UpdateTOBase";
    }
    return null;
  }
  if (change.entity === "relationship") {
    if (change.changeType === "added") {
      return "CreateRelationship";
    }
    if (change.changeType === "removed") {
      return "DropRelationship";
    }
    return null;
  }
  if (change.entity === "valueList") {
    if (change.changeType === "added") {
      return "CreateValueList";
    }
    if (change.changeType === "removed") {
      return "DropValueList";
    }
    if (change.changeType === "options-changed") {
      return "UpdateValueList";
    }
    return null;
  }
  if (change.entity === "layout" || change.entity === "script") {
    return "LayoutRefFix";
  }
  return null;
}

function changeIsDestructive(change: DiffChangeEntry): boolean {
  return (
    change.changeType === "removed" ||
    change.changeType === "type-changed" ||
    change.changeType === "base-changed"
  );
}

function parseTableName(change: DiffChangeEntry): string {
  const keyParts = cleanToken(change.key).split("::");
  if (change.entity === "table" && keyParts.length >= 3) {
    return cleanToken(keyParts[2]);
  }
  const parsed = extractTableAndFieldTokens(change);
  return cleanToken(parsed.tableName);
}

function parseFieldName(change: DiffChangeEntry): string {
  const parsed = extractTableAndFieldTokens(change);
  return cleanToken(parsed.fieldName);
}

function toStep(
  change: DiffChangeEntry,
  type: MigrationStepType,
  options: Required<MigrationGenerationOptions>
): MigrationStep {
  const parsedTableName = parseTableName(change);
  const parsedFieldName = parseFieldName(change);
  const payload: Record<string, unknown> = {
    changeType: change.changeType,
    entity: change.entity,
    key: change.key,
    before: change.before ?? {},
    after: change.after ?? {}
  };
  if (parsedTableName) {
    payload.tableName = parsedTableName;
  }
  if (parsedFieldName) {
    payload.fieldName = parsedFieldName;
  }
  if (change.entity === "relationship") {
    payload.description = change.description;
  }

  const risk = inferRisk(change);
  const reversible = type !== "DropTable" && type !== "DropField" && type !== "DropTO" && type !== "DropRelationship";

  return {
    id: `step-${randomUUID().slice(0, 8)}`,
    type,
    fileId: cleanToken(change.fileId),
    title: `${type} (${cleanToken(change.fileId)})`,
    description: change.description,
    risk,
    reversible,
    payload,
    sourceChangeKey: change.key,
    dependencies: []
  };
}

function renameStepFromCandidate(
  candidate: DiffProbableRename,
  fileId: string
): MigrationStep | null {
  const from = cleanToken(candidate.from);
  const to = cleanToken(candidate.to);
  if (!from || !to) {
    return null;
  }
  if (!from.includes("::") || !to.includes("::")) {
    return null;
  }
  const [fromTable, fromField] = from.split("::");
  const [toTable, toField] = to.split("::");
  if (!fromField || !toField) {
    return null;
  }
  return {
    id: `step-${randomUUID().slice(0, 8)}`,
    type: "RenameField",
    fileId,
    title: `RenameField (${fileId})`,
    description: `Probable rename: ${from} -> ${to} (${candidate.confidence})`,
    risk: "warn",
    reversible: true,
    payload: {
      fromTableName: cleanToken(fromTable),
      toTableName: cleanToken(toTable),
      fromFieldName: cleanToken(fromField),
      toFieldName: cleanToken(toField),
      confidence: candidate.confidence,
      reason: candidate.reason
    },
    dependencies: []
  };
}

function sortSteps(steps: MigrationStep[]): MigrationStep[] {
  const typeWeight: Record<MigrationStepType, number> = {
    CreateTable: 0,
    AddField: 1,
    ChangeFieldType: 2,
    ChangeFieldOptions: 2,
    RenameField: 2,
    CreateTO: 3,
    UpdateTOBase: 4,
    CreateRelationship: 5,
    CreateValueList: 6,
    UpdateValueList: 7,
    LayoutRefFix: 8,
    RenameTO: 9,
    DropRelationship: 10,
    DropTO: 11,
    DropField: 12,
    DropValueList: 13,
    DropTable: 14
  };
  return [...steps].sort((left, right) => {
    const leftWeight = typeWeight[left.type] ?? 99;
    const rightWeight = typeWeight[right.type] ?? 99;
    if (leftWeight !== rightWeight) {
      return leftWeight - rightWeight;
    }
    const fileCompare = left.fileId.localeCompare(right.fileId, undefined, { sensitivity: "base" });
    if (fileCompare !== 0) {
      return fileCompare;
    }
    const sourceCompare = cleanToken(left.sourceChangeKey).localeCompare(cleanToken(right.sourceChangeKey), undefined, {
      sensitivity: "base"
    });
    if (sourceCompare !== 0) {
      return sourceCompare;
    }
    return left.id.localeCompare(right.id, undefined, { sensitivity: "base" });
  });
}

export function generateMigrationPlan(
  workspaceId: string,
  diffResult: SchemaDiffResult,
  options?: MigrationGenerationOptions
): MigrationPlan {
  const normalizedOptions = normalizeOptions(options);
  const skippedChanges: MigrationPlan["skippedChanges"] = [];
  const warnings: string[] = [];
  const steps: MigrationStep[] = [];

  for (const change of diffResult.changes ?? []) {
    const type = stepTypeForChange(change);
    if (!type) {
      skippedChanges.push({
        changeKey: change.key,
        reason: "No migration step mapping for this change type."
      });
      continue;
    }

    if (!normalizedOptions.allowDestructive && changeIsDestructive(change)) {
      skippedChanges.push({
        changeKey: change.key,
        reason: "Destructive changes are disabled. Re-run with allowDestructive=true."
      });
      continue;
    }

    const step = toStep(change, type, normalizedOptions);
    steps.push(step);
  }

  if (normalizedOptions.autoRenameFixes) {
    const byFileId = new Map<string, number>();
    for (const change of diffResult.changes ?? []) {
      const key = canonicalKey(change.fileId);
      byFileId.set(key, (byFileId.get(key) ?? 0) + 1);
    }
    for (const candidate of diffResult.probableRenames ?? []) {
      if (candidate.confidence < 0.9) {
        warnings.push(
          `Skipped probable rename ${candidate.from} -> ${candidate.to}: confidence ${candidate.confidence} < 0.9`
        );
        continue;
      }
      const inferredFileId =
        [...byFileId.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || "default";
      const step = renameStepFromCandidate(candidate, inferredFileId);
      if (step) {
        steps.push(step);
      }
    }
  } else if ((diffResult.probableRenames ?? []).length > 0) {
    warnings.push("Probable renames detected. Enable autoRenameFixes to generate rename migration steps.");
  }

  const sortedSteps = sortSteps(steps);
  const safeSteps = sortedSteps.filter((entry) => entry.risk === "safe").length;
  const warningSteps = sortedSteps.filter((entry) => entry.risk === "warn").length;
  const dangerSteps = sortedSteps.filter((entry) => entry.risk === "danger").length;

  return {
    version: 1,
    id: `migration-${Date.now()}-${randomUUID().slice(0, 8)}`,
    workspaceId: cleanToken(workspaceId) || "default",
    baselineSnapshotId: diffResult.baselineSnapshotId,
    targetSnapshotId: diffResult.targetSnapshotId,
    createdAt: new Date().toISOString(),
    generatedFromDiff: {
      generatedAt: diffResult.generatedAt,
      summary: diffResult.summary
    },
    options: normalizedOptions,
    steps: sortedSteps,
    skippedChanges,
    warnings: dedupeStrings(warnings),
    summary: {
      totalSteps: sortedSteps.length,
      safeSteps,
      warningSteps,
      dangerSteps
    }
  };
}

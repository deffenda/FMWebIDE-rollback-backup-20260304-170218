import type {
  SchemaSnapshot,
  SchemaSnapshotField,
  SchemaSnapshotRelationship,
  SchemaSnapshotTable,
  SchemaSnapshotTableOccurrence,
  SchemaSnapshotValueList
} from "../schemaSnapshot/types.ts";
import type { MigrationApplyResult, MigrationPlan, MigrationStep } from "./types.ts";

function cleanToken(value: unknown): string {
  return String(value ?? "").trim();
}

function canonicalKey(value: string): string {
  return cleanToken(value).toLowerCase();
}

function cloneSnapshot(snapshot: SchemaSnapshot): SchemaSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as SchemaSnapshot;
}

function findFile(snapshot: SchemaSnapshot, fileId: string) {
  const key = canonicalKey(fileId);
  return snapshot.files.find((entry) => canonicalKey(entry.fileId) === key) ?? null;
}

function findTable(file: SchemaSnapshot["files"][number], tableName: string) {
  const key = canonicalKey(tableName);
  return file.tables.find((entry) => canonicalKey(entry.name) === key) ?? null;
}

function parseRelationshipFromDescription(
  fileId: string,
  description: string,
  fallbackId: string
): SchemaSnapshotRelationship | null {
  const pattern = /Relationship (?:added|removed):\s*([A-Za-z0-9_.:-]+)\s*->\s*([A-Za-z0-9_.:-]+)/i;
  const match = description.match(pattern);
  if (!match) {
    return null;
  }
  const leftTo = cleanToken(match[1]);
  const rightTo = cleanToken(match[2]);
  if (!leftTo || !rightTo) {
    return null;
  }
  return {
    id: fallbackId,
    leftFileId: fileId,
    leftTableOccurrence: leftTo,
    rightFileId: fileId,
    rightTableOccurrence: rightTo
  };
}

function toField(step: MigrationStep): SchemaSnapshotField {
  const fieldName = cleanToken(step.payload.fieldName) || `Field_${step.id}`;
  const after = (step.payload.after ?? {}) as Record<string, unknown>;
  return {
    id: canonicalKey(fieldName),
    name: fieldName,
    type: cleanToken(after.type) || "Text",
    fieldType: cleanToken(after.fieldType) || undefined,
    options: cleanToken(after.options) || undefined,
    source: "workspace"
  };
}

function toTable(step: MigrationStep): SchemaSnapshotTable {
  const tableName = cleanToken(step.payload.tableName) || `Table_${step.id}`;
  const after = (step.payload.after ?? {}) as Record<string, unknown>;
  return {
    id: canonicalKey(tableName),
    name: tableName,
    source: cleanToken(after.source) || "workspace",
    comment: cleanToken(after.comment) || undefined,
    fields: []
  };
}

function toTableOccurrence(step: MigrationStep): SchemaSnapshotTableOccurrence {
  const name = cleanToken(step.payload.toName || step.payload.name || step.payload.tableOccurrence) || `TO_${step.id}`;
  const after = (step.payload.after ?? {}) as Record<string, unknown>;
  const baseTableName = cleanToken(step.payload.baseTableName || after.baseTable || after.baseTableName);
  return {
    id: canonicalKey(name),
    name,
    baseTableName: baseTableName || undefined,
    apiLayoutName: cleanToken(step.payload.apiLayoutName || after.apiLayoutName) || undefined,
    relationshipTargets: []
  };
}

function toValueList(step: MigrationStep): SchemaSnapshotValueList {
  const name = cleanToken(step.payload.name || step.payload.valueListName) || `ValueList_${step.id}`;
  const after = (step.payload.after ?? {}) as Record<string, unknown>;
  const valuesRaw = Array.isArray(after.values) ? after.values : [];
  const sourceFieldsRaw = Array.isArray(after.sourceFields) ? after.sourceFields : [];
  return {
    id: canonicalKey(name),
    name,
    source: cleanToken(after.source) || "workspace",
    sourceFields: sourceFieldsRaw.map((entry) => cleanToken(entry)).filter((entry) => entry.length > 0),
    values: valuesRaw.map((entry) => cleanToken(entry)).filter((entry) => entry.length > 0)
  };
}

function applyStepToSnapshot(snapshot: SchemaSnapshot, step: MigrationStep, warnings: string[]): boolean {
  const file = findFile(snapshot, step.fileId);
  if (!file) {
    warnings.push(`Step ${step.id} skipped: file ${step.fileId} was not found in snapshot.`);
    return false;
  }

  if (step.type === "CreateTable") {
    const tableName = cleanToken(step.payload.tableName);
    if (!tableName) {
      warnings.push(`Step ${step.id} skipped: tableName missing.`);
      return false;
    }
    if (!findTable(file, tableName)) {
      file.tables.push(toTable(step));
      file.tables.sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));
    }
    return true;
  }

  if (step.type === "DropTable") {
    const tableName = cleanToken(step.payload.tableName);
    if (!tableName) {
      warnings.push(`Step ${step.id} skipped: tableName missing.`);
      return false;
    }
    file.tables = file.tables.filter((entry) => canonicalKey(entry.name) !== canonicalKey(tableName));
    return true;
  }

  if (step.type === "AddField") {
    const tableName = cleanToken(step.payload.tableName);
    const table = findTable(file, tableName);
    if (!table) {
      warnings.push(`Step ${step.id} skipped: table ${tableName} not found.`);
      return false;
    }
    const fieldName = cleanToken(step.payload.fieldName);
    if (!fieldName) {
      warnings.push(`Step ${step.id} skipped: fieldName missing.`);
      return false;
    }
    if (!table.fields.some((entry) => canonicalKey(entry.name) === canonicalKey(fieldName))) {
      table.fields.push(toField(step));
      table.fields.sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));
    }
    return true;
  }

  if (step.type === "DropField") {
    const tableName = cleanToken(step.payload.tableName);
    const fieldName = cleanToken(step.payload.fieldName);
    const table = findTable(file, tableName);
    if (!table || !fieldName) {
      warnings.push(`Step ${step.id} skipped: table or field missing.`);
      return false;
    }
    table.fields = table.fields.filter((entry) => canonicalKey(entry.name) !== canonicalKey(fieldName));
    return true;
  }

  if (step.type === "RenameField") {
    const fromTableName = cleanToken(step.payload.fromTableName || step.payload.tableName);
    const fromFieldName = cleanToken(step.payload.fromFieldName || step.payload.fieldName);
    const toTableName = cleanToken(step.payload.toTableName || fromTableName);
    const toFieldName = cleanToken(step.payload.toFieldName);
    if (!fromTableName || !fromFieldName || !toFieldName) {
      warnings.push(`Step ${step.id} skipped: rename payload incomplete.`);
      return false;
    }
    const fromTable = findTable(file, fromTableName);
    if (!fromTable) {
      warnings.push(`Step ${step.id} skipped: source table ${fromTableName} not found.`);
      return false;
    }
    const field = fromTable.fields.find((entry) => canonicalKey(entry.name) === canonicalKey(fromFieldName));
    if (!field) {
      warnings.push(`Step ${step.id} skipped: source field ${fromFieldName} not found.`);
      return false;
    }
    const targetTable = findTable(file, toTableName) ?? fromTable;
    if (targetTable !== fromTable) {
      fromTable.fields = fromTable.fields.filter((entry) => canonicalKey(entry.name) !== canonicalKey(fromFieldName));
      targetTable.fields.push({
        ...field,
        id: canonicalKey(toFieldName),
        name: toFieldName
      });
    } else {
      field.id = canonicalKey(toFieldName);
      field.name = toFieldName;
    }
    for (const layout of file.layouts) {
      layout.referencedFields = layout.referencedFields.map((entry) =>
        entry.replace(new RegExp(`::${fromFieldName}$`, "i"), `::${toFieldName}`)
      );
      for (const portal of layout.portals ?? []) {
        portal.rowFields = portal.rowFields.map((entry) =>
          canonicalKey(entry) === canonicalKey(fromFieldName) ? toFieldName : entry
        );
      }
    }
    for (const script of file.scripts) {
      script.referencedFields = script.referencedFields.map((entry) =>
        entry.replace(new RegExp(`::${fromFieldName}$`, "i"), `::${toFieldName}`)
      );
    }
    return true;
  }

  if (step.type === "ChangeFieldType" || step.type === "ChangeFieldOptions") {
    const tableName = cleanToken(step.payload.tableName);
    const fieldName = cleanToken(step.payload.fieldName);
    const table = findTable(file, tableName);
    const after = (step.payload.after ?? {}) as Record<string, unknown>;
    if (!table || !fieldName) {
      warnings.push(`Step ${step.id} skipped: table or field missing.`);
      return false;
    }
    const field = table.fields.find((entry) => canonicalKey(entry.name) === canonicalKey(fieldName));
    if (!field) {
      warnings.push(`Step ${step.id} skipped: field ${fieldName} missing in ${tableName}.`);
      return false;
    }
    if (step.type === "ChangeFieldType") {
      field.type = cleanToken(after.type) || field.type;
      field.fieldType = cleanToken(after.fieldType) || field.fieldType;
    }
    if (cleanToken(after.options)) {
      field.options = cleanToken(after.options);
    }
    return true;
  }

  if (step.type === "CreateTO") {
    const toName = cleanToken(step.payload.name || step.payload.tableOccurrence || step.payload.tableName);
    if (!toName) {
      warnings.push(`Step ${step.id} skipped: TO name missing.`);
      return false;
    }
    if (!file.tableOccurrences.some((entry) => canonicalKey(entry.name) === canonicalKey(toName))) {
      file.tableOccurrences.push(toTableOccurrence(step));
      file.tableOccurrences.sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));
    }
    return true;
  }

  if (step.type === "DropTO") {
    const toName = cleanToken(step.payload.name || step.payload.tableOccurrence || step.payload.tableName);
    if (!toName) {
      warnings.push(`Step ${step.id} skipped: TO name missing.`);
      return false;
    }
    file.tableOccurrences = file.tableOccurrences.filter((entry) => canonicalKey(entry.name) !== canonicalKey(toName));
    file.relationships = file.relationships.filter(
      (entry) =>
        canonicalKey(entry.leftTableOccurrence) !== canonicalKey(toName) &&
        canonicalKey(entry.rightTableOccurrence) !== canonicalKey(toName)
    );
    return true;
  }

  if (step.type === "RenameTO") {
    const fromName = cleanToken(step.payload.fromName);
    const toName = cleanToken(step.payload.toName);
    if (!fromName || !toName) {
      warnings.push(`Step ${step.id} skipped: rename TO payload incomplete.`);
      return false;
    }
    const toEntry = file.tableOccurrences.find((entry) => canonicalKey(entry.name) === canonicalKey(fromName));
    if (!toEntry) {
      warnings.push(`Step ${step.id} skipped: source TO ${fromName} missing.`);
      return false;
    }
    toEntry.id = canonicalKey(toName);
    toEntry.name = toName;
    for (const relationship of file.relationships) {
      if (canonicalKey(relationship.leftTableOccurrence) === canonicalKey(fromName)) {
        relationship.leftTableOccurrence = toName;
      }
      if (canonicalKey(relationship.rightTableOccurrence) === canonicalKey(fromName)) {
        relationship.rightTableOccurrence = toName;
      }
    }
    for (const layout of file.layouts) {
      if (canonicalKey(layout.baseTableOccurrence) === canonicalKey(fromName)) {
        layout.baseTableOccurrence = toName;
      }
      layout.referencedTableOccurrences = layout.referencedTableOccurrences.map((entry) =>
        canonicalKey(entry) === canonicalKey(fromName) ? toName : entry
      );
      layout.referencedFields = layout.referencedFields.map((entry) => {
        if (canonicalKey(entry).startsWith(`${canonicalKey(fromName)}::`)) {
          return `${toName}${entry.slice(fromName.length)}`;
        }
        return entry;
      });
      for (const portal of layout.portals) {
        if (canonicalKey(portal.tableOccurrence) === canonicalKey(fromName)) {
          portal.tableOccurrence = toName;
        }
      }
    }
    return true;
  }

  if (step.type === "UpdateTOBase") {
    const toName = cleanToken(step.payload.name || step.payload.tableOccurrence || step.payload.tableName);
    const after = (step.payload.after ?? {}) as Record<string, unknown>;
    const baseTable = cleanToken(step.payload.baseTableName || after.baseTable);
    const toEntry = file.tableOccurrences.find((entry) => canonicalKey(entry.name) === canonicalKey(toName));
    if (!toEntry || !baseTable) {
      warnings.push(`Step ${step.id} skipped: TO or base table missing.`);
      return false;
    }
    toEntry.baseTableName = baseTable;
    return true;
  }

  if (step.type === "CreateRelationship") {
    const relationship =
      parseRelationshipFromDescription(step.fileId, step.description, step.id) ??
      ({
        id: step.id,
        leftFileId: step.fileId,
        leftTableOccurrence: cleanToken(step.payload.leftTableOccurrence),
        rightFileId: step.fileId,
        rightTableOccurrence: cleanToken(step.payload.rightTableOccurrence),
        predicate: cleanToken(step.payload.predicate) || undefined
      } satisfies SchemaSnapshotRelationship);
    if (!relationship.leftTableOccurrence || !relationship.rightTableOccurrence) {
      warnings.push(`Step ${step.id} skipped: relationship endpoints missing.`);
      return false;
    }
    const exists = file.relationships.some(
      (entry) =>
        canonicalKey(entry.leftTableOccurrence) === canonicalKey(relationship.leftTableOccurrence) &&
        canonicalKey(entry.rightTableOccurrence) === canonicalKey(relationship.rightTableOccurrence) &&
        canonicalKey(entry.predicate ?? "") === canonicalKey(relationship.predicate ?? "")
    );
    if (!exists) {
      file.relationships.push(relationship);
      file.relationships.sort((left, right) => left.id.localeCompare(right.id, undefined, { sensitivity: "base" }));
    }
    return true;
  }

  if (step.type === "DropRelationship") {
    const relationship = parseRelationshipFromDescription(step.fileId, step.description, step.id);
    if (!relationship) {
      warnings.push(`Step ${step.id} skipped: relationship signature not parseable.`);
      return false;
    }
    file.relationships = file.relationships.filter(
      (entry) =>
        !(
          canonicalKey(entry.leftTableOccurrence) === canonicalKey(relationship.leftTableOccurrence) &&
          canonicalKey(entry.rightTableOccurrence) === canonicalKey(relationship.rightTableOccurrence)
        )
    );
    return true;
  }

  if (step.type === "CreateValueList") {
    const valueList = toValueList(step);
    if (!file.valueLists.some((entry) => canonicalKey(entry.name) === canonicalKey(valueList.name))) {
      file.valueLists.push(valueList);
      file.valueLists.sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));
    }
    return true;
  }

  if (step.type === "DropValueList") {
    const valueListName = cleanToken(step.payload.name || step.payload.valueListName);
    if (!valueListName) {
      warnings.push(`Step ${step.id} skipped: value list name missing.`);
      return false;
    }
    file.valueLists = file.valueLists.filter((entry) => canonicalKey(entry.name) !== canonicalKey(valueListName));
    for (const layout of file.layouts) {
      layout.referencedValueLists = layout.referencedValueLists.filter(
        (entry) => canonicalKey(entry) !== canonicalKey(valueListName)
      );
    }
    return true;
  }

  if (step.type === "UpdateValueList") {
    const valueListName = cleanToken(step.payload.name || step.payload.valueListName);
    const after = (step.payload.after ?? {}) as Record<string, unknown>;
    const valueList = file.valueLists.find((entry) => canonicalKey(entry.name) === canonicalKey(valueListName));
    if (!valueList) {
      warnings.push(`Step ${step.id} skipped: value list ${valueListName} missing.`);
      return false;
    }
    if (cleanToken(after.source)) {
      valueList.source = cleanToken(after.source);
    }
    if (Array.isArray(after.values)) {
      valueList.values = after.values.map((entry) => cleanToken(entry)).filter((entry) => entry.length > 0);
    }
    if (Array.isArray(after.sourceFields)) {
      valueList.sourceFields = after.sourceFields
        .map((entry) => cleanToken(entry))
        .filter((entry) => entry.length > 0);
    }
    return true;
  }

  if (step.type === "LayoutRefFix") {
    // Layout/script binding changes are advisory in this phase.
    return true;
  }

  warnings.push(`Step ${step.id} skipped: unsupported step type ${step.type}.`);
  return false;
}

export function applyMigrationToSnapshot(
  baselineSnapshot: SchemaSnapshot,
  plan: MigrationPlan
): MigrationApplyResult {
  const working = cloneSnapshot(baselineSnapshot);
  const warnings = [...(plan.warnings ?? [])];
  const appliedStepIds: string[] = [];
  const skippedStepIds: string[] = [];

  for (const step of plan.steps ?? []) {
    const applied = applyStepToSnapshot(working, step, warnings);
    if (applied) {
      appliedStepIds.push(step.id);
    } else {
      skippedStepIds.push(step.id);
    }
  }

  working.snapshotId = `snapshot-${Date.now()}-migration`;
  working.createdAt = new Date().toISOString();
  working.source = "migration-apply";
  working.label = `Applied ${plan.id}`;
  working.metadata = {
    ...(working.metadata ?? { ddrPaths: [], warnings: [] }),
    warnings: Array.from(new Set([...(working.metadata?.warnings ?? []), ...warnings]))
  };

  return {
    ok: skippedStepIds.length === 0,
    appliedAt: new Date().toISOString(),
    planId: plan.id,
    workspaceId: baselineSnapshot.workspaceId,
    baselineSnapshotId: baselineSnapshot.snapshotId,
    resultingSnapshot: working,
    appliedStepIds,
    skippedStepIds,
    warnings: Array.from(new Set(warnings))
  };
}

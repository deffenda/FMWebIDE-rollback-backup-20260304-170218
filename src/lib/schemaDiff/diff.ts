import type { SchemaSnapshot, SchemaSnapshotField, SchemaSnapshotFile } from "../schemaSnapshot/types.ts";
import type { DiffChangeEntry, DiffProbableRename, SchemaDiffResult } from "./types.ts";

function normalizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const value of values) {
    const cleaned = normalizeToken(value);
    if (!cleaned) {
      continue;
    }
    const key = cleaned.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    next.push(cleaned);
  }
  return next;
}

function canonicalKey(value: string): string {
  return normalizeToken(value).toLowerCase();
}

function sortChanges(rows: DiffChangeEntry[]): DiffChangeEntry[] {
  return [...rows].sort((left, right) => {
    const severityWeight = (entry: DiffChangeEntry): number => {
      if (entry.severity === "breaking") {
        return 0;
      }
      if (entry.severity === "warn") {
        return 1;
      }
      return 2;
    };
    const severityCompare = severityWeight(left) - severityWeight(right);
    if (severityCompare !== 0) {
      return severityCompare;
    }
    const fileCompare = left.fileId.localeCompare(right.fileId, undefined, { sensitivity: "base" });
    if (fileCompare !== 0) {
      return fileCompare;
    }
    const entityCompare = left.entity.localeCompare(right.entity);
    if (entityCompare !== 0) {
      return entityCompare;
    }
    const typeCompare = left.changeType.localeCompare(right.changeType);
    if (typeCompare !== 0) {
      return typeCompare;
    }
    return left.key.localeCompare(right.key, undefined, { sensitivity: "base" });
  });
}

function mapByName<T extends { name: string }>(rows: T[]): Map<string, T> {
  const next = new Map<string, T>();
  for (const row of rows) {
    const key = canonicalKey(row.name);
    if (!key || next.has(key)) {
      continue;
    }
    next.set(key, row);
  }
  return next;
}

function mapByString<T>(rows: T[], keyResolver: (row: T) => string): Map<string, T> {
  const next = new Map<string, T>();
  for (const row of rows) {
    const key = canonicalKey(keyResolver(row));
    if (!key || next.has(key)) {
      continue;
    }
    next.set(key, row);
  }
  return next;
}

function tokenSimilarity(leftRaw: string, rightRaw: string): number {
  const left = canonicalKey(leftRaw).replace(/[^a-z0-9]+/g, "");
  const right = canonicalKey(rightRaw).replace(/[^a-z0-9]+/g, "");
  if (!left || !right) {
    return 0;
  }
  if (left === right) {
    return 1;
  }
  const leftBigrams = new Set<string>();
  for (let index = 0; index < left.length - 1; index += 1) {
    leftBigrams.add(left.slice(index, index + 2));
  }
  const rightBigrams = new Set<string>();
  for (let index = 0; index < right.length - 1; index += 1) {
    rightBigrams.add(right.slice(index, index + 2));
  }
  const intersection = [...leftBigrams].filter((entry) => rightBigrams.has(entry)).length;
  const denominator = leftBigrams.size + rightBigrams.size;
  if (denominator === 0) {
    return 0;
  }
  return (2 * intersection) / denominator;
}

function detectProbableRenames(
  removed: string[],
  added: string[],
  options?: {
    minConfidence?: number;
    typeMapBefore?: Record<string, string>;
    typeMapAfter?: Record<string, string>;
  }
): DiffProbableRename[] {
  const minConfidence = options?.minConfidence ?? 0.85;
  const matchedAdded = new Set<string>();
  const rows: DiffProbableRename[] = [];

  for (const fromName of removed) {
    let best: { to: string; confidence: number } | null = null;
    for (const toName of added) {
      if (matchedAdded.has(canonicalKey(toName))) {
        continue;
      }
      const confidence = tokenSimilarity(fromName, toName);
      if (!best || confidence > best.confidence) {
        best = { to: toName, confidence };
      }
    }
    if (!best || best.confidence < minConfidence) {
      continue;
    }
    const beforeType = options?.typeMapBefore?.[canonicalKey(fromName)];
    const afterType = options?.typeMapAfter?.[canonicalKey(best.to)];
    if (beforeType && afterType && canonicalKey(beforeType) !== canonicalKey(afterType)) {
      continue;
    }
    matchedAdded.add(canonicalKey(best.to));
    rows.push({
      from: fromName,
      to: best.to,
      confidence: Number(best.confidence.toFixed(3)),
      reason:
        beforeType && afterType
          ? `name similarity + matching type (${beforeType})`
          : "name similarity"
    });
  }

  rows.sort((left, right) => {
    if (right.confidence !== left.confidence) {
      return right.confidence - left.confidence;
    }
    const fromCompare = left.from.localeCompare(right.from, undefined, { sensitivity: "base" });
    if (fromCompare !== 0) {
      return fromCompare;
    }
    return left.to.localeCompare(right.to, undefined, { sensitivity: "base" });
  });
  return rows;
}

function indexFiles(snapshot: SchemaSnapshot): Map<string, SchemaSnapshotFile> {
  return mapByString(snapshot.files ?? [], (entry) => entry.fileId);
}

function relationshipSignature(entry: {
  leftFileId: string;
  leftTableOccurrence: string;
  rightFileId: string;
  rightTableOccurrence: string;
  predicate?: string;
}): string {
  return [
    canonicalKey(entry.leftFileId),
    canonicalKey(entry.leftTableOccurrence),
    canonicalKey(entry.rightFileId),
    canonicalKey(entry.rightTableOccurrence),
    canonicalKey(entry.predicate ?? "")
  ].join("|");
}

function fieldSignature(field: SchemaSnapshotField): string {
  return `${canonicalKey(field.type)}|${canonicalKey(field.options ?? "")}|${canonicalKey(field.fieldType ?? "")}`;
}

function listMissing(left: string[], right: string[]): string[] {
  const rightSet = new Set(right.map((entry) => canonicalKey(entry)));
  return left.filter((entry) => !rightSet.has(canonicalKey(entry)));
}

function mergeImpactedKeys(keys: string[], additions: string[]): string[] {
  return dedupeStrings([...keys, ...additions]);
}

export function diffSchemaSnapshots(baseline: SchemaSnapshot, target: SchemaSnapshot): SchemaDiffResult {
  const changes: DiffChangeEntry[] = [];
  const probableRenames: DiffProbableRename[] = [];
  let impactedKeys: string[] = [];

  const baselineFiles = indexFiles(baseline);
  const targetFiles = indexFiles(target);
  const allFileIds = dedupeStrings([
    ...[...baselineFiles.keys()],
    ...[...targetFiles.keys()]
  ]).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));

  for (const fileId of allFileIds) {
    const baselineFile = baselineFiles.get(canonicalKey(fileId)) ?? null;
    const targetFile = targetFiles.get(canonicalKey(fileId)) ?? null;
    if (!baselineFile && !targetFile) {
      continue;
    }
    if (!baselineFile && targetFile) {
      changes.push({
        key: `${fileId}`,
        fileId,
        entity: "tableOccurrence",
        changeType: "added",
        severity: "info",
        description: `File ${fileId} added to snapshot`,
        after: { databaseName: targetFile.databaseName }
      });
      impactedKeys = mergeImpactedKeys(impactedKeys, [`file:${fileId}`]);
      continue;
    }
    if (baselineFile && !targetFile) {
      changes.push({
        key: `${fileId}`,
        fileId,
        entity: "tableOccurrence",
        changeType: "removed",
        severity: "breaking",
        description: `File ${fileId} removed from snapshot`,
        before: { databaseName: baselineFile.databaseName }
      });
      impactedKeys = mergeImpactedKeys(impactedKeys, [`file:${fileId}`]);
      continue;
    }

    const leftFile = baselineFile as SchemaSnapshotFile;
    const rightFile = targetFile as SchemaSnapshotFile;

    const leftTables = mapByName(leftFile.tables);
    const rightTables = mapByName(rightFile.tables);
    const leftTableNames = [...leftTables.values()].map((entry) => entry.name);
    const rightTableNames = [...rightTables.values()].map((entry) => entry.name);
    const tablesRemoved = listMissing(leftTableNames, rightTableNames);
    const tablesAdded = listMissing(rightTableNames, leftTableNames);

    for (const tableName of tablesAdded) {
      changes.push({
        key: `${fileId}::table::${tableName}`,
        fileId,
        entity: "table",
        changeType: "added",
        severity: "info",
        description: `Table added: ${tableName}`
      });
      impactedKeys = mergeImpactedKeys(impactedKeys, [`table:${fileId}:${tableName}`]);
    }
    for (const tableName of tablesRemoved) {
      changes.push({
        key: `${fileId}::table::${tableName}`,
        fileId,
        entity: "table",
        changeType: "removed",
        severity: "breaking",
        description: `Table removed: ${tableName}`
      });
      impactedKeys = mergeImpactedKeys(impactedKeys, [`table:${fileId}:${tableName}`]);
    }

    const tableRenameCandidates = detectProbableRenames(tablesRemoved, tablesAdded, {
      minConfidence: 0.82
    });
    for (const entry of tableRenameCandidates) {
      probableRenames.push(entry);
      changes.push({
        key: `${fileId}::table::${entry.from}->${entry.to}`,
        fileId,
        entity: "table",
        changeType: "probable-rename",
        severity: "warn",
        description: `Probable table rename: ${entry.from} -> ${entry.to} (${entry.confidence})`,
        before: { name: entry.from },
        after: { name: entry.to, confidence: entry.confidence }
      });
      impactedKeys = mergeImpactedKeys(impactedKeys, [
        `table:${fileId}:${entry.from}`,
        `table:${fileId}:${entry.to}`
      ]);
    }

    const commonTableKeys = [...leftTables.keys()].filter((key) => rightTables.has(key));
    for (const tableKey of commonTableKeys) {
      const leftTable = leftTables.get(tableKey);
      const rightTable = rightTables.get(tableKey);
      if (!leftTable || !rightTable) {
        continue;
      }
      const leftFields = mapByName(leftTable.fields);
      const rightFields = mapByName(rightTable.fields);
      const leftFieldNames = [...leftFields.values()].map((entry) => entry.name);
      const rightFieldNames = [...rightFields.values()].map((entry) => entry.name);
      const removedFields = listMissing(leftFieldNames, rightFieldNames);
      const addedFields = listMissing(rightFieldNames, leftFieldNames);
      const leftTypeMap: Record<string, string> = {};
      const rightTypeMap: Record<string, string> = {};
      for (const field of leftTable.fields) {
        leftTypeMap[canonicalKey(field.name)] = field.type;
      }
      for (const field of rightTable.fields) {
        rightTypeMap[canonicalKey(field.name)] = field.type;
      }

      for (const fieldName of addedFields) {
        changes.push({
          key: `${fileId}::field::${leftTable.name}::${fieldName}`,
          fileId,
          entity: "field",
          changeType: "added",
          severity: "info",
          description: `Field added: ${leftTable.name}::${fieldName}`
        });
        impactedKeys = mergeImpactedKeys(impactedKeys, [`field:${fileId}:${leftTable.name}:${fieldName}`]);
      }
      for (const fieldName of removedFields) {
        changes.push({
          key: `${fileId}::field::${leftTable.name}::${fieldName}`,
          fileId,
          entity: "field",
          changeType: "removed",
          severity: "breaking",
          description: `Field removed: ${leftTable.name}::${fieldName}`
        });
        impactedKeys = mergeImpactedKeys(impactedKeys, [`field:${fileId}:${leftTable.name}:${fieldName}`]);
      }
      for (const entry of detectProbableRenames(removedFields, addedFields, {
        minConfidence: 0.86,
        typeMapBefore: leftTypeMap,
        typeMapAfter: rightTypeMap
      })) {
        probableRenames.push({
          ...entry,
          from: `${leftTable.name}::${entry.from}`,
          to: `${rightTable.name}::${entry.to}`
        });
        changes.push({
          key: `${fileId}::field::${leftTable.name}::${entry.from}->${entry.to}`,
          fileId,
          entity: "field",
          changeType: "probable-rename",
          severity: "warn",
          description: `Probable field rename: ${leftTable.name}::${entry.from} -> ${entry.to} (${entry.confidence})`
        });
      }

      const commonFieldKeys = [...leftFields.keys()].filter((key) => rightFields.has(key));
      for (const fieldKey of commonFieldKeys) {
        const leftField = leftFields.get(fieldKey);
        const rightField = rightFields.get(fieldKey);
        if (!leftField || !rightField) {
          continue;
        }
        if (fieldSignature(leftField) !== fieldSignature(rightField)) {
          if (canonicalKey(leftField.type) !== canonicalKey(rightField.type)) {
            changes.push({
              key: `${fileId}::field-type::${leftTable.name}::${leftField.name}`,
              fileId,
              entity: "field",
              changeType: "type-changed",
              severity: "breaking",
              description: `Field type changed: ${leftTable.name}::${leftField.name} (${leftField.type} -> ${rightField.type})`,
              before: { type: leftField.type, options: leftField.options },
              after: { type: rightField.type, options: rightField.options }
            });
          } else {
            changes.push({
              key: `${fileId}::field-options::${leftTable.name}::${leftField.name}`,
              fileId,
              entity: "field",
              changeType: "options-changed",
              severity: "warn",
              description: `Field options changed: ${leftTable.name}::${leftField.name}`,
              before: { options: leftField.options },
              after: { options: rightField.options }
            });
          }
          impactedKeys = mergeImpactedKeys(impactedKeys, [`field:${fileId}:${leftTable.name}:${leftField.name}`]);
        }
      }
    }

    const leftTo = mapByName(leftFile.tableOccurrences);
    const rightTo = mapByName(rightFile.tableOccurrences);
    const leftToNames = [...leftTo.values()].map((entry) => entry.name);
    const rightToNames = [...rightTo.values()].map((entry) => entry.name);
    for (const name of listMissing(rightToNames, leftToNames)) {
      changes.push({
        key: `${fileId}::to::${name}`,
        fileId,
        entity: "tableOccurrence",
        changeType: "added",
        severity: "info",
        description: `Table occurrence added: ${name}`
      });
      impactedKeys = mergeImpactedKeys(impactedKeys, [`to:${fileId}:${name}`]);
    }
    for (const name of listMissing(leftToNames, rightToNames)) {
      changes.push({
        key: `${fileId}::to::${name}`,
        fileId,
        entity: "tableOccurrence",
        changeType: "removed",
        severity: "breaking",
        description: `Table occurrence removed: ${name}`
      });
      impactedKeys = mergeImpactedKeys(impactedKeys, [`to:${fileId}:${name}`]);
    }
    for (const key of [...leftTo.keys()].filter((entry) => rightTo.has(entry))) {
      const leftEntry = leftTo.get(key);
      const rightEntry = rightTo.get(key);
      if (!leftEntry || !rightEntry) {
        continue;
      }
      if (canonicalKey(leftEntry.baseTableName ?? "") !== canonicalKey(rightEntry.baseTableName ?? "")) {
        changes.push({
          key: `${fileId}::to-base::${leftEntry.name}`,
          fileId,
          entity: "tableOccurrence",
          changeType: "base-changed",
          severity: "breaking",
          description: `Table occurrence base changed: ${leftEntry.name}`,
          before: { baseTable: leftEntry.baseTableName },
          after: { baseTable: rightEntry.baseTableName }
        });
        impactedKeys = mergeImpactedKeys(impactedKeys, [`to:${fileId}:${leftEntry.name}`]);
      }
    }

    const leftRelationships = mapByString(leftFile.relationships, (entry) => relationshipSignature(entry));
    const rightRelationships = mapByString(rightFile.relationships, (entry) => relationshipSignature(entry));
    for (const key of [...rightRelationships.keys()]) {
      if (leftRelationships.has(key)) {
        continue;
      }
      const relationship = rightRelationships.get(key);
      if (!relationship) {
        continue;
      }
      changes.push({
        key: `${fileId}::relationship::${relationship.id || key}`,
        fileId,
        entity: "relationship",
        changeType: "added",
        severity: "info",
        description: `Relationship added: ${relationship.leftTableOccurrence} -> ${relationship.rightTableOccurrence}`
      });
    }
    for (const key of [...leftRelationships.keys()]) {
      if (rightRelationships.has(key)) {
        continue;
      }
      const relationship = leftRelationships.get(key);
      if (!relationship) {
        continue;
      }
      changes.push({
        key: `${fileId}::relationship::${relationship.id || key}`,
        fileId,
        entity: "relationship",
        changeType: "removed",
        severity: "breaking",
        description: `Relationship removed: ${relationship.leftTableOccurrence} -> ${relationship.rightTableOccurrence}`
      });
      impactedKeys = mergeImpactedKeys(impactedKeys, [
        `to:${fileId}:${relationship.leftTableOccurrence}`,
        `to:${fileId}:${relationship.rightTableOccurrence}`
      ]);
    }

    const leftValueLists = mapByName(leftFile.valueLists);
    const rightValueLists = mapByName(rightFile.valueLists);
    for (const name of listMissing([...rightValueLists.values()].map((entry) => entry.name), [...leftValueLists.values()].map((entry) => entry.name))) {
      changes.push({
        key: `${fileId}::valueList::${name}`,
        fileId,
        entity: "valueList",
        changeType: "added",
        severity: "info",
        description: `Value list added: ${name}`
      });
    }
    for (const name of listMissing([...leftValueLists.values()].map((entry) => entry.name), [...rightValueLists.values()].map((entry) => entry.name))) {
      changes.push({
        key: `${fileId}::valueList::${name}`,
        fileId,
        entity: "valueList",
        changeType: "removed",
        severity: "breaking",
        description: `Value list removed: ${name}`
      });
      impactedKeys = mergeImpactedKeys(impactedKeys, [`valueList:${fileId}:${name}`]);
    }
    for (const key of [...leftValueLists.keys()].filter((entry) => rightValueLists.has(entry))) {
      const leftValueList = leftValueLists.get(key);
      const rightValueList = rightValueLists.get(key);
      if (!leftValueList || !rightValueList) {
        continue;
      }
      const leftSignature = [
        canonicalKey(leftValueList.source ?? ""),
        dedupeStrings(leftValueList.values).map((entry) => canonicalKey(entry)).join("|"),
        dedupeStrings(leftValueList.sourceFields).map((entry) => canonicalKey(entry)).join("|")
      ].join("::");
      const rightSignature = [
        canonicalKey(rightValueList.source ?? ""),
        dedupeStrings(rightValueList.values).map((entry) => canonicalKey(entry)).join("|"),
        dedupeStrings(rightValueList.sourceFields).map((entry) => canonicalKey(entry)).join("|")
      ].join("::");
      if (leftSignature !== rightSignature) {
        changes.push({
          key: `${fileId}::valueList-change::${leftValueList.name}`,
          fileId,
          entity: "valueList",
          changeType: "options-changed",
          severity: "warn",
          description: `Value list changed: ${leftValueList.name}`,
          before: {
            source: leftValueList.source,
            values: leftValueList.values,
            sourceFields: leftValueList.sourceFields
          },
          after: {
            source: rightValueList.source,
            values: rightValueList.values,
            sourceFields: rightValueList.sourceFields
          }
        });
      }
    }

    const leftLayouts = mapByName(leftFile.layouts.map((entry) => ({ ...entry, name: entry.layoutName })));
    const rightLayouts = mapByName(rightFile.layouts.map((entry) => ({ ...entry, name: entry.layoutName })));
    for (const key of [...leftLayouts.keys()].filter((entry) => rightLayouts.has(entry))) {
      const leftLayout = leftLayouts.get(key);
      const rightLayout = rightLayouts.get(key);
      if (!leftLayout || !rightLayout) {
        continue;
      }
      const leftBinding = [
        canonicalKey(leftLayout.baseTableOccurrence),
        dedupeStrings(leftLayout.referencedFields).map((entry) => canonicalKey(entry)).join("|"),
        dedupeStrings(leftLayout.referencedValueLists).map((entry) => canonicalKey(entry)).join("|")
      ].join("::");
      const rightBinding = [
        canonicalKey(rightLayout.baseTableOccurrence),
        dedupeStrings(rightLayout.referencedFields).map((entry) => canonicalKey(entry)).join("|"),
        dedupeStrings(rightLayout.referencedValueLists).map((entry) => canonicalKey(entry)).join("|")
      ].join("::");
      if (leftBinding !== rightBinding) {
        changes.push({
          key: `${fileId}::layout::${leftLayout.layoutName}`,
          fileId,
          entity: "layout",
          changeType: "binding-changed",
          severity: "warn",
          description: `Layout binding changed: ${leftLayout.layoutName}`
        });
      }
    }

    const leftScripts = mapByName(leftFile.scripts.map((entry) => ({ ...entry, name: entry.scriptName })));
    const rightScripts = mapByName(rightFile.scripts.map((entry) => ({ ...entry, name: entry.scriptName })));
    for (const key of [...leftScripts.keys()].filter((entry) => rightScripts.has(entry))) {
      const leftScript = leftScripts.get(key);
      const rightScript = rightScripts.get(key);
      if (!leftScript || !rightScript) {
        continue;
      }
      const leftBinding = [
        dedupeStrings(leftScript.referencedFields).map((entry) => canonicalKey(entry)).join("|"),
        dedupeStrings(leftScript.referencedLayouts).map((entry) => canonicalKey(entry)).join("|")
      ].join("::");
      const rightBinding = [
        dedupeStrings(rightScript.referencedFields).map((entry) => canonicalKey(entry)).join("|"),
        dedupeStrings(rightScript.referencedLayouts).map((entry) => canonicalKey(entry)).join("|")
      ].join("::");
      if (leftBinding !== rightBinding) {
        changes.push({
          key: `${fileId}::script::${leftScript.scriptName}`,
          fileId,
          entity: "script",
          changeType: "binding-changed",
          severity: "warn",
          description: `Script references changed: ${leftScript.scriptName}`
        });
      }
    }
  }

  const sortedChanges = sortChanges(changes);
  const breakingChanges = sortedChanges.filter((entry) => entry.severity === "breaking").length;
  const warnings = sortedChanges.filter((entry) => entry.severity === "warn").length;
  const info = sortedChanges.filter((entry) => entry.severity === "info").length;

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    baselineSnapshotId: baseline.snapshotId,
    targetSnapshotId: target.snapshotId,
    summary: {
      totalChanges: sortedChanges.length,
      breakingChanges,
      warnings,
      info,
      filesChanged: dedupeStrings(sortedChanges.map((entry) => entry.fileId)).length,
      tablesAdded: sortedChanges.filter((entry) => entry.entity === "table" && entry.changeType === "added").length,
      tablesRemoved: sortedChanges.filter((entry) => entry.entity === "table" && entry.changeType === "removed").length,
      fieldsAdded: sortedChanges.filter((entry) => entry.entity === "field" && entry.changeType === "added").length,
      fieldsRemoved: sortedChanges.filter((entry) => entry.entity === "field" && entry.changeType === "removed").length,
      fieldsTypeChanged: sortedChanges.filter((entry) => entry.entity === "field" && entry.changeType === "type-changed").length,
      relationshipsAdded: sortedChanges.filter((entry) => entry.entity === "relationship" && entry.changeType === "added").length,
      relationshipsRemoved: sortedChanges.filter((entry) => entry.entity === "relationship" && entry.changeType === "removed").length,
      valueListsAdded: sortedChanges.filter((entry) => entry.entity === "valueList" && entry.changeType === "added").length,
      valueListsRemoved: sortedChanges.filter((entry) => entry.entity === "valueList" && entry.changeType === "removed").length
    },
    probableRenames: probableRenames.sort((left, right) => {
      if (right.confidence !== left.confidence) {
        return right.confidence - left.confidence;
      }
      const fromCompare = left.from.localeCompare(right.from, undefined, { sensitivity: "base" });
      if (fromCompare !== 0) {
        return fromCompare;
      }
      return left.to.localeCompare(right.to, undefined, { sensitivity: "base" });
    }),
    changes: sortedChanges,
    impactedEntityKeys: dedupeStrings(impactedKeys).sort((left, right) =>
      left.localeCompare(right, undefined, { sensitivity: "base" })
    )
  };
}

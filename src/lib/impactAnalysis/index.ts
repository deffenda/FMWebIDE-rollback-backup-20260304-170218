import type { DiffChangeEntry, SchemaDiffResult } from "../schemaDiff/types.ts";
import type {
  SchemaSnapshot,
  SchemaSnapshotFile,
  SchemaSnapshotLayoutRef,
  SchemaSnapshotScriptRef
} from "../schemaSnapshot/types.ts";
import type {
  AnalyzeImpactInput,
  AnalyzeImpactOptions,
  ImpactItem,
  ImpactReport,
  ImpactSeverity,
  WorkspaceReferenceEntry,
  WorkspaceReferenceIndex
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

function sortByName<T extends { entityName: string; entityId: string; relation: string }>(rows: T[]): T[] {
  return [...rows].sort((left, right) => {
    const nameCompare = left.entityName.localeCompare(right.entityName, undefined, { sensitivity: "base" });
    if (nameCompare !== 0) {
      return nameCompare;
    }
    const idCompare = left.entityId.localeCompare(right.entityId, undefined, { sensitivity: "base" });
    if (idCompare !== 0) {
      return idCompare;
    }
    return left.relation.localeCompare(right.relation, undefined, { sensitivity: "base" });
  });
}

function ensureReferenceBucket(
  target: Record<string, WorkspaceReferenceEntry[]>,
  impactedEntityKey: string
): WorkspaceReferenceEntry[] {
  const key = canonicalKey(impactedEntityKey);
  const rows = target[key];
  if (rows) {
    return rows;
  }
  const created: WorkspaceReferenceEntry[] = [];
  target[key] = created;
  return created;
}

function addReference(
  target: Record<string, WorkspaceReferenceEntry[]>,
  impactedEntityKey: string,
  entry: Omit<WorkspaceReferenceEntry, "key">
): void {
  const rows = ensureReferenceBucket(target, impactedEntityKey);
  const next: WorkspaceReferenceEntry = {
    key: canonicalKey(impactedEntityKey),
    ...entry
  };
  const duplicate = rows.some(
    (candidate) =>
      candidate.fileId === next.fileId &&
      candidate.entityType === next.entityType &&
      candidate.entityId === next.entityId &&
      candidate.entityName === next.entityName &&
      candidate.relation === next.relation
  );
  if (!duplicate) {
    rows.push(next);
  }
}

function splitFieldRef(value: string): { tableOccurrence: string; fieldName: string } {
  const cleaned = cleanToken(value);
  const marker = cleaned.indexOf("::");
  if (marker <= 0) {
    return {
      tableOccurrence: "",
      fieldName: cleaned
    };
  }
  return {
    tableOccurrence: cleaned.slice(0, marker).trim(),
    fieldName: cleaned.slice(marker + 2).trim()
  };
}

function toToTableMap(file: SchemaSnapshotFile): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of file.tableOccurrences ?? []) {
    const toName = cleanToken(entry.name);
    const tableName = cleanToken(entry.baseTableName ?? entry.baseTableId);
    if (!toName || !tableName) {
      continue;
    }
    const key = canonicalKey(toName);
    if (!map.has(key)) {
      map.set(key, tableName);
    }
  }
  return map;
}

function addLayoutReferences(
  index: Record<string, WorkspaceReferenceEntry[]>,
  file: SchemaSnapshotFile,
  layout: SchemaSnapshotLayoutRef,
  toTableMap: Map<string, string>
): void {
  const fileId = file.fileId;
  const layoutName = cleanToken(layout.layoutName);
  const layoutId = cleanToken(layout.layoutId) || layoutName;
  const baseTo = cleanToken(layout.baseTableOccurrence);

  addReference(index, `layout:${fileId}:${layoutName}`, {
    fileId,
    entityType: "layout",
    entityId: layoutId,
    entityName: layoutName,
    relation: "layout-self"
  });
  addReference(index, `file:${fileId}`, {
    fileId,
    entityType: "layout",
    entityId: layoutId,
    entityName: layoutName,
    relation: "layout-file"
  });

  if (baseTo) {
    addReference(index, `to:${fileId}:${baseTo}`, {
      fileId,
      entityType: "layout",
      entityId: layoutId,
      entityName: layoutName,
      relation: "layout-base-to"
    });
    const baseTable = toTableMap.get(canonicalKey(baseTo));
    if (baseTable) {
      addReference(index, `table:${fileId}:${baseTable}`, {
        fileId,
        entityType: "layout",
        entityId: layoutId,
        entityName: layoutName,
        relation: "layout-base-table"
      });
    }
  }

  for (const toName of layout.referencedTableOccurrences ?? []) {
    const cleanedTo = cleanToken(toName);
    if (!cleanedTo) {
      continue;
    }
    addReference(index, `to:${fileId}:${cleanedTo}`, {
      fileId,
      entityType: "layout",
      entityId: layoutId,
      entityName: layoutName,
      relation: "layout-referenced-to"
    });
    const tableName = toTableMap.get(canonicalKey(cleanedTo));
    if (tableName) {
      addReference(index, `table:${fileId}:${tableName}`, {
        fileId,
        entityType: "layout",
        entityId: layoutId,
        entityName: layoutName,
        relation: "layout-referenced-table"
      });
    }
  }

  for (const fieldRef of layout.referencedFields ?? []) {
    const parsed = splitFieldRef(fieldRef);
    const fieldName = cleanToken(parsed.fieldName);
    if (!fieldName) {
      continue;
    }
    const resolvedTo = cleanToken(parsed.tableOccurrence) || baseTo;
    const tableName = resolvedTo ? toTableMap.get(canonicalKey(resolvedTo)) : undefined;
    if (tableName) {
      addReference(index, `field:${fileId}:${tableName}:${fieldName}`, {
        fileId,
        entityType: "layout",
        entityId: layoutId,
        entityName: layoutName,
        relation: "layout-field"
      });
    } else if (resolvedTo) {
      addReference(index, `field:${fileId}:${resolvedTo}:${fieldName}`, {
        fileId,
        entityType: "layout",
        entityId: layoutId,
        entityName: layoutName,
        relation: "layout-field-unresolved-table"
      });
    }
  }

  for (const valueListName of layout.referencedValueLists ?? []) {
    const cleanedName = cleanToken(valueListName);
    if (!cleanedName) {
      continue;
    }
    addReference(index, `valueList:${fileId}:${cleanedName}`, {
      fileId,
      entityType: "layout",
      entityId: layoutId,
      entityName: layoutName,
      relation: "layout-value-list"
    });
  }

  for (const portal of layout.portals ?? []) {
    const portalLabel = cleanToken(portal.componentId) || `${layoutId}:portal`;
    const portalEntityId = `${layoutId}:${portalLabel}`;
    const portalTo = cleanToken(portal.tableOccurrence);
    if (portalTo) {
      addReference(index, `to:${fileId}:${portalTo}`, {
        fileId,
        entityType: "portal",
        entityId: portalEntityId,
        entityName: `${layoutName} › ${portalLabel}`,
        relation: "portal-table-occurrence"
      });
      const tableName = toTableMap.get(canonicalKey(portalTo));
      if (tableName) {
        addReference(index, `table:${fileId}:${tableName}`, {
          fileId,
          entityType: "portal",
          entityId: portalEntityId,
          entityName: `${layoutName} › ${portalLabel}`,
          relation: "portal-table"
        });
      }
      for (const rowField of portal.rowFields ?? []) {
        const cleanedField = cleanToken(rowField);
        if (!cleanedField) {
          continue;
        }
        if (tableName) {
          addReference(index, `field:${fileId}:${tableName}:${cleanedField}`, {
            fileId,
            entityType: "portal",
            entityId: portalEntityId,
            entityName: `${layoutName} › ${portalLabel}`,
            relation: "portal-row-field"
          });
        }
      }
    }
  }
}

function addScriptReferences(
  index: Record<string, WorkspaceReferenceEntry[]>,
  file: SchemaSnapshotFile,
  script: SchemaSnapshotScriptRef,
  toTableMap: Map<string, string>
): void {
  const fileId = file.fileId;
  const scriptName = cleanToken(script.scriptName);
  const scriptId = cleanToken(script.scriptId) || scriptName;
  addReference(index, `script:${fileId}:${scriptName}`, {
    fileId,
    entityType: "script",
    entityId: scriptId,
    entityName: scriptName,
    relation: "script-self"
  });
  addReference(index, `file:${fileId}`, {
    fileId,
    entityType: "script",
    entityId: scriptId,
    entityName: scriptName,
    relation: "script-file"
  });

  for (const layoutName of script.referencedLayouts ?? []) {
    const cleaned = cleanToken(layoutName);
    if (!cleaned) {
      continue;
    }
    addReference(index, `layout:${fileId}:${cleaned}`, {
      fileId,
      entityType: "script",
      entityId: scriptId,
      entityName: scriptName,
      relation: "script-layout"
    });
  }

  for (const toName of script.referencedTableOccurrences ?? []) {
    const cleanedTo = cleanToken(toName);
    if (!cleanedTo) {
      continue;
    }
    addReference(index, `to:${fileId}:${cleanedTo}`, {
      fileId,
      entityType: "script",
      entityId: scriptId,
      entityName: scriptName,
      relation: "script-table-occurrence"
    });
    const tableName = toTableMap.get(canonicalKey(cleanedTo));
    if (tableName) {
      addReference(index, `table:${fileId}:${tableName}`, {
        fileId,
        entityType: "script",
        entityId: scriptId,
        entityName: scriptName,
        relation: "script-table"
      });
    }
  }

  for (const fieldRef of script.referencedFields ?? []) {
    const parsed = splitFieldRef(fieldRef);
    const fieldName = cleanToken(parsed.fieldName);
    const toName = cleanToken(parsed.tableOccurrence);
    if (!fieldName || !toName) {
      continue;
    }
    const tableName = toTableMap.get(canonicalKey(toName));
    if (tableName) {
      addReference(index, `field:${fileId}:${tableName}:${fieldName}`, {
        fileId,
        entityType: "script",
        entityId: scriptId,
        entityName: scriptName,
        relation: "script-field"
      });
    } else {
      addReference(index, `field:${fileId}:${toName}:${fieldName}`, {
        fileId,
        entityType: "script",
        entityId: scriptId,
        entityName: scriptName,
        relation: "script-field-unresolved-table"
      });
    }
  }
}

export function buildWorkspaceReferenceIndex(snapshot: SchemaSnapshot): WorkspaceReferenceIndex {
  const byEntityKey: Record<string, WorkspaceReferenceEntry[]> = {};
  for (const file of snapshot.files ?? []) {
    const toTableMap = toToTableMap(file);
    for (const layout of file.layouts ?? []) {
      addLayoutReferences(byEntityKey, file, layout, toTableMap);
    }
    for (const script of file.scripts ?? []) {
      addScriptReferences(byEntityKey, file, script, toTableMap);
    }
    for (const valueList of file.valueLists ?? []) {
      const valueListName = cleanToken(valueList.name);
      if (!valueListName) {
        continue;
      }
      addReference(byEntityKey, `valueList:${file.fileId}:${valueListName}`, {
        fileId: file.fileId,
        entityType: "valueList",
        entityId: cleanToken(valueList.id) || valueListName,
        entityName: valueListName,
        relation: "value-list-self"
      });
    }
  }

  for (const impactedKey of Object.keys(byEntityKey)) {
    byEntityKey[impactedKey] = sortByName(byEntityKey[impactedKey]);
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    workspaceId: snapshot.workspaceId,
    snapshotId: snapshot.snapshotId,
    byEntityKey
  };
}

function computeChangeScoreForKey(impactedKey: string, change: DiffChangeEntry): number {
  const key = canonicalKey(impactedKey);
  const filePrefix = `file:${canonicalKey(change.fileId)}`;
  if (key === filePrefix) {
    return 3;
  }
  const tableMatch = change.description.match(/([A-Za-z0-9_.:-]+)::([A-Za-z0-9_.:-]+)/);
  const entityToken = `${change.entity}:${canonicalKey(change.fileId)}`;
  if (tableMatch) {
    const left = canonicalKey(tableMatch[1]);
    const right = canonicalKey(tableMatch[2]);
    if (key.includes(left) && key.includes(right)) {
      return 5;
    }
    if (key.includes(left) || key.includes(right)) {
      return 4;
    }
  }
  if (key.startsWith(entityToken)) {
    return 4;
  }
  if (key.includes(canonicalKey(change.fileId))) {
    return 2;
  }
  return 0;
}

function resolveRelatedChanges(impactedKey: string, diffResult: SchemaDiffResult): DiffChangeEntry[] {
  const scored = (diffResult.changes ?? [])
    .map((change) => ({
      change,
      score: computeChangeScoreForKey(impactedKey, change)
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      if (left.change.severity !== right.change.severity) {
        const weight = (severity: DiffChangeEntry["severity"]): number =>
          severity === "breaking" ? 0 : severity === "warn" ? 1 : 2;
        return weight(left.change.severity) - weight(right.change.severity);
      }
      return left.change.key.localeCompare(right.change.key, undefined, { sensitivity: "base" });
    });
  return scored.map((entry) => entry.change);
}

function recommendationForReference(
  reference: WorkspaceReferenceEntry,
  relatedChanges: DiffChangeEntry[]
): string {
  if (reference.entityType === "layout") {
    return "Open the layout in Layout Mode and repair field/table occurrence bindings.";
  }
  if (reference.entityType === "script") {
    return "Review script steps and update field/layout references before deployment.";
  }
  if (reference.entityType === "valueList") {
    return "Rebuild the value list source or remap controls to an available value list.";
  }
  if (reference.entityType === "portal") {
    return "Review portal TO/row-field bindings and update relationship mapping.";
  }
  const hasBreaking = relatedChanges.some((entry) => entry.severity === "breaking");
  if (hasBreaking) {
    return "Resolve blocker changes before applying this migration.";
  }
  return "Review impacted metadata and confirm expected behavior.";
}

function mostSevereImpact(changes: DiffChangeEntry[]): ImpactSeverity {
  if (changes.some((entry) => entry.severity === "breaking")) {
    return "blocker";
  }
  if (changes.some((entry) => entry.severity === "warn")) {
    return "warn";
  }
  return "info";
}

function normalizeAnalyzeOptions(options?: AnalyzeImpactOptions): Required<AnalyzeImpactOptions> {
  const includeInfoItems = options?.includeInfoItems ?? true;
  const maxItemsRaw = Number(options?.maxItems ?? 0);
  return {
    includeInfoItems,
    maxItems: Number.isFinite(maxItemsRaw) && maxItemsRaw > 0 ? Math.round(maxItemsRaw) : Number.POSITIVE_INFINITY
  };
}

export function analyzeDiffImpact(input: AnalyzeImpactInput): ImpactReport {
  const {
    baselineSnapshot,
    targetSnapshot,
    diffResult,
    referenceIndex = buildWorkspaceReferenceIndex(targetSnapshot),
    options
  } = input;
  const normalizedOptions = normalizeAnalyzeOptions(options);
  const items: ImpactItem[] = [];
  const unmatchedImpactedKeys: string[] = [];

  for (const impactedKey of diffResult.impactedEntityKeys ?? []) {
    const references = referenceIndex.byEntityKey[canonicalKey(impactedKey)] ?? [];
    if (references.length === 0) {
      unmatchedImpactedKeys.push(impactedKey);
      continue;
    }
    const relatedChanges = resolveRelatedChanges(impactedKey, diffResult);
    const severity = mostSevereImpact(relatedChanges);
    if (severity === "info" && !normalizedOptions.includeInfoItems) {
      continue;
    }
    for (const reference of references) {
      const effectiveSeverity = relatedChanges.length > 0 ? severity : "warn";
      if (effectiveSeverity === "info" && !normalizedOptions.includeInfoItems) {
        continue;
      }
      items.push({
        id: `${reference.entityType}:${reference.entityId}:${canonicalKey(impactedKey)}`,
        severity: effectiveSeverity,
        fileId: reference.fileId,
        impactedEntityKey: impactedKey,
        entityType: reference.entityType,
        entityId: reference.entityId,
        entityName: reference.entityName,
        relation: reference.relation,
        reason:
          relatedChanges.length > 0
            ? relatedChanges.map((entry) => entry.description).join(" | ")
            : `Reference is linked to changed key ${impactedKey}`,
        recommendedAction: recommendationForReference(reference, relatedChanges),
        relatedChanges: relatedChanges.map((entry) => entry.key)
      });
    }
  }

  const sorted = items
    .sort((left, right) => {
      const weight = (severity: ImpactSeverity): number =>
        severity === "blocker" ? 0 : severity === "warn" ? 1 : 2;
      const severityCompare = weight(left.severity) - weight(right.severity);
      if (severityCompare !== 0) {
        return severityCompare;
      }
      const fileCompare = left.fileId.localeCompare(right.fileId, undefined, { sensitivity: "base" });
      if (fileCompare !== 0) {
        return fileCompare;
      }
      const entityCompare = left.entityType.localeCompare(right.entityType, undefined, { sensitivity: "base" });
      if (entityCompare !== 0) {
        return entityCompare;
      }
      return left.entityName.localeCompare(right.entityName, undefined, { sensitivity: "base" });
    })
    .slice(0, normalizedOptions.maxItems);

  const recommendations = dedupeStrings(sorted.map((entry) => entry.recommendedAction));
  const blockers = sorted.filter((entry) => entry.severity === "blocker").length;
  const warnings = sorted.filter((entry) => entry.severity === "warn").length;
  const info = sorted.filter((entry) => entry.severity === "info").length;

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    workspaceId: targetSnapshot.workspaceId,
    baselineSnapshotId: baselineSnapshot.snapshotId,
    targetSnapshotId: targetSnapshot.snapshotId,
    summary: {
      total: sorted.length,
      blockers,
      warnings,
      info,
      layoutsAffected: new Set(sorted.filter((entry) => entry.entityType === "layout").map((entry) => entry.entityId))
        .size,
      scriptsAffected: new Set(sorted.filter((entry) => entry.entityType === "script").map((entry) => entry.entityId))
        .size,
      valueListsAffected: new Set(
        sorted.filter((entry) => entry.entityType === "valueList").map((entry) => entry.entityId)
      ).size,
      menusAffected: new Set(sorted.filter((entry) => entry.entityType === "menu").map((entry) => entry.entityId)).size,
      portalsAffected: new Set(sorted.filter((entry) => entry.entityType === "portal").map((entry) => entry.entityId))
        .size
    },
    impacts: sorted,
    recommendations,
    unmatchedImpactedKeys: dedupeStrings(unmatchedImpactedKeys).sort((left, right) =>
      left.localeCompare(right, undefined, { sensitivity: "base" })
    )
  };
}

export function analyzeDiffImpactWithGeneratedIndex(
  baselineSnapshot: SchemaSnapshot,
  targetSnapshot: SchemaSnapshot,
  diffResult: SchemaDiffResult,
  options?: AnalyzeImpactOptions
): ImpactReport {
  const referenceIndex = buildWorkspaceReferenceIndex(targetSnapshot);
  return analyzeDiffImpact({
    baselineSnapshot,
    targetSnapshot,
    diffResult,
    referenceIndex,
    options
  });
}

export type { AnalyzeImpactInput, AnalyzeImpactOptions, ImpactItem, ImpactReport, WorkspaceReferenceIndex };

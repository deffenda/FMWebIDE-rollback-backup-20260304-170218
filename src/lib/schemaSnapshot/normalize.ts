import type {
  SchemaSnapshot,
  SchemaSnapshotField,
  SchemaSnapshotFile,
  SchemaSnapshotLayoutRef,
  SchemaSnapshotPortalRef,
  SchemaSnapshotRelationship,
  SchemaSnapshotScriptRef,
  SchemaSnapshotTable,
  SchemaSnapshotTableOccurrence,
  SchemaSnapshotValueList
} from "./types";

function normalizeText(value: unknown): string {
  return String(value ?? "").trim();
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const value of values) {
    const cleaned = normalizeText(value);
    if (!cleaned) {
      continue;
    }
    const key = cleaned.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    ordered.push(cleaned);
  }
  return ordered;
}

function sortByName<T extends Record<string, unknown>>(rows: T[]): T[] {
  return [...rows].sort((left, right) => {
    const leftName = normalizeText(left.name ?? left.layoutName ?? left.scriptName ?? left.fileId ?? left.id);
    const rightName = normalizeText(right.name ?? right.layoutName ?? right.scriptName ?? right.fileId ?? right.id);
    const compare = leftName.localeCompare(rightName, undefined, { sensitivity: "base" });
    if (compare !== 0) {
      return compare;
    }
    return JSON.stringify(left).localeCompare(JSON.stringify(right));
  });
}

function sortById<T extends { id: string }>(rows: T[]): T[] {
  return [...rows].sort((left, right) => {
    const compare = left.id.localeCompare(right.id, undefined, { sensitivity: "base" });
    if (compare !== 0) {
      return compare;
    }
    return JSON.stringify(left).localeCompare(JSON.stringify(right));
  });
}

function normalizeField(field: SchemaSnapshotField): SchemaSnapshotField {
  return {
    id: normalizeText(field.id) || normalizeText(field.name),
    name: normalizeText(field.name),
    type: normalizeText(field.type) || "Text",
    fieldType: normalizeText(field.fieldType) || undefined,
    options: normalizeText(field.options) || undefined,
    comment: normalizeText(field.comment) || undefined,
    source: normalizeText(field.source) || undefined
  };
}

function normalizeTable(table: SchemaSnapshotTable): SchemaSnapshotTable {
  return {
    id: normalizeText(table.id) || normalizeText(table.name),
    name: normalizeText(table.name),
    source: normalizeText(table.source) || undefined,
    comment: normalizeText(table.comment) || undefined,
    fields: sortByName(table.fields.map((field) => normalizeField(field)).filter((field) => field.name.length > 0))
  };
}

function normalizeTableOccurrence(entry: SchemaSnapshotTableOccurrence): SchemaSnapshotTableOccurrence {
  return {
    id: normalizeText(entry.id) || normalizeText(entry.name),
    name: normalizeText(entry.name),
    baseTableId: normalizeText(entry.baseTableId) || undefined,
    baseTableName: normalizeText(entry.baseTableName) || undefined,
    apiLayoutName: normalizeText(entry.apiLayoutName) || undefined,
    relationshipTargets: dedupeStrings(entry.relationshipTargets ?? []),
    x: Number.isFinite(entry.x) ? entry.x : undefined,
    y: Number.isFinite(entry.y) ? entry.y : undefined,
    width: Number.isFinite(entry.width) ? entry.width : undefined,
    height: Number.isFinite(entry.height) ? entry.height : undefined
  };
}

function normalizeRelationship(entry: SchemaSnapshotRelationship): SchemaSnapshotRelationship {
  return {
    id: normalizeText(entry.id),
    leftFileId: normalizeText(entry.leftFileId),
    leftTableOccurrence: normalizeText(entry.leftTableOccurrence),
    rightFileId: normalizeText(entry.rightFileId),
    rightTableOccurrence: normalizeText(entry.rightTableOccurrence),
    predicate: normalizeText(entry.predicate) || undefined,
    leftField: normalizeText(entry.leftField) || undefined,
    rightField: normalizeText(entry.rightField) || undefined
  };
}

function normalizeValueList(entry: SchemaSnapshotValueList): SchemaSnapshotValueList {
  return {
    id: normalizeText(entry.id) || normalizeText(entry.name),
    name: normalizeText(entry.name),
    source: normalizeText(entry.source) || undefined,
    sourceFields: dedupeStrings(entry.sourceFields ?? []),
    values: dedupeStrings(entry.values ?? [])
  };
}

function normalizePortalRef(entry: SchemaSnapshotPortalRef): SchemaSnapshotPortalRef {
  return {
    componentId: normalizeText(entry.componentId),
    tableOccurrence: normalizeText(entry.tableOccurrence),
    rowFields: dedupeStrings(entry.rowFields ?? [])
  };
}

function normalizeLayoutRef(entry: SchemaSnapshotLayoutRef): SchemaSnapshotLayoutRef {
  return {
    layoutId: normalizeText(entry.layoutId),
    layoutName: normalizeText(entry.layoutName),
    baseTableOccurrence: normalizeText(entry.baseTableOccurrence),
    baseTable: normalizeText(entry.baseTable) || undefined,
    apiLayoutName: normalizeText(entry.apiLayoutName) || undefined,
    referencedFields: dedupeStrings(entry.referencedFields ?? []),
    referencedTableOccurrences: dedupeStrings(entry.referencedTableOccurrences ?? []),
    referencedValueLists: dedupeStrings(entry.referencedValueLists ?? []),
    portals: [...(entry.portals ?? []).map((portal) => normalizePortalRef(portal))].sort((left, right) =>
      left.componentId.localeCompare(right.componentId, undefined, { sensitivity: "base" })
    )
  };
}

function normalizeScriptRef(entry: SchemaSnapshotScriptRef): SchemaSnapshotScriptRef {
  return {
    scriptId: normalizeText(entry.scriptId),
    scriptName: normalizeText(entry.scriptName),
    referencedFields: dedupeStrings(entry.referencedFields ?? []),
    referencedLayouts: dedupeStrings(entry.referencedLayouts ?? []),
    referencedTableOccurrences: dedupeStrings(entry.referencedTableOccurrences ?? []),
    stepCount: Number.isFinite(entry.stepCount) ? Math.max(0, Math.round(entry.stepCount)) : 0
  };
}

function normalizeFile(entry: SchemaSnapshotFile): SchemaSnapshotFile {
  return {
    fileId: normalizeText(entry.fileId),
    workspaceId: normalizeText(entry.workspaceId),
    displayName: normalizeText(entry.displayName) || undefined,
    databaseName: normalizeText(entry.databaseName),
    primary: entry.primary === true,
    dependencies: dedupeStrings(entry.dependencies ?? []),
    tables: sortByName((entry.tables ?? []).map((table) => normalizeTable(table))),
    tableOccurrences: sortByName((entry.tableOccurrences ?? []).map((to) => normalizeTableOccurrence(to))),
    relationships: sortById((entry.relationships ?? []).map((relationship) => normalizeRelationship(relationship))),
    valueLists: sortByName((entry.valueLists ?? []).map((valueList) => normalizeValueList(valueList))),
    layouts: sortByName((entry.layouts ?? []).map((layout) => normalizeLayoutRef(layout))),
    scripts: sortByName((entry.scripts ?? []).map((script) => normalizeScriptRef(script)))
  };
}

export function normalizeSchemaSnapshot(snapshot: SchemaSnapshot): SchemaSnapshot {
  const files = sortByName((snapshot.files ?? []).map((file) => normalizeFile(file)));
  const fileIds = dedupeStrings(files.map((file) => file.fileId));
  return {
    version: 1,
    snapshotId: normalizeText(snapshot.snapshotId),
    label: normalizeText(snapshot.label) || undefined,
    workspaceId: normalizeText(snapshot.workspaceId),
    createdAt: normalizeText(snapshot.createdAt),
    source: snapshot.source,
    fileIds,
    files,
    metadata: {
      ddrPaths: dedupeStrings(snapshot.metadata?.ddrPaths ?? []),
      warnings: dedupeStrings(snapshot.metadata?.warnings ?? [])
    }
  };
}

export function normalizeSchemaSnapshotCollection<T extends { snapshots: SchemaSnapshot[] }>(payload: T): T {
  return {
    ...payload,
    snapshots: [...(payload.snapshots ?? [])]
      .map((snapshot) => normalizeSchemaSnapshot(snapshot))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  };
}

import type {
  SchemaSnapshot,
  SchemaSnapshotFile,
  SchemaSnapshotField,
  SchemaSnapshotRelationship,
  SchemaSnapshotTable,
  SchemaSnapshotTableOccurrence
} from "../lib/schemaSnapshot/types.ts";

export type ManageDatabaseFileSummary = {
  fileId: string;
  displayName: string;
  databaseName: string;
  primary: boolean;
};

export type ManageDatabaseField = {
  id: string;
  name: string;
  type: string;
  fieldType: string;
  options: string;
  comment: string;
  creationIndex: number;
};

export type ManageDatabaseTable = {
  id: string;
  name: string;
  source: string;
  comment: string;
  creationIndex: number;
};

export type ManageDatabaseNode = {
  id: string;
  name: string;
  view: string;
  baseTableId: string;
  baseTableName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fields: string[];
};

export type ManageDatabasePredicate = {
  id: string;
  operator: string;
  leftFieldName: string;
  leftTableOccurrenceId: string;
  leftTableOccurrenceName: string;
  rightFieldName: string;
  rightTableOccurrenceId: string;
  rightTableOccurrenceName: string;
};

export type ManageDatabaseEdge = {
  id: string;
  leftTableOccurrenceId: string;
  leftTableOccurrenceName: string;
  rightTableOccurrenceId: string;
  rightTableOccurrenceName: string;
  predicates: ManageDatabasePredicate[];
};

export type ManageDatabasePayload = {
  files: ManageDatabaseFileSummary[];
  selectedFileId: string;
  source: "workspace" | "ddr" | "mock";
  databaseName: string;
  ddrPath: string;
  baseTables: ManageDatabaseTable[];
  fieldsByBaseTableId: Record<string, ManageDatabaseField[]>;
  nodes: ManageDatabaseNode[];
  edges: ManageDatabaseEdge[];
};

export type ManageDatabaseSaveDraft = {
  fileId: string;
  baseTables: ManageDatabaseTable[];
  fieldsByBaseTableId: Record<string, ManageDatabaseField[]>;
  nodes: ManageDatabaseNode[];
  edges: ManageDatabaseEdge[];
};

type BuildPayloadOptions = {
  selectedFileId?: string;
  ddrPath?: string;
};

function cleanToken(value: unknown): string {
  return String(value ?? "").trim();
}

function safeInt(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeFloat(value: unknown, fallback: number): number {
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const value of values) {
    const cleaned = cleanToken(value);
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

function normalizeField(field: SchemaSnapshotField | ManageDatabaseField, index: number): ManageDatabaseField {
  const name = cleanToken(field.name);
  const type = cleanToken(field.type) || "Text";
  const fieldType = cleanToken(field.fieldType) || "Normal";
  return {
    id: cleanToken(field.id) || `field-${index + 1}`,
    name: name || `Field ${index + 1}`,
    type,
    fieldType,
    options: cleanToken(field.options),
    comment: cleanToken(field.comment),
    creationIndex: safeInt((field as { creationIndex?: unknown }).creationIndex, index + 1)
  };
}

function sortByCreation<T extends { creationIndex: number; name: string }>(rows: T[]): T[] {
  return [...rows].sort((left, right) => {
    if (left.creationIndex !== right.creationIndex) {
      return left.creationIndex - right.creationIndex;
    }
    return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
  });
}

function buildFieldsByTable(file: SchemaSnapshotFile): Record<string, ManageDatabaseField[]> {
  const next: Record<string, ManageDatabaseField[]> = {};
  for (let index = 0; index < file.tables.length; index += 1) {
    const table = file.tables[index];
    const tableId = cleanToken(table.id);
    if (!tableId) {
      continue;
    }
    const fields = (table.fields ?? []).map((field, fieldIndex) => normalizeField(field, fieldIndex));
    next[tableId] = sortByCreation(fields);
  }
  return next;
}

function buildTableRows(file: SchemaSnapshotFile): ManageDatabaseTable[] {
  const tables = file.tables.map((table, index) => ({
    id: cleanToken(table.id) || `table-${index + 1}`,
    name: cleanToken(table.name) || `Table ${index + 1}`,
    source: cleanToken(table.source) || "FileMaker",
    comment: cleanToken(table.comment),
    creationIndex: index + 1
  }));
  return sortByCreation(tables);
}

function buildNodes(
  file: SchemaSnapshotFile,
  fieldsByTable: Record<string, ManageDatabaseField[]>
): ManageDatabaseNode[] {
  return file.tableOccurrences.map((occurrence, index) => {
    const baseTableId = cleanToken(occurrence.baseTableId);
    const tableFields = baseTableId ? fieldsByTable[baseTableId] ?? [] : [];
    return {
      id: cleanToken(occurrence.id) || `to-${index + 1}`,
      name: cleanToken(occurrence.name) || `Table Occurrence ${index + 1}`,
      view: "",
      baseTableId,
      baseTableName: cleanToken(occurrence.baseTableName),
      x: safeInt(occurrence.x, 64 + (index % 4) * 240),
      y: safeInt(occurrence.y, 64 + Math.floor(index / 4) * 200),
      width: Math.max(132, safeInt(occurrence.width, 180)),
      height: Math.max(74, safeInt(occurrence.height, 128)),
      fields: tableFields.map((field) => field.name)
    };
  });
}

function buildEdgePredicate(
  relationship: SchemaSnapshotRelationship,
  index: number,
  nodeIdByName: Map<string, string>
): ManageDatabasePredicate {
  const leftTableName = cleanToken(relationship.leftTableOccurrence);
  const rightTableName = cleanToken(relationship.rightTableOccurrence);
  const leftTableId = nodeIdByName.get(leftTableName.toLowerCase()) || leftTableName;
  const rightTableId = nodeIdByName.get(rightTableName.toLowerCase()) || rightTableName;
  return {
    id: `${cleanToken(relationship.id) || `relationship-${index + 1}`}-predicate-1`,
    operator: "Equal",
    leftFieldName: cleanToken(relationship.leftField),
    leftTableOccurrenceId: leftTableId,
    leftTableOccurrenceName: leftTableName,
    rightFieldName: cleanToken(relationship.rightField),
    rightTableOccurrenceId: rightTableId,
    rightTableOccurrenceName: rightTableName
  };
}

function buildEdges(file: SchemaSnapshotFile, nodes: ManageDatabaseNode[]): ManageDatabaseEdge[] {
  const nodeIdByName = new Map<string, string>();
  for (const node of nodes) {
    const name = cleanToken(node.name);
    if (name) {
      nodeIdByName.set(name.toLowerCase(), node.id);
    }
  }
  return file.relationships.map((relationship, index) => {
    const leftName = cleanToken(relationship.leftTableOccurrence);
    const rightName = cleanToken(relationship.rightTableOccurrence);
    return {
      id: cleanToken(relationship.id) || `relationship-${index + 1}`,
      leftTableOccurrenceId: nodeIdByName.get(leftName.toLowerCase()) || leftName,
      leftTableOccurrenceName: leftName,
      rightTableOccurrenceId: nodeIdByName.get(rightName.toLowerCase()) || rightName,
      rightTableOccurrenceName: rightName,
      predicates: [buildEdgePredicate(relationship, index, nodeIdByName)]
    };
  });
}

function toSchemaField(entry: ManageDatabaseField, index: number): SchemaSnapshotField {
  const type = cleanToken(entry.type) || "Text";
  return {
    id: cleanToken(entry.id) || `field-${index + 1}`,
    name: cleanToken(entry.name) || `Field ${index + 1}`,
    type,
    fieldType: cleanToken(entry.fieldType) || "Normal",
    options: cleanToken(entry.options) || undefined,
    comment: cleanToken(entry.comment) || undefined,
    source: "workspace"
  };
}

function toSchemaTables(draft: ManageDatabaseSaveDraft): SchemaSnapshotTable[] {
  const rows = draft.baseTables.map((table, index) => {
    const tableId = cleanToken(table.id) || `table-${index + 1}`;
    const fields = (draft.fieldsByBaseTableId[tableId] ?? []).map((field, fieldIndex) =>
      toSchemaField(field, fieldIndex)
    );
    return {
      id: tableId,
      name: cleanToken(table.name) || `Table ${index + 1}`,
      source: cleanToken(table.source) || "FileMaker",
      comment: cleanToken(table.comment) || undefined,
      fields
    } satisfies SchemaSnapshotTable;
  });
  return rows;
}

function toSchemaTableOccurrences(
  draft: ManageDatabaseSaveDraft,
  existing: SchemaSnapshotFile
): SchemaSnapshotTableOccurrence[] {
  const existingById = new Map(existing.tableOccurrences.map((row) => [cleanToken(row.id).toLowerCase(), row]));
  const existingByName = new Map(existing.tableOccurrences.map((row) => [cleanToken(row.name).toLowerCase(), row]));
  const targetsByNodeId = new Map<string, string[]>();
  for (const edge of draft.edges) {
    const left = cleanToken(edge.leftTableOccurrenceId);
    const right = cleanToken(edge.rightTableOccurrenceId);
    if (left && right) {
      const current = targetsByNodeId.get(left) ?? [];
      current.push(right);
      targetsByNodeId.set(left, current);
    }
  }

  const mapped = draft.nodes.map((node, index) => {
    const nodeId = cleanToken(node.id) || `to-${index + 1}`;
    const nodeName = cleanToken(node.name) || `Table Occurrence ${index + 1}`;
    const existingRow =
      existingById.get(nodeId.toLowerCase()) ??
      existingByName.get(nodeName.toLowerCase()) ??
      null;
    const targets = dedupeStrings(targetsByNodeId.get(nodeId) ?? []);
    return {
      id: nodeId,
      name: nodeName,
      baseTableId: cleanToken(node.baseTableId) || cleanToken(existingRow?.baseTableId) || undefined,
      baseTableName: cleanToken(node.baseTableName) || cleanToken(existingRow?.baseTableName) || undefined,
      apiLayoutName: cleanToken(existingRow?.apiLayoutName) || undefined,
      relationshipTargets: targets,
      x: Math.round(safeFloat(node.x, safeFloat(existingRow?.x, 64))),
      y: Math.round(safeFloat(node.y, safeFloat(existingRow?.y, 64))),
      width: Math.max(132, Math.round(safeFloat(node.width, safeFloat(existingRow?.width, 180)))),
      height: Math.max(74, Math.round(safeFloat(node.height, safeFloat(existingRow?.height, 128))))
    } satisfies SchemaSnapshotTableOccurrence;
  });

  const mappedKeys = new Set(mapped.map((row) => cleanToken(row.id).toLowerCase()));
  const untouched = existing.tableOccurrences.filter((row) => !mappedKeys.has(cleanToken(row.id).toLowerCase()));
  return [...mapped, ...untouched];
}

function toSchemaRelationships(
  draft: ManageDatabaseSaveDraft,
  fileId: string,
  existing: SchemaSnapshotFile
): SchemaSnapshotRelationship[] {
  const nodeById = new Map(draft.nodes.map((row) => [cleanToken(row.id).toLowerCase(), row]));
  const nodeByName = new Map(draft.nodes.map((row) => [cleanToken(row.name).toLowerCase(), row]));
  const existingById = new Map(existing.relationships.map((row) => [cleanToken(row.id).toLowerCase(), row]));

  const relationships: SchemaSnapshotRelationship[] = [];
  const touched = new Set<string>();

  for (let edgeIndex = 0; edgeIndex < draft.edges.length; edgeIndex += 1) {
    const edge = draft.edges[edgeIndex];
    const edgeId = cleanToken(edge.id) || `relationship-${edgeIndex + 1}`;
    const predicates = edge.predicates.length > 0 ? edge.predicates : [{
      id: `${edgeId}-predicate-1`,
      operator: "Equal",
      leftFieldName: "",
      leftTableOccurrenceId: edge.leftTableOccurrenceId,
      leftTableOccurrenceName: edge.leftTableOccurrenceName,
      rightFieldName: "",
      rightTableOccurrenceId: edge.rightTableOccurrenceId,
      rightTableOccurrenceName: edge.rightTableOccurrenceName
    }];

    for (let predicateIndex = 0; predicateIndex < predicates.length; predicateIndex += 1) {
      const predicate = predicates[predicateIndex];
      const relationshipId = predicates.length > 1 ? `${edgeId}-${predicateIndex + 1}` : edgeId;
      const existingRow = existingById.get(relationshipId.toLowerCase()) ?? existingById.get(edgeId.toLowerCase()) ?? null;
      const leftNode =
        nodeById.get(cleanToken(predicate.leftTableOccurrenceId).toLowerCase()) ??
        nodeByName.get(cleanToken(predicate.leftTableOccurrenceName).toLowerCase()) ??
        null;
      const rightNode =
        nodeById.get(cleanToken(predicate.rightTableOccurrenceId).toLowerCase()) ??
        nodeByName.get(cleanToken(predicate.rightTableOccurrenceName).toLowerCase()) ??
        null;
      const leftField = cleanToken(predicate.leftFieldName);
      const rightField = cleanToken(predicate.rightFieldName);
      const operator = cleanToken(predicate.operator) || "Equal";
      const expression = leftField && rightField ? `${leftField} ${operator} ${rightField}` : "";
      relationships.push({
        id: relationshipId,
        leftFileId: cleanToken(existingRow?.leftFileId) || fileId,
        leftTableOccurrence: cleanToken(leftNode?.name) || cleanToken(predicate.leftTableOccurrenceName),
        rightFileId: cleanToken(existingRow?.rightFileId) || fileId,
        rightTableOccurrence: cleanToken(rightNode?.name) || cleanToken(predicate.rightTableOccurrenceName),
        predicate: expression || cleanToken(existingRow?.predicate) || undefined,
        leftField: leftField || cleanToken(existingRow?.leftField) || undefined,
        rightField: rightField || cleanToken(existingRow?.rightField) || undefined
      });
      touched.add(relationshipId.toLowerCase());
      touched.add(edgeId.toLowerCase());
    }
  }

  for (const row of existing.relationships) {
    const key = cleanToken(row.id).toLowerCase();
    if (!key || touched.has(key)) {
      continue;
    }
    relationships.push(row);
  }
  return relationships;
}

export function buildManageDatabasePayload(
  snapshot: SchemaSnapshot,
  options?: BuildPayloadOptions
): ManageDatabasePayload {
  const files = snapshot.files.map((file) => ({
    fileId: file.fileId,
    displayName: cleanToken(file.displayName) || file.fileId,
    databaseName: file.databaseName,
    primary: file.primary === true
  }));
  const selectedFile =
    snapshot.files.find(
      (file) => file.fileId.toLowerCase() === cleanToken(options?.selectedFileId).toLowerCase()
    ) ??
    snapshot.files.find((file) => file.primary) ??
    snapshot.files[0];

  if (!selectedFile) {
    return {
      files,
      selectedFileId: "",
      source: "mock",
      databaseName: "",
      ddrPath: cleanToken(options?.ddrPath),
      baseTables: [],
      fieldsByBaseTableId: {},
      nodes: [],
      edges: []
    };
  }

  const fieldsByBaseTableId = buildFieldsByTable(selectedFile);
  const nodes = buildNodes(selectedFile, fieldsByBaseTableId);
  const edges = buildEdges(selectedFile, nodes);
  const hasOverlay = snapshot.source !== "ddr-import";

  return {
    files,
    selectedFileId: selectedFile.fileId,
    source: hasOverlay ? "workspace" : "ddr",
    databaseName: selectedFile.databaseName,
    ddrPath: cleanToken(options?.ddrPath),
    baseTables: buildTableRows(selectedFile),
    fieldsByBaseTableId,
    nodes,
    edges
  };
}

export function applyManageDatabaseDraftToSnapshot(
  snapshot: SchemaSnapshot,
  draft: ManageDatabaseSaveDraft
): SchemaSnapshot {
  const fileId = cleanToken(draft.fileId);
  if (!fileId) {
    return snapshot;
  }
  const nextFiles = snapshot.files.map((file) => {
    if (file.fileId.toLowerCase() !== fileId.toLowerCase()) {
      return file;
    }
    return {
      ...file,
      tables: toSchemaTables(draft),
      tableOccurrences: toSchemaTableOccurrences(draft, file),
      relationships: toSchemaRelationships(draft, file.fileId, file)
    };
  });
  return {
    ...snapshot,
    files: nextFiles
  };
}

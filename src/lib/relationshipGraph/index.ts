import type { SchemaSnapshot } from "../schemaSnapshot/types.ts";

export type RelationshipGraphNodeType = "file" | "tableOccurrence" | "layout";

export type RelationshipGraphNode = {
  id: string;
  type: RelationshipGraphNodeType;
  fileId: string;
  databaseName?: string;
  label: string;
  subtitle?: string;
  details: Record<string, unknown>;
};

export type RelationshipGraphEdge = {
  id: string;
  from: string;
  to: string;
  type: "relationship" | "layout-base";
  label?: string;
  crossFile: boolean;
  details: Record<string, unknown>;
};

export type RelationshipGraphPayload = {
  snapshotId: string;
  generatedAt: string;
  nodes: RelationshipGraphNode[];
  edges: RelationshipGraphEdge[];
};

export type RelationshipGraphFilter = {
  fileIds?: string[];
  crossFileOnly?: boolean;
  search?: string;
};

function normalizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function dedupeCaseInsensitive(values: string[]): string[] {
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

function toNodeId(type: RelationshipGraphNodeType, fileId: string, token: string): string {
  return `${type}:${fileId}:${token}`.toLowerCase();
}

export function buildRelationshipGraphFromSnapshot(snapshot: SchemaSnapshot): RelationshipGraphPayload {
  const nodes: RelationshipGraphNode[] = [];
  const edges: RelationshipGraphEdge[] = [];

  for (const file of snapshot.files) {
    nodes.push({
      id: toNodeId("file", file.fileId, file.fileId),
      type: "file",
      fileId: file.fileId,
      databaseName: file.databaseName,
      label: file.displayName || file.databaseName || file.fileId,
      subtitle: file.databaseName,
      details: {
        workspaceId: file.workspaceId,
        dependencies: file.dependencies,
        primary: file.primary
      }
    });

    for (const to of file.tableOccurrences) {
      const toNodeIdValue = toNodeId("tableOccurrence", file.fileId, to.name);
      nodes.push({
        id: toNodeIdValue,
        type: "tableOccurrence",
        fileId: file.fileId,
        databaseName: file.databaseName,
        label: to.name,
        subtitle: to.baseTableName || to.baseTableId || "",
        details: {
          baseTableId: to.baseTableId,
          baseTableName: to.baseTableName,
          apiLayoutName: to.apiLayoutName,
          relationshipTargets: to.relationshipTargets
        }
      });
      edges.push({
        id: `edge:file-link:${file.fileId}:${to.name}`.toLowerCase(),
        from: toNodeId("file", file.fileId, file.fileId),
        to: toNodeIdValue,
        type: "relationship",
        label: "owns",
        crossFile: false,
        details: {
          relation: "file-owns-to"
        }
      });
    }

    for (const layout of file.layouts) {
      const layoutNodeId = toNodeId("layout", file.fileId, layout.layoutName);
      nodes.push({
        id: layoutNodeId,
        type: "layout",
        fileId: file.fileId,
        databaseName: file.databaseName,
        label: layout.layoutName,
        subtitle: layout.baseTableOccurrence,
        details: {
          layoutId: layout.layoutId,
          referencedFieldsCount: layout.referencedFields.length,
          referencedTableOccurrencesCount: layout.referencedTableOccurrences.length
        }
      });
      const baseToNode = toNodeId("tableOccurrence", file.fileId, layout.baseTableOccurrence);
      edges.push({
        id: `edge:layout-base:${file.fileId}:${layout.layoutName}`.toLowerCase(),
        from: layoutNodeId,
        to: baseToNode,
        type: "layout-base",
        label: "base TO",
        crossFile: false,
        details: {
          layoutId: layout.layoutId
        }
      });
    }

    for (const relationship of file.relationships) {
      const from = toNodeId("tableOccurrence", relationship.leftFileId, relationship.leftTableOccurrence);
      const to = toNodeId("tableOccurrence", relationship.rightFileId, relationship.rightTableOccurrence);
      edges.push({
        id: `edge:relationship:${file.fileId}:${relationship.id}`.toLowerCase(),
        from,
        to,
        type: "relationship",
        label: relationship.predicate || `${relationship.leftTableOccurrence} -> ${relationship.rightTableOccurrence}`,
        crossFile: relationship.leftFileId.toLowerCase() !== relationship.rightFileId.toLowerCase(),
        details: {
          relationshipId: relationship.id,
          leftField: relationship.leftField,
          rightField: relationship.rightField,
          predicate: relationship.predicate
        }
      });
    }
  }

  return {
    snapshotId: snapshot.snapshotId,
    generatedAt: new Date().toISOString(),
    nodes: nodes.sort((left, right) => left.id.localeCompare(right.id)),
    edges: edges.sort((left, right) => left.id.localeCompare(right.id))
  };
}

export function filterRelationshipGraph(
  graph: RelationshipGraphPayload,
  filter?: RelationshipGraphFilter
): RelationshipGraphPayload {
  const fileScope = dedupeCaseInsensitive(filter?.fileIds ?? []).map((entry) => entry.toLowerCase());
  const searchToken = normalizeToken(filter?.search).toLowerCase();
  const crossFileOnly = filter?.crossFileOnly === true;

  const keepNode = (node: RelationshipGraphNode): boolean => {
    if (fileScope.length > 0 && !fileScope.includes(node.fileId.toLowerCase())) {
      return false;
    }
    if (!searchToken) {
      return true;
    }
    const haystack = [
      node.label,
      node.subtitle,
      node.fileId,
      node.databaseName,
      JSON.stringify(node.details)
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(searchToken);
  };

  const nodeCandidates = graph.nodes.filter((node) => keepNode(node));
  const nodeSet = new Set(nodeCandidates.map((node) => node.id));
  const edgeCandidates = graph.edges.filter((edge) => {
    if (crossFileOnly && !edge.crossFile) {
      return false;
    }
    return nodeSet.has(edge.from) && nodeSet.has(edge.to);
  });

  return {
    ...graph,
    nodes: nodeCandidates,
    edges: edgeCandidates
  };
}

export function findRelationshipGraphPath(
  graph: RelationshipGraphPayload,
  fromNodeId: string,
  toNodeId: string
): string[] {
  const from = normalizeToken(fromNodeId).toLowerCase();
  const to = normalizeToken(toNodeId).toLowerCase();
  if (!from || !to) {
    return [];
  }
  if (from === to) {
    return [from];
  }

  const adjacency = new Map<string, string[]>();
  for (const node of graph.nodes) {
    adjacency.set(node.id.toLowerCase(), []);
  }
  for (const edge of graph.edges) {
    const left = edge.from.toLowerCase();
    const right = edge.to.toLowerCase();
    const leftRows = adjacency.get(left) ?? [];
    leftRows.push(right);
    adjacency.set(left, leftRows);
    const rightRows = adjacency.get(right) ?? [];
    rightRows.push(left);
    adjacency.set(right, rightRows);
  }

  const queue: string[] = [from];
  const parent = new Map<string, string | null>([[from, null]]);
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const next of adjacency.get(current) ?? []) {
      if (parent.has(next)) {
        continue;
      }
      parent.set(next, current);
      if (next === to) {
        queue.length = 0;
        break;
      }
      queue.push(next);
    }
  }

  if (!parent.has(to)) {
    return [];
  }

  const path: string[] = [];
  let cursor: string | null = to;
  while (cursor) {
    path.push(cursor);
    cursor = parent.get(cursor) ?? null;
  }
  return path.reverse();
}

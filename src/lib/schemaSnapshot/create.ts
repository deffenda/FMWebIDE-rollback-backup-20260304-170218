import { randomUUID } from "node:crypto";
import type { LayoutComponent, LayoutDefinition } from "../layout-model.ts";
import type {
  ScriptWorkspacePayload,
  ScriptWorkspaceScript
} from "../../server/script-workspace.ts";
import { getScriptWorkspacePayload } from "../../server/script-workspace.ts";
import { getDdrRelationshipGraph } from "../../server/ddr-relationship-graph.ts";
import { listLayouts } from "../../server/layout-storage.ts";
import { getValueLists } from "../../server/filemaker-client.ts";
import { readWorkspaceSchemaOverlay } from "../../server/workspace-schema-storage.ts";
import {
  normalizeWorkspaceId,
  readWorkspaceConfig,
  type WorkspaceConfig
} from "../../server/workspace-context.ts";
import { resolveWorkspaceGraph } from "../../server/workspace-multifile.ts";
import { normalizeSchemaSnapshot } from "./normalize";
import { DEFAULT_ACTIVE_TABLE_OCCURRENCE } from "../default-layout-context.ts";
import type {
  CreateSchemaSnapshotOptions,
  SchemaSnapshot,
  SchemaSnapshotFile,
  SchemaSnapshotLayoutRef,
  SchemaSnapshotRelationship,
  SchemaSnapshotScriptRef,
  SchemaSnapshotTable,
  SchemaSnapshotTableOccurrence,
  SchemaSnapshotValueList
} from "./types";

type DdrGraphCacheValue = Awaited<ReturnType<typeof getDdrRelationshipGraph>>;

function dedupeCaseInsensitive(values: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const value of values) {
    const cleaned = String(value ?? "").trim();
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

function cleanToken(value: unknown): string {
  return String(value ?? "").trim();
}

function toFieldRef(tableOccurrence: string, fieldName: string): string {
  const to = cleanToken(tableOccurrence);
  const field = cleanToken(fieldName);
  if (!field) {
    return "";
  }
  if (to) {
    return `${to}::${field}`;
  }
  return field;
}

function splitFieldRef(ref: string): { tableOccurrence: string; fieldName: string } {
  const cleaned = cleanToken(ref);
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

function parseMergeFieldTokens(value: string): string[] {
  const refs: string[] = [];
  const pattern = /<<\s*([^<>]+?)\s*>>/g;
  let match = pattern.exec(value);
  while (match) {
    const token = cleanToken(match[1]);
    if (token.includes("::")) {
      refs.push(token);
    }
    match = pattern.exec(value);
  }
  return refs;
}

function parseComponentTextRefs(component: LayoutComponent): string[] {
  const refs: string[] = [];
  const candidates = [
    component.props.label,
    component.props.placeholder,
    component.props.tooltip,
    component.props.webViewerUrlTemplate
  ];
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    refs.push(...parseMergeFieldTokens(String(candidate)));
  }
  return refs;
}

function extractLayoutReferences(layout: LayoutDefinition, owner: {
  fileId: string;
  databaseName: string;
  apiLayoutName?: string;
}): SchemaSnapshotLayoutRef {
  const fieldRefs: string[] = [];
  const tableOccurrences: string[] = [];
  const valueLists: string[] = [];
  const portals: SchemaSnapshotLayoutRef["portals"] = [];

  tableOccurrences.push(layout.defaultTableOccurrence);

  for (const component of layout.components ?? []) {
    const bindingField = cleanToken(component.binding?.field);
    const bindingTo = cleanToken(component.binding?.tableOccurrence);
    const boundFieldRef = toFieldRef(bindingTo || layout.defaultTableOccurrence, bindingField);
    if (boundFieldRef) {
      fieldRefs.push(boundFieldRef);
    }
    if (bindingTo) {
      tableOccurrences.push(bindingTo);
    }

    const listName = cleanToken(component.props.valueList);
    if (listName) {
      valueLists.push(listName);
    }

    const mergeRefs = parseComponentTextRefs(component);
    for (const mergeRef of mergeRefs) {
      fieldRefs.push(mergeRef);
      const parsed = splitFieldRef(mergeRef);
      if (parsed.tableOccurrence) {
        tableOccurrences.push(parsed.tableOccurrence);
      }
    }

    if (component.type === "portal") {
      const portalTo = cleanToken(component.binding?.tableOccurrence || component.props.portalParentTableOccurrence);
      const rowFields = dedupeCaseInsensitive(
        (component.props.portalRowFields ?? []).map((entry) => cleanToken(entry))
      );
      portals.push({
        componentId: component.id,
        tableOccurrence: portalTo,
        rowFields
      });
      if (portalTo) {
        tableOccurrences.push(portalTo);
      }
      for (const rowField of rowFields) {
        const rowRef = toFieldRef(portalTo, rowField);
        if (rowRef) {
          fieldRefs.push(rowRef);
        }
      }
      for (const rule of component.props.portalSortRules ?? []) {
        if (cleanToken(rule.valueList)) {
          valueLists.push(cleanToken(rule.valueList));
        }
      }
    }
  }

  return {
    layoutId: layout.id,
    layoutName: layout.name,
    baseTableOccurrence: cleanToken(layout.defaultTableOccurrence),
    baseTable: cleanToken(layout.defaultTableOccurrence),
    apiLayoutName: cleanToken(owner.apiLayoutName) || undefined,
    referencedFields: dedupeCaseInsensitive(fieldRefs),
    referencedTableOccurrences: dedupeCaseInsensitive(tableOccurrences),
    referencedValueLists: dedupeCaseInsensitive(valueLists),
    portals: portals
      .map((entry) => ({
        componentId: cleanToken(entry.componentId),
        tableOccurrence: cleanToken(entry.tableOccurrence),
        rowFields: dedupeCaseInsensitive(entry.rowFields)
      }))
      .sort((left, right) => left.componentId.localeCompare(right.componentId))
  };
}

function parseScriptFieldRefs(steps: ScriptWorkspaceScript["steps"]): string[] {
  const refs: string[] = [];
  const fieldPattern = /([A-Za-z][\w.-]*::[A-Za-z][\w.-]*)/g;
  for (const step of steps) {
    const text = cleanToken(step.text);
    let match = fieldPattern.exec(text);
    while (match) {
      refs.push(cleanToken(match[1]));
      match = fieldPattern.exec(text);
    }
  }
  return dedupeCaseInsensitive(refs);
}

function parseScriptLayoutRefs(steps: ScriptWorkspaceScript["steps"]): string[] {
  const refs: string[] = [];
  const quotedLayoutPattern = /Go to Layout\s*\[\s*"([^"]+)"/gi;
  const rawLayoutPattern = /Go to Layout\s*\[\s*([^\]]+)\]/gi;
  for (const step of steps) {
    const text = cleanToken(step.text);
    let match = quotedLayoutPattern.exec(text);
    while (match) {
      refs.push(cleanToken(match[1]));
      match = quotedLayoutPattern.exec(text);
    }
    if (refs.length === 0) {
      let rawMatch = rawLayoutPattern.exec(text);
      while (rawMatch) {
        refs.push(cleanToken(rawMatch[1]).replace(/^"+|"+$/g, ""));
        rawMatch = rawLayoutPattern.exec(text);
      }
    }
  }
  return dedupeCaseInsensitive(refs);
}

function scriptsToReferences(payload: ScriptWorkspacePayload, fileId: string): SchemaSnapshotScriptRef[] {
  return (payload.scripts ?? [])
    .map((script) => {
      const referencedFields = parseScriptFieldRefs(script.steps);
      const referencedLayouts = parseScriptLayoutRefs(script.steps);
      const referencedTableOccurrences = dedupeCaseInsensitive(
        referencedFields
          .map((entry) => splitFieldRef(entry).tableOccurrence)
          .filter((entry) => entry.length > 0)
      );
      return {
        scriptId: cleanToken(script.id),
        scriptName: cleanToken(script.name),
        referencedFields,
        referencedLayouts,
        referencedTableOccurrences,
        stepCount: script.steps.length
      } satisfies SchemaSnapshotScriptRef;
    })
    .sort((left, right) => left.scriptName.localeCompare(right.scriptName))
    .map((entry) => ({ ...entry }));
}

function resolveLayoutOwner(
  layoutName: string,
  graph: ReturnType<typeof resolveWorkspaceGraph>
): { fileId: string; databaseName: string; apiLayoutName?: string } {
  const key = layoutName.trim().toLowerCase();
  const match = Object.entries(graph.layoutIndex).find(
    ([candidate]) => candidate.trim().toLowerCase() === key
  )?.[1];
  if (match) {
    return {
      fileId: match.fileId,
      databaseName: match.databaseName,
      apiLayoutName: match.apiLayoutName
    };
  }
  return {
    fileId: graph.primaryFileId,
    databaseName: graph.byFileId[graph.primaryFileId]?.databaseName || graph.primaryFileId,
    apiLayoutName: layoutName
  };
}

async function loadWorkspaceLayoutsByFile(
  graph: ReturnType<typeof resolveWorkspaceGraph>,
  warnings: string[]
): Promise<Record<string, SchemaSnapshotLayoutRef[]>> {
  const byFile: Record<string, SchemaSnapshotLayoutRef[]> = {};
  const workspaceIds = dedupeCaseInsensitive(graph.files.map((entry) => entry.workspaceId));
  for (const workspaceId of workspaceIds) {
    try {
      const layouts = await listLayouts(workspaceId);
      for (const layout of layouts) {
        const owner = resolveLayoutOwner(layout.name, graph);
        const reference = extractLayoutReferences(layout, owner);
        const rows = byFile[owner.fileId] ?? [];
        rows.push(reference);
        byFile[owner.fileId] = rows;
      }
    } catch (error) {
      warnings.push(
        `Failed to load layouts for workspace ${workspaceId}: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      );
    }
  }
  for (const fileId of Object.keys(byFile)) {
    byFile[fileId] = byFile[fileId].sort((left, right) => left.layoutName.localeCompare(right.layoutName));
  }
  return byFile;
}

function valueListsFromLayoutRefs(layouts: SchemaSnapshotLayoutRef[]): SchemaSnapshotValueList[] {
  const byName = new Map<string, SchemaSnapshotValueList>();
  for (const layout of layouts) {
    for (const valueListName of layout.referencedValueLists) {
      const key = valueListName.toLowerCase();
      if (byName.has(key)) {
        continue;
      }
      byName.set(key, {
        id: `layout-${valueListName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name: valueListName,
        source: "layout-binding",
        sourceFields: [],
        values: []
      });
    }
  }
  return [...byName.values()].sort((left, right) => left.name.localeCompare(right.name));
}

async function runtimeValueListsForFile(
  workspaceId: string,
  fileId: string,
  databaseName: string,
  layoutRefs: SchemaSnapshotLayoutRef[],
  warnings: string[]
): Promise<SchemaSnapshotValueList[]> {
  const tableOccurrence =
    cleanToken(layoutRefs[0]?.baseTableOccurrence) ||
    cleanToken(layoutRefs[0]?.layoutName) ||
    DEFAULT_ACTIVE_TABLE_OCCURRENCE;
  try {
    const catalog = await getValueLists({
      scope: "database",
      workspaceId,
      fileId,
      databaseName,
      tableOccurrence,
      layoutName: layoutRefs[0]?.layoutName
    });
    return (catalog.valueLists ?? [])
      .map((entry) => ({
        id: `runtime-${entry.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name: cleanToken(entry.name),
        source: cleanToken(entry.source) || "runtime",
        sourceFields: dedupeCaseInsensitive(entry.sourceFields ?? []),
        values: dedupeCaseInsensitive(entry.values ?? [])
      }))
      .filter((entry) => entry.name.length > 0)
      .sort((left, right) => left.name.localeCompare(right.name));
  } catch (error) {
    warnings.push(
      `Failed to load runtime value lists for ${fileId}: ${error instanceof Error ? error.message : "unknown error"}`
    );
    return [];
  }
}

function mergeValueLists(
  layoutLists: SchemaSnapshotValueList[],
  runtimeLists: SchemaSnapshotValueList[]
): SchemaSnapshotValueList[] {
  const byName = new Map<string, SchemaSnapshotValueList>();
  for (const entry of [...layoutLists, ...runtimeLists]) {
    const name = cleanToken(entry.name);
    if (!name) {
      continue;
    }
    const key = name.toLowerCase();
    const current = byName.get(key);
    if (!current) {
      byName.set(key, {
        ...entry,
        name,
        sourceFields: dedupeCaseInsensitive(entry.sourceFields),
        values: dedupeCaseInsensitive(entry.values)
      });
      continue;
    }
    byName.set(key, {
      ...current,
      source: current.source || entry.source,
      sourceFields: dedupeCaseInsensitive([...(current.sourceFields ?? []), ...(entry.sourceFields ?? [])]),
      values: dedupeCaseInsensitive([...(current.values ?? []), ...(entry.values ?? [])])
    });
  }
  return [...byName.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function relationshipsForFile(
  fileId: string,
  graph: ReturnType<typeof resolveWorkspaceGraph>,
  ddrGraph: DdrGraphCacheValue | null
): SchemaSnapshotRelationship[] {
  const relationships: SchemaSnapshotRelationship[] = [];
  const relationshipSet = new Set<string>();

  const add = (entry: SchemaSnapshotRelationship) => {
    const key = [
      entry.leftFileId.toLowerCase(),
      entry.leftTableOccurrence.toLowerCase(),
      entry.rightFileId.toLowerCase(),
      entry.rightTableOccurrence.toLowerCase(),
      cleanToken(entry.leftField).toLowerCase(),
      cleanToken(entry.rightField).toLowerCase(),
      cleanToken(entry.predicate).toLowerCase()
    ].join("|");
    if (relationshipSet.has(key)) {
      return;
    }
    relationshipSet.add(key);
    relationships.push(entry);
  };

  for (const edge of graph.relationshipGraph ?? []) {
    if (edge.left.fileId !== fileId && edge.right.fileId !== fileId) {
      continue;
    }
    add({
      id: cleanToken(edge.id),
      leftFileId: cleanToken(edge.left.fileId),
      leftTableOccurrence: cleanToken(edge.left.tableOccurrence),
      rightFileId: cleanToken(edge.right.fileId),
      rightTableOccurrence: cleanToken(edge.right.tableOccurrence),
      predicate: cleanToken(edge.predicate) || undefined
    });
  }

  for (const edge of ddrGraph?.edges ?? []) {
    add({
      id: cleanToken(edge.id),
      leftFileId: fileId,
      leftTableOccurrence: cleanToken(edge.leftTableOccurrenceName || edge.leftTableOccurrenceId),
      rightFileId: fileId,
      rightTableOccurrence: cleanToken(edge.rightTableOccurrenceName || edge.rightTableOccurrenceId),
      predicate: edge.predicates
        .map((predicate) => `${predicate.leftTableOccurrenceName}::${predicate.leftFieldName} ${predicate.operator} ${predicate.rightTableOccurrenceName}::${predicate.rightFieldName}`)
        .join(" and "),
      leftField: edge.predicates[0]?.leftFieldName,
      rightField: edge.predicates[0]?.rightFieldName
    });
  }

  return relationships.sort((left, right) => left.id.localeCompare(right.id));
}

function tableOccurrencesForFile(
  fileId: string,
  graph: ReturnType<typeof resolveWorkspaceGraph>,
  ddrGraph: DdrGraphCacheValue | null
): SchemaSnapshotTableOccurrence[] {
  const rows: SchemaSnapshotTableOccurrence[] = [];
  const seen = new Set<string>();

  for (const [name, entry] of Object.entries(graph.toIndex ?? {})) {
    if (entry.fileId !== fileId) {
      continue;
    }
    const key = name.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    rows.push({
      id: `to-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name,
      baseTableName: cleanToken(entry.baseTable) || undefined,
      apiLayoutName: cleanToken(entry.apiLayoutName) || undefined,
      relationshipTargets: dedupeCaseInsensitive(entry.relationshipTargets ?? [])
    });
  }

  for (const node of ddrGraph?.nodes ?? []) {
    const name = cleanToken(node.name);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) {
      continue;
    }
    seen.add(key);
    rows.push({
      id: cleanToken(node.id) || `to-${key}`,
      name,
      baseTableId: cleanToken(node.baseTableId),
      baseTableName: cleanToken(node.baseTableName),
      relationshipTargets: [],
      x: Number.isFinite(node.x) ? node.x : undefined,
      y: Number.isFinite(node.y) ? node.y : undefined,
      width: Number.isFinite(node.width) ? node.width : undefined,
      height: Number.isFinite(node.height) ? node.height : undefined
    });
  }

  rows.sort((left, right) => left.name.localeCompare(right.name));
  return rows;
}

function tablesForFile(ddrGraph: DdrGraphCacheValue | null): SchemaSnapshotTable[] {
  if (!ddrGraph) {
    return [];
  }
  return (ddrGraph.baseTables ?? [])
    .map((baseTable) => ({
      id: cleanToken(baseTable.id) || cleanToken(baseTable.name),
      name: cleanToken(baseTable.name),
      source: cleanToken(baseTable.source) || undefined,
      comment: cleanToken(baseTable.comment) || undefined,
      fields: (ddrGraph.fieldsByBaseTableId?.[baseTable.id] ?? [])
        .map((field) => ({
          id: cleanToken(field.id) || cleanToken(field.name),
          name: cleanToken(field.name),
          type: cleanToken(field.type) || "Text",
          fieldType: cleanToken(field.fieldType) || undefined,
          options: cleanToken(field.options) || undefined,
          comment: cleanToken(field.comment) || undefined,
          source: "ddr"
        }))
        .sort((left, right) => left.name.localeCompare(right.name))
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function scriptRefsByFile(
  graph: ReturnType<typeof resolveWorkspaceGraph>,
  warnings: string[]
): Promise<Record<string, SchemaSnapshotScriptRef[]>> {
  const byFile: Record<string, SchemaSnapshotScriptRef[]> = {};
  const workspaceIds = dedupeCaseInsensitive(graph.files.map((entry) => entry.workspaceId));
  for (const workspaceId of workspaceIds) {
    try {
      const payload = await getScriptWorkspacePayload({ workspaceId });
      const owner =
        graph.files.find((entry) => entry.workspaceId === workspaceId && entry.primary) ??
        graph.files.find((entry) => entry.workspaceId === workspaceId) ??
        null;
      if (!owner) {
        continue;
      }
      byFile[owner.fileId] = scriptsToReferences(payload, owner.fileId);
    } catch (error) {
      warnings.push(
        `Failed to load script workspace payload for ${workspaceId}: ${
          error instanceof Error ? error.message : "unknown error"
        }`
      );
    }
  }
  return byFile;
}

async function loadWorkspaceConfigById(workspaceId: string): Promise<WorkspaceConfig | null> {
  try {
    return await readWorkspaceConfig(workspaceId);
  } catch {
    return null;
  }
}

async function loadDdrGraphForFile(
  file: ReturnType<typeof resolveWorkspaceGraph>["files"][number],
  ddrPathOverrideByFileId: Record<string, string> | undefined,
  cache: Map<string, DdrGraphCacheValue | null>,
  warnings: string[]
): Promise<DdrGraphCacheValue | null> {
  const overridePath = cleanToken(ddrPathOverrideByFileId?.[file.fileId]);
  const cacheKey = `${file.workspaceId}::${file.fileId}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey) ?? null;
  }

  const fileWorkspaceConfig = await loadWorkspaceConfigById(file.workspaceId);
  const ddrPath = overridePath || cleanToken(fileWorkspaceConfig?.filemaker?.ddrPath);
  if (!ddrPath) {
    cache.set(cacheKey, null);
    return null;
  }
  try {
    const payload = await getDdrRelationshipGraph({ ddrPath });
    cache.set(cacheKey, payload);
    return payload;
  } catch (error) {
    warnings.push(
      `Failed to parse DDR for file ${file.fileId} (${ddrPath}): ${
        error instanceof Error ? error.message : "unknown error"
      }`
    );
    cache.set(cacheKey, null);
    return null;
  }
}

export async function createSnapshotFromWorkspace(options?: CreateSchemaSnapshotOptions): Promise<SchemaSnapshot> {
  const workspaceId = normalizeWorkspaceId(options?.workspaceId);
  const source = options?.source ?? "workspace";
  const label = cleanToken(options?.label);
  const includeRuntimeValueLists = options?.includeRuntimeValueLists === true;
  const warnings: string[] = [];

  const graph = resolveWorkspaceGraph(workspaceId);
  const workspaceSchemaOverlay = await readWorkspaceSchemaOverlay(workspaceId);
  const layoutsByFile = await loadWorkspaceLayoutsByFile(graph, warnings);
  const scriptsByFile = await scriptRefsByFile(graph, warnings);
  const ddrCache = new Map<string, DdrGraphCacheValue | null>();

  const files: SchemaSnapshotFile[] = [];
  for (const file of graph.files) {
    const ddrGraph = await loadDdrGraphForFile(file, options?.ddrPathOverrideByFileId, ddrCache, warnings);
    const overlayFile =
      workspaceSchemaOverlay?.files.find(
        (entry) => entry.fileId.toLowerCase() === file.fileId.toLowerCase()
      ) ?? null;
    const layouts = layoutsByFile[file.fileId] ?? [];
    const scriptRefs = scriptsByFile[file.fileId] ?? [];
    const layoutLists = valueListsFromLayoutRefs(layouts);
    const runtimeLists = includeRuntimeValueLists
      ? await runtimeValueListsForFile(workspaceId, file.fileId, file.databaseName, layouts, warnings)
      : [];
    files.push({
      fileId: file.fileId,
      workspaceId: file.workspaceId,
      displayName: file.displayName,
      databaseName: file.databaseName,
      primary: file.primary === true,
      dependencies: dedupeCaseInsensitive(file.dependencies ?? []),
      tables: overlayFile?.tables?.length ? overlayFile.tables : tablesForFile(ddrGraph),
      tableOccurrences:
        overlayFile?.tableOccurrences?.length
          ? overlayFile.tableOccurrences
          : tableOccurrencesForFile(file.fileId, graph, ddrGraph),
      relationships:
        overlayFile?.relationships?.length
          ? overlayFile.relationships
          : relationshipsForFile(file.fileId, graph, ddrGraph),
      valueLists: overlayFile?.valueLists?.length
        ? mergeValueLists(overlayFile.valueLists, runtimeLists)
        : mergeValueLists(layoutLists, runtimeLists),
      layouts,
      scripts: scriptRefs
    });
  }

  const ddrPaths = dedupeCaseInsensitive(
    graph.files
      .map((entry) => options?.ddrPathOverrideByFileId?.[entry.fileId] || "")
      .filter((entry) => entry.length > 0)
  );

  const snapshot = normalizeSchemaSnapshot({
    version: 1,
    snapshotId: `snapshot-${Date.now()}-${randomUUID().slice(0, 8)}`,
    label: label || undefined,
    workspaceId,
    createdAt: new Date().toISOString(),
    source,
    fileIds: files.map((entry) => entry.fileId),
    files,
    metadata: {
      ddrPaths,
      warnings: dedupeCaseInsensitive(warnings)
    }
  });
  return snapshot;
}

export async function createSnapshotFromDDRImport(options?: CreateSchemaSnapshotOptions): Promise<SchemaSnapshot> {
  return createSnapshotFromWorkspace({
    ...options,
    source: "ddr-import",
    includeRuntimeValueLists: options?.includeRuntimeValueLists ?? false
  });
}

export async function createSnapshotFromExport(filePath: string): Promise<SchemaSnapshot> {
  const { readFile } = await import("node:fs/promises");
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as SchemaSnapshot;
  return normalizeSchemaSnapshot(parsed);
}

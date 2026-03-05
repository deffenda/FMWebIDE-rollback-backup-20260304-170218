import type {
  SchemaSnapshot,
  SchemaSnapshotFile,
  SchemaSnapshotValueList
} from "../lib/schemaSnapshot/types.ts";

export type ManageValueListsFileSummary = {
  fileId: string;
  displayName: string;
  databaseName: string;
  primary: boolean;
};

export type ManageValueListUsageRef = {
  layoutId: string;
  layoutName: string;
  baseTableOccurrence: string;
};

export type ManageValueListRow = {
  id: string;
  name: string;
  source: string;
  sourceFields: string[];
  values: string[];
  creationOrder: number;
  usageCount: number;
  usageRefs: ManageValueListUsageRef[];
};

export type ManageValueListsPayload = {
  files: ManageValueListsFileSummary[];
  selectedFileId: string;
  source: "workspace" | "ddr" | "mock";
  databaseName: string;
  valueLists: ManageValueListRow[];
};

export type ManageValueListsSaveDraft = {
  fileId: string;
  valueLists: Array<{
    id?: string;
    name?: string;
    source?: string;
    sourceFields?: string[];
    values?: string[];
  }>;
};

type BuildPayloadOptions = {
  selectedFileId?: string;
};

function cleanToken(value: unknown): string {
  return String(value ?? "").trim();
}

function mapSource(source: SchemaSnapshot["source"]): "workspace" | "ddr" | "mock" {
  if (source === "ddr-import") {
    return "ddr";
  }
  if (source === "workspace" || source === "migration-apply" || source === "manual") {
    return "workspace";
  }
  return "mock";
}

function dedupeCaseInsensitive(values: string[]): string[] {
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

function buildUsageByListName(file: SchemaSnapshotFile): Map<string, ManageValueListUsageRef[]> {
  const byName = new Map<string, ManageValueListUsageRef[]>();
  for (const layout of file.layouts ?? []) {
    const refs = dedupeCaseInsensitive(layout.referencedValueLists ?? []);
    for (const ref of refs) {
      const key = ref.toLowerCase();
      const rows = byName.get(key) ?? [];
      rows.push({
        layoutId: cleanToken(layout.layoutId),
        layoutName: cleanToken(layout.layoutName),
        baseTableOccurrence: cleanToken(layout.baseTableOccurrence)
      });
      byName.set(key, rows);
    }
  }
  return byName;
}

function normalizeDraftValueLists(
  rows: ManageValueListsSaveDraft["valueLists"]
): SchemaSnapshotValueList[] {
  const next: SchemaSnapshotValueList[] = [];
  const usedNames = new Set<string>();

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] ?? {};
    const baseName = cleanToken(row.name);
    if (!baseName) {
      continue;
    }

    let resolvedName = baseName;
    if (usedNames.has(resolvedName.toLowerCase())) {
      let duplicateCounter = 2;
      while (usedNames.has(`${baseName} ${duplicateCounter}`.toLowerCase())) {
        duplicateCounter += 1;
      }
      resolvedName = `${baseName} ${duplicateCounter}`;
    }
    usedNames.add(resolvedName.toLowerCase());

    const sourceFields = dedupeCaseInsensitive(Array.isArray(row.sourceFields) ? row.sourceFields : []);
    const values = (Array.isArray(row.values) ? row.values : [])
      .map((value) => cleanToken(value))
      .filter((value) => value.length > 0);
    const source = cleanToken(row.source) || (sourceFields.length > 0 ? "From Field" : "Custom Values");

    next.push({
      id: cleanToken(row.id) || `value-list-${index + 1}`,
      name: resolvedName,
      source,
      sourceFields,
      values
    });
  }

  return next;
}

export function buildManageValueListsPayload(
  snapshot: SchemaSnapshot,
  options?: BuildPayloadOptions
): ManageValueListsPayload {
  const files = snapshot.files.map((file) => ({
    fileId: cleanToken(file.fileId),
    displayName: cleanToken(file.displayName) || cleanToken(file.databaseName) || cleanToken(file.fileId),
    databaseName: cleanToken(file.databaseName),
    primary: file.primary === true
  }));
  const requestedFileId = cleanToken(options?.selectedFileId);
  const selectedFile =
    snapshot.files.find((file) => cleanToken(file.fileId).toLowerCase() === requestedFileId.toLowerCase()) ??
    snapshot.files.find((file) => file.primary) ??
    snapshot.files[0] ??
    null;

  if (!selectedFile) {
    return {
      files,
      selectedFileId: "",
      source: mapSource(snapshot.source),
      databaseName: "",
      valueLists: []
    };
  }

  const usageByListName = buildUsageByListName(selectedFile);
  const valueLists = (selectedFile.valueLists ?? []).map((valueList, index) => {
    const name = cleanToken(valueList.name);
    const usageRefs = usageByListName.get(name.toLowerCase()) ?? [];
    return {
      id: cleanToken(valueList.id) || `value-list-${index + 1}`,
      name: name || `Value List ${index + 1}`,
      source: cleanToken(valueList.source) || (valueList.sourceFields.length > 0 ? "From Field" : "Custom Values"),
      sourceFields: dedupeCaseInsensitive(valueList.sourceFields ?? []),
      values: (valueList.values ?? []).map((value) => cleanToken(value)).filter((value) => value.length > 0),
      creationOrder: index + 1,
      usageCount: usageRefs.length,
      usageRefs
    } satisfies ManageValueListRow;
  });

  return {
    files,
    selectedFileId: cleanToken(selectedFile.fileId),
    source: mapSource(snapshot.source),
    databaseName: cleanToken(selectedFile.databaseName),
    valueLists
  };
}

export function applyManageValueListsDraftToSnapshot(
  snapshot: SchemaSnapshot,
  draft: ManageValueListsSaveDraft
): SchemaSnapshot {
  const fileId = cleanToken(draft.fileId);
  if (!fileId) {
    throw new Error("Missing fileId in Manage Value Lists draft");
  }
  const fileIndex = snapshot.files.findIndex(
    (file) => cleanToken(file.fileId).toLowerCase() === fileId.toLowerCase()
  );
  if (fileIndex < 0) {
    throw new Error(`File ${fileId} not found in workspace snapshot`);
  }

  const nextFiles = [...snapshot.files];
  const target = nextFiles[fileIndex];
  if (!target) {
    throw new Error(`File ${fileId} not found in workspace snapshot`);
  }
  nextFiles[fileIndex] = {
    ...target,
    valueLists: normalizeDraftValueLists(draft.valueLists ?? [])
  };

  return {
    ...snapshot,
    files: nextFiles
  };
}

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  ensureWorkspaceStorage,
  normalizeWorkspaceId,
  readWorkspaceConfig,
  workspaceLayoutsDirPath,
  workspaceRootPath,
  writeWorkspaceConfig,
  type WorkspaceConfig
} from "./workspace-context.ts";
import {
  readAppLayerWorkspaceConfig,
  writeAppLayerWorkspaceConfig,
  type AppLayerWorkspaceConfig
} from "./app-layer-storage.ts";
import {
  readSavedSearchConfig,
  writeSavedSearchConfig,
  type SavedSearchConfig
} from "./saved-search-storage.ts";
import {
  clearWorkspaceSchemaOverlay,
  readWorkspaceSchemaOverlay,
  writeWorkspaceSchemaOverlay,
  type WorkspaceSchemaOverlay
} from "./workspace-schema-storage.ts";
import {
  readCustomMenuConfig,
  writeCustomMenuConfig,
  type CustomMenuConfig
} from "./custom-menu-storage.ts";
import { readSchemaSnapshotCollection } from "./schema-snapshot-storage.ts";

const VERSION_STORE_VERSION = 1 as const;
const DEFAULT_RETENTION = 120;

type WorkspaceVersionSnapshotPointers = {
  schemaSnapshotId?: string;
  layoutSnapshotHash: string;
  scriptSnapshotHash?: string;
  valueListSnapshotHash?: string;
  workspaceConfigHash: string;
  appLayerConfigHash: string;
  savedSearchConfigHash: string;
  customMenuConfigHash: string;
  schemaOverlayHash?: string;
};

export type WorkspaceVersionBundle = {
  workspaceConfig: WorkspaceConfig | null;
  appLayerConfig: AppLayerWorkspaceConfig;
  savedSearchConfig: SavedSearchConfig;
  customMenuConfig: CustomMenuConfig;
  schemaOverlay: WorkspaceSchemaOverlay | null;
};

export type WorkspaceVersionEntry = {
  versionId: string;
  createdAt: string;
  createdBy: string;
  message: string;
  source: "manual" | "auto-migration" | "auto-rollback" | "auto-refactor";
  hash: string;
  pointers: WorkspaceVersionSnapshotPointers;
  bundle: WorkspaceVersionBundle;
};

export type WorkspaceVersionCollection = {
  version: 1;
  currentVersionId?: string;
  versions: WorkspaceVersionEntry[];
};

export type WorkspaceVersionDiffSummary = {
  baselineVersionId: string;
  targetVersionId: string;
  changedSections: Array<{
    section:
      | "workspaceConfig"
      | "appLayerConfig"
      | "savedSearchConfig"
      | "customMenuConfig"
      | "schemaOverlay"
      | "layouts";
    changed: boolean;
    baselineHash?: string;
    targetHash?: string;
  }>;
  changedCount: number;
};

type CreateWorkspaceVersionOptions = {
  createdBy: string;
  message: string;
  source?: WorkspaceVersionEntry["source"];
  retainCount?: number;
};

function versionStorePath(workspaceId?: string): string {
  return path.join(workspaceRootPath(workspaceId), "workspace-versions.json");
}

function stableNormalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => stableNormalize(entry));
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const candidate = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};
  for (const key of Object.keys(candidate).sort((left, right) => left.localeCompare(right))) {
    next[key] = stableNormalize(candidate[key]);
  }
  return next;
}

function stableJson(value: unknown): string {
  return JSON.stringify(stableNormalize(value));
}

function hashPayload(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

async function readLayoutSnapshotHash(workspaceId: string): Promise<string> {
  const layoutsDir = workspaceLayoutsDirPath(workspaceId);
  if (!existsSync(layoutsDir)) {
    return hashPayload([]);
  }
  const entries = await fs.readdir(layoutsDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
  const layoutPayload: Array<{ file: string; contentHash: string }> = [];
  for (const fileName of files) {
    const content = await fs.readFile(path.join(layoutsDir, fileName), "utf8");
    layoutPayload.push({
      file: fileName,
      contentHash: hashPayload(content)
    });
  }
  return hashPayload(layoutPayload);
}

function normalizeCollection(raw: unknown): WorkspaceVersionCollection {
  if (!raw || typeof raw !== "object") {
    return {
      version: VERSION_STORE_VERSION,
      versions: []
    };
  }
  const candidate = raw as Partial<WorkspaceVersionCollection>;
  const versions = Array.isArray(candidate.versions) ? candidate.versions : [];
  const normalizedVersions = versions
    .map((entry) => normalizeVersionEntry(entry))
    .filter((entry): entry is WorkspaceVersionEntry => Boolean(entry))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const currentVersionId = String(candidate.currentVersionId ?? "").trim();
  return {
    version: VERSION_STORE_VERSION,
    currentVersionId:
      normalizedVersions.find((entry) => entry.versionId === currentVersionId)?.versionId ??
      normalizedVersions[0]?.versionId,
    versions: normalizedVersions
  };
}

function normalizeVersionEntry(raw: unknown): WorkspaceVersionEntry | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const candidate = raw as Partial<WorkspaceVersionEntry>;
  const versionId = String(candidate.versionId ?? "").trim();
  if (!versionId) {
    return null;
  }
  const sourceToken = String(candidate.source ?? "").trim();
  const source: WorkspaceVersionEntry["source"] =
    sourceToken === "auto-migration" || sourceToken === "auto-rollback" || sourceToken === "auto-refactor"
      ? sourceToken
      : "manual";
  const bundle = candidate.bundle ?? null;
  if (!bundle || typeof bundle !== "object") {
    return null;
  }
  return {
    versionId,
    createdAt: String(candidate.createdAt ?? "").trim() || new Date(0).toISOString(),
    createdBy: String(candidate.createdBy ?? "").trim() || "unknown",
    message: String(candidate.message ?? "").trim() || "Workspace checkpoint",
    source,
    hash: String(candidate.hash ?? "").trim() || hashPayload(bundle),
    pointers: (candidate.pointers as WorkspaceVersionSnapshotPointers | undefined) ?? {
      layoutSnapshotHash: hashPayload([]),
      workspaceConfigHash: hashPayload({}),
      appLayerConfigHash: hashPayload({}),
      savedSearchConfigHash: hashPayload({}),
      customMenuConfigHash: hashPayload({})
    },
    bundle: bundle as WorkspaceVersionBundle
  };
}

async function captureWorkspaceBundle(workspaceId: string): Promise<{
  bundle: WorkspaceVersionBundle;
  pointers: WorkspaceVersionSnapshotPointers;
}> {
  const [workspaceConfig, appLayerConfig, savedSearchConfig, customMenuConfig, schemaOverlay, snapshots, layoutHash] =
    await Promise.all([
      readWorkspaceConfig(workspaceId),
      readAppLayerWorkspaceConfig(workspaceId),
      readSavedSearchConfig(workspaceId),
      readCustomMenuConfig(workspaceId),
      readWorkspaceSchemaOverlay(workspaceId),
      readSchemaSnapshotCollection(workspaceId),
      readLayoutSnapshotHash(workspaceId)
    ]);

  const scriptHash = schemaOverlay
    ? hashPayload(schemaOverlay.files.map((file) => ({ fileId: file.fileId, scripts: file.scripts })))
    : undefined;
  const valueListHash = schemaOverlay
    ? hashPayload(schemaOverlay.files.map((file) => ({ fileId: file.fileId, valueLists: file.valueLists })))
    : undefined;

  const bundle: WorkspaceVersionBundle = {
    workspaceConfig,
    appLayerConfig,
    savedSearchConfig,
    customMenuConfig,
    schemaOverlay
  };
  const pointers: WorkspaceVersionSnapshotPointers = {
    schemaSnapshotId: snapshots.snapshots[0]?.snapshotId,
    layoutSnapshotHash: layoutHash,
    scriptSnapshotHash: scriptHash,
    valueListSnapshotHash: valueListHash,
    workspaceConfigHash: hashPayload(workspaceConfig),
    appLayerConfigHash: hashPayload(appLayerConfig),
    savedSearchConfigHash: hashPayload(savedSearchConfig),
    customMenuConfigHash: hashPayload(customMenuConfig),
    schemaOverlayHash: schemaOverlay ? hashPayload(schemaOverlay) : undefined
  };
  return { bundle, pointers };
}

export async function readWorkspaceVersionCollection(
  workspaceId?: string
): Promise<WorkspaceVersionCollection> {
  const normalized = normalizeWorkspaceId(workspaceId);
  await ensureWorkspaceStorage(normalized);
  const filePath = versionStorePath(normalized);
  if (!existsSync(filePath)) {
    return {
      version: VERSION_STORE_VERSION,
      versions: []
    };
  }
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return normalizeCollection(JSON.parse(raw));
  } catch {
    return {
      version: VERSION_STORE_VERSION,
      versions: []
    };
  }
}

export async function writeWorkspaceVersionCollection(
  workspaceId: string,
  collection: WorkspaceVersionCollection
): Promise<WorkspaceVersionCollection> {
  const normalized = normalizeWorkspaceId(workspaceId);
  await ensureWorkspaceStorage(normalized);
  const normalizedPayload = normalizeCollection(collection);
  await fs.writeFile(versionStorePath(normalized), JSON.stringify(normalizedPayload, null, 2), "utf8");
  return normalizedPayload;
}

export async function createWorkspaceVersion(
  workspaceId: string,
  options: CreateWorkspaceVersionOptions
): Promise<{ collection: WorkspaceVersionCollection; version: WorkspaceVersionEntry; deduped: boolean }> {
  const normalized = normalizeWorkspaceId(workspaceId);
  const current = await readWorkspaceVersionCollection(normalized);
  const { bundle, pointers } = await captureWorkspaceBundle(normalized);
  const hash = hashPayload(bundle);
  const latest = current.versions[0];
  if (latest && latest.hash === hash) {
    return {
      collection: current,
      version: latest,
      deduped: true
    };
  }
  const version: WorkspaceVersionEntry = {
    versionId: `wv-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
    createdBy: String(options.createdBy ?? "").trim() || "unknown",
    message: String(options.message ?? "").trim() || "Workspace checkpoint",
    source: options.source ?? "manual",
    hash,
    pointers,
    bundle
  };
  const retainCount = Math.max(1, Math.round(options.retainCount ?? DEFAULT_RETENTION));
  const saved = await writeWorkspaceVersionCollection(normalized, {
    version: VERSION_STORE_VERSION,
    currentVersionId: version.versionId,
    versions: [version, ...current.versions].slice(0, retainCount)
  });
  return {
    collection: saved,
    version,
    deduped: false
  };
}

export async function findWorkspaceVersion(
  workspaceId: string,
  versionId: string
): Promise<WorkspaceVersionEntry | null> {
  const collection = await readWorkspaceVersionCollection(workspaceId);
  return collection.versions.find((entry) => entry.versionId === versionId) ?? null;
}

export async function rollbackWorkspaceVersion(
  workspaceId: string,
  versionId: string,
  actor: string
): Promise<{
  collection: WorkspaceVersionCollection;
  restoredVersion: WorkspaceVersionEntry;
  safetyVersion: WorkspaceVersionEntry;
}> {
  const normalized = normalizeWorkspaceId(workspaceId);
  const target = await findWorkspaceVersion(normalized, versionId);
  if (!target) {
    throw new Error(`Workspace version "${versionId}" not found.`);
  }

  const safetyCheckpoint = await createWorkspaceVersion(normalized, {
    createdBy: actor,
    message: `Safety checkpoint before rollback to ${versionId}`,
    source: "auto-rollback"
  });

  const bundle = target.bundle;
  if (bundle.workspaceConfig) {
    await writeWorkspaceConfig(normalized, bundle.workspaceConfig);
  }
  await writeAppLayerWorkspaceConfig(normalized, bundle.appLayerConfig);
  await writeSavedSearchConfig(normalized, bundle.savedSearchConfig);
  await writeCustomMenuConfig(normalized, bundle.customMenuConfig);
  if (bundle.schemaOverlay) {
    await writeWorkspaceSchemaOverlay(normalized, bundle.schemaOverlay);
  } else {
    await clearWorkspaceSchemaOverlay(normalized);
  }

  const collection = await writeWorkspaceVersionCollection(normalized, {
    ...(await readWorkspaceVersionCollection(normalized)),
    currentVersionId: target.versionId
  });

  return {
    collection,
    restoredVersion: target,
    safetyVersion: safetyCheckpoint.version
  };
}

export async function diffWorkspaceVersions(
  workspaceId: string,
  baselineVersionId: string,
  targetVersionId: string
): Promise<WorkspaceVersionDiffSummary> {
  const baseline = await findWorkspaceVersion(workspaceId, baselineVersionId);
  const target = await findWorkspaceVersion(workspaceId, targetVersionId);
  if (!baseline || !target) {
    throw new Error("Version diff requires baseline and target version IDs.");
  }
  const changedSections: WorkspaceVersionDiffSummary["changedSections"] = [
    {
      section: "workspaceConfig",
      changed: baseline.pointers.workspaceConfigHash !== target.pointers.workspaceConfigHash,
      baselineHash: baseline.pointers.workspaceConfigHash,
      targetHash: target.pointers.workspaceConfigHash
    },
    {
      section: "appLayerConfig",
      changed: baseline.pointers.appLayerConfigHash !== target.pointers.appLayerConfigHash,
      baselineHash: baseline.pointers.appLayerConfigHash,
      targetHash: target.pointers.appLayerConfigHash
    },
    {
      section: "savedSearchConfig",
      changed: baseline.pointers.savedSearchConfigHash !== target.pointers.savedSearchConfigHash,
      baselineHash: baseline.pointers.savedSearchConfigHash,
      targetHash: target.pointers.savedSearchConfigHash
    },
    {
      section: "customMenuConfig",
      changed: baseline.pointers.customMenuConfigHash !== target.pointers.customMenuConfigHash,
      baselineHash: baseline.pointers.customMenuConfigHash,
      targetHash: target.pointers.customMenuConfigHash
    },
    {
      section: "schemaOverlay",
      changed: baseline.pointers.schemaOverlayHash !== target.pointers.schemaOverlayHash,
      baselineHash: baseline.pointers.schemaOverlayHash,
      targetHash: target.pointers.schemaOverlayHash
    },
    {
      section: "layouts",
      changed: baseline.pointers.layoutSnapshotHash !== target.pointers.layoutSnapshotHash,
      baselineHash: baseline.pointers.layoutSnapshotHash,
      targetHash: target.pointers.layoutSnapshotHash
    }
  ];
  return {
    baselineVersionId,
    targetVersionId,
    changedSections,
    changedCount: changedSections.filter((entry) => entry.changed).length
  };
}

export async function exportWorkspaceVersionBundle(
  workspaceId: string,
  versionId: string
): Promise<WorkspaceVersionEntry> {
  const entry = await findWorkspaceVersion(workspaceId, versionId);
  if (!entry) {
    throw new Error(`Workspace version "${versionId}" not found.`);
  }
  return entry;
}


import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  normalizeWorkspaceId,
  workspaceRootPath,
  ensureWorkspaceStorage
} from "./workspace-context.ts";
import { normalizeSchemaSnapshot, normalizeSchemaSnapshotCollection } from "../lib/schemaSnapshot/normalize.ts";
import type {
  SchemaSnapshot,
  SchemaSnapshotCollection
} from "../lib/schemaSnapshot/types.ts";

const SNAPSHOT_STORE_VERSION = 1 as const;
const DEFAULT_SNAPSHOT_RETAIN_COUNT = 20;

function snapshotStorePath(workspaceId?: string): string {
  return path.join(workspaceRootPath(workspaceId), "schema-snapshots.json");
}

function tagStorePath(workspaceId?: string): string {
  return path.join(workspaceRootPath(workspaceId), "schema-snapshot-tags.json");
}

type SchemaSnapshotTagCollection = {
  version: 1;
  tags: Record<string, string>;
};

const DEFAULT_TAG_COLLECTION: SchemaSnapshotTagCollection = {
  version: 1,
  tags: {}
};

function normalizeTagCollection(raw: unknown): SchemaSnapshotTagCollection {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_TAG_COLLECTION;
  }
  const candidate = raw as { version?: unknown; tags?: unknown };
  const tagsRecord: Record<string, string> = {};
  if (candidate.tags && typeof candidate.tags === "object") {
    for (const [snapshotId, label] of Object.entries(candidate.tags as Record<string, unknown>)) {
      const key = String(snapshotId ?? "").trim();
      const value = String(label ?? "").trim();
      if (!key || !value) {
        continue;
      }
      tagsRecord[key] = value;
    }
  }
  return {
    version: SNAPSHOT_STORE_VERSION,
    tags: tagsRecord
  };
}

export async function readSchemaSnapshotCollection(workspaceId?: string): Promise<SchemaSnapshotCollection> {
  const normalized = normalizeWorkspaceId(workspaceId);
  await ensureWorkspaceStorage(normalized);
  const filePath = snapshotStorePath(normalized);
  if (!existsSync(filePath)) {
    return {
      version: SNAPSHOT_STORE_VERSION,
      snapshots: []
    };
  }
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<SchemaSnapshotCollection>;
    const normalizedPayload = normalizeSchemaSnapshotCollection({
      version: SNAPSHOT_STORE_VERSION,
      snapshots: Array.isArray(parsed?.snapshots) ? parsed.snapshots.map((entry) => normalizeSchemaSnapshot(entry)) : []
    });
    return normalizedPayload;
  } catch {
    return {
      version: SNAPSHOT_STORE_VERSION,
      snapshots: []
    };
  }
}

export async function writeSchemaSnapshotCollection(
  workspaceId: string,
  collection: SchemaSnapshotCollection
): Promise<SchemaSnapshotCollection> {
  const normalized = normalizeWorkspaceId(workspaceId);
  await ensureWorkspaceStorage(normalized);
  const normalizedCollection = normalizeSchemaSnapshotCollection({
    version: SNAPSHOT_STORE_VERSION,
    snapshots: collection.snapshots ?? []
  });
  await fs.writeFile(snapshotStorePath(normalized), JSON.stringify(normalizedCollection, null, 2), "utf8");
  return normalizedCollection;
}

export async function saveSchemaSnapshot(
  workspaceId: string,
  snapshot: SchemaSnapshot,
  options?: {
    retainCount?: number;
  }
): Promise<SchemaSnapshotCollection> {
  const normalized = normalizeWorkspaceId(workspaceId);
  const retainCount = Math.max(1, Math.round(options?.retainCount ?? DEFAULT_SNAPSHOT_RETAIN_COUNT));
  const current = await readSchemaSnapshotCollection(normalized);
  const existingWithoutDuplicate = current.snapshots.filter((entry) => entry.snapshotId !== snapshot.snapshotId);
  const nextSnapshots = [normalizeSchemaSnapshot(snapshot), ...existingWithoutDuplicate].slice(0, retainCount);
  return writeSchemaSnapshotCollection(normalized, {
    version: SNAPSHOT_STORE_VERSION,
    snapshots: nextSnapshots
  });
}

export async function deleteSchemaSnapshot(
  workspaceId: string,
  snapshotId: string
): Promise<SchemaSnapshotCollection> {
  const normalized = normalizeWorkspaceId(workspaceId);
  const current = await readSchemaSnapshotCollection(normalized);
  const next = current.snapshots.filter((entry) => entry.snapshotId !== snapshotId);
  const saved = await writeSchemaSnapshotCollection(normalized, {
    version: SNAPSHOT_STORE_VERSION,
    snapshots: next
  });
  const tags = await readSchemaSnapshotTags(normalized);
  if (tags.tags[snapshotId]) {
    delete tags.tags[snapshotId];
    await writeSchemaSnapshotTags(normalized, tags);
  }
  return saved;
}

export async function findSchemaSnapshot(
  workspaceId: string,
  snapshotId: string
): Promise<SchemaSnapshot | null> {
  const collection = await readSchemaSnapshotCollection(workspaceId);
  return collection.snapshots.find((entry) => entry.snapshotId === snapshotId) ?? null;
}

export async function readSchemaSnapshotTags(workspaceId?: string): Promise<SchemaSnapshotTagCollection> {
  const normalized = normalizeWorkspaceId(workspaceId);
  await ensureWorkspaceStorage(normalized);
  const filePath = tagStorePath(normalized);
  if (!existsSync(filePath)) {
    return DEFAULT_TAG_COLLECTION;
  }
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return normalizeTagCollection(JSON.parse(raw));
  } catch {
    return DEFAULT_TAG_COLLECTION;
  }
}

export async function writeSchemaSnapshotTags(
  workspaceId: string,
  payload: SchemaSnapshotTagCollection
): Promise<SchemaSnapshotTagCollection> {
  const normalized = normalizeWorkspaceId(workspaceId);
  await ensureWorkspaceStorage(normalized);
  const normalizedPayload = normalizeTagCollection(payload);
  await fs.writeFile(tagStorePath(normalized), JSON.stringify(normalizedPayload, null, 2), "utf8");
  return normalizedPayload;
}

export async function tagSchemaSnapshot(
  workspaceId: string,
  snapshotId: string,
  label: string
): Promise<SchemaSnapshotTagCollection> {
  const normalized = normalizeWorkspaceId(workspaceId);
  const cleanedId = String(snapshotId ?? "").trim();
  const cleanedLabel = String(label ?? "").trim();
  const tags = await readSchemaSnapshotTags(normalized);
  if (!cleanedId || !cleanedLabel) {
    return tags;
  }
  tags.tags[cleanedId] = cleanedLabel;
  return writeSchemaSnapshotTags(normalized, tags);
}

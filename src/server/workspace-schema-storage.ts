import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { ensureWorkspaceStorage, normalizeWorkspaceId, workspaceRootPath } from "./workspace-context.ts";
import type { SchemaSnapshotFile } from "../lib/schemaSnapshot/types.ts";

export type WorkspaceSchemaOverlay = {
  version: 1;
  workspaceId: string;
  updatedAt: string;
  sourceSnapshotId?: string;
  files: SchemaSnapshotFile[];
};

const DEFAULT_SCHEMA_OVERLAY: WorkspaceSchemaOverlay = {
  version: 1,
  workspaceId: "default",
  updatedAt: "",
  sourceSnapshotId: undefined,
  files: []
};

function schemaOverlayPath(workspaceId?: string): string {
  return path.join(workspaceRootPath(workspaceId), "workspace-schema.json");
}

function normalizeOverlay(workspaceId: string, raw: unknown): WorkspaceSchemaOverlay {
  if (!raw || typeof raw !== "object") {
    return {
      ...DEFAULT_SCHEMA_OVERLAY,
      workspaceId
    };
  }
  const candidate = raw as Partial<WorkspaceSchemaOverlay>;
  const files = Array.isArray(candidate.files) ? (candidate.files as SchemaSnapshotFile[]) : [];
  return {
    version: 1,
    workspaceId,
    updatedAt: String(candidate.updatedAt ?? "").trim() || new Date(0).toISOString(),
    sourceSnapshotId: String(candidate.sourceSnapshotId ?? "").trim() || undefined,
    files: files
      .map((entry) => ({
        ...entry,
        fileId: String(entry.fileId ?? "").trim(),
        workspaceId: String(entry.workspaceId ?? workspaceId).trim() || workspaceId,
        databaseName: String(entry.databaseName ?? "").trim(),
        displayName: String(entry.displayName ?? "").trim() || undefined,
        dependencies: Array.isArray(entry.dependencies)
          ? entry.dependencies.map((token) => String(token ?? "").trim()).filter((token) => token.length > 0)
          : [],
        tables: Array.isArray(entry.tables) ? entry.tables : [],
        tableOccurrences: Array.isArray(entry.tableOccurrences) ? entry.tableOccurrences : [],
        relationships: Array.isArray(entry.relationships) ? entry.relationships : [],
        valueLists: Array.isArray(entry.valueLists) ? entry.valueLists : [],
        layouts: Array.isArray(entry.layouts) ? entry.layouts : [],
        scripts: Array.isArray(entry.scripts) ? entry.scripts : []
      }))
      .filter((entry) => entry.fileId.length > 0 && entry.databaseName.length > 0)
      .sort((left, right) => left.fileId.localeCompare(right.fileId, undefined, { sensitivity: "base" }))
  };
}

export async function readWorkspaceSchemaOverlay(workspaceId?: string): Promise<WorkspaceSchemaOverlay | null> {
  const normalized = normalizeWorkspaceId(workspaceId);
  await ensureWorkspaceStorage(normalized);
  const filePath = schemaOverlayPath(normalized);
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return normalizeOverlay(normalized, JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function writeWorkspaceSchemaOverlay(
  workspaceId: string,
  payload: Partial<WorkspaceSchemaOverlay>
): Promise<WorkspaceSchemaOverlay> {
  const normalized = normalizeWorkspaceId(workspaceId);
  await ensureWorkspaceStorage(normalized);
  const normalizedPayload = normalizeOverlay(normalized, {
    version: 1,
    workspaceId: normalized,
    updatedAt: new Date().toISOString(),
    sourceSnapshotId: payload.sourceSnapshotId,
    files: payload.files ?? []
  });
  await fs.writeFile(schemaOverlayPath(normalized), JSON.stringify(normalizedPayload, null, 2), "utf8");
  return normalizedPayload;
}

export async function clearWorkspaceSchemaOverlay(workspaceId: string): Promise<void> {
  const normalized = normalizeWorkspaceId(workspaceId);
  await ensureWorkspaceStorage(normalized);
  const filePath = schemaOverlayPath(normalized);
  if (!existsSync(filePath)) {
    return;
  }
  await fs.unlink(filePath);
}

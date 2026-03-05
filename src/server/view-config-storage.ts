import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { ensureWorkspaceStorage, normalizeWorkspaceId, workspaceRootPath } from "./workspace-context.ts";

export type TableColumnViewConfig = {
  field: string;
  width?: number;
  hidden?: boolean;
  order?: number;
};

export type LayoutViewConfig = {
  layoutId: string;
  listRowFields: string[];
  tableColumns: TableColumnViewConfig[];
  updatedAt: number;
};

export type WorkspaceViewConfig = {
  version: 1;
  layouts: Record<string, LayoutViewConfig>;
};

const DEFAULT_CONFIG: WorkspaceViewConfig = {
  version: 1,
  layouts: {}
};

function configPath(workspaceId?: string): string {
  return path.join(workspaceRootPath(workspaceId), "view-configs.json");
}

function normalizeToken(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeListRowFields(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const next: string[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    const token = normalizeToken(entry);
    if (!token) {
      continue;
    }
    const key = token.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    next.push(token);
  }
  return next;
}

function normalizeTableColumns(raw: unknown): TableColumnViewConfig[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const next: TableColumnViewConfig[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const candidate = entry as Record<string, unknown>;
    const field = normalizeToken(candidate.field);
    if (!field) {
      continue;
    }
    const key = field.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const widthValue = Number(candidate.width ?? NaN);
    const orderValue = Number(candidate.order ?? NaN);
    next.push({
      field,
      width: Number.isFinite(widthValue) && widthValue > 32 ? Math.round(widthValue) : undefined,
      hidden: candidate.hidden === true,
      order: Number.isFinite(orderValue) ? Math.max(0, Math.trunc(orderValue)) : undefined
    });
  }
  return next;
}

function normalizeLayoutViewConfig(raw: unknown, fallbackLayoutId = ""): LayoutViewConfig | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  const layoutId = normalizeToken(candidate.layoutId || fallbackLayoutId);
  if (!layoutId) {
    return null;
  }
  const updatedAtValue = Number(candidate.updatedAt ?? Date.now());
  return {
    layoutId,
    listRowFields: normalizeListRowFields(candidate.listRowFields),
    tableColumns: normalizeTableColumns(candidate.tableColumns),
    updatedAt: Number.isFinite(updatedAtValue) ? Math.trunc(updatedAtValue) : Date.now()
  };
}

function normalizeWorkspaceViewConfig(raw: unknown): WorkspaceViewConfig {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_CONFIG;
  }
  const candidate = raw as Record<string, unknown>;
  const layoutsRaw = candidate.layouts;
  const layouts: Record<string, LayoutViewConfig> = {};
  if (layoutsRaw && typeof layoutsRaw === "object" && !Array.isArray(layoutsRaw)) {
    for (const [layoutId, layoutConfigRaw] of Object.entries(layoutsRaw as Record<string, unknown>)) {
      const normalizedLayoutId = normalizeToken(layoutId);
      if (!normalizedLayoutId) {
        continue;
      }
      const normalized = normalizeLayoutViewConfig(layoutConfigRaw, normalizedLayoutId);
      if (!normalized) {
        continue;
      }
      layouts[normalizedLayoutId] = normalized;
    }
  }
  return {
    version: 1,
    layouts
  };
}

export async function readWorkspaceViewConfig(workspaceId?: string): Promise<WorkspaceViewConfig> {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
  await ensureWorkspaceStorage(normalizedWorkspaceId);
  const filePath = configPath(normalizedWorkspaceId);
  if (!existsSync(filePath)) {
    return DEFAULT_CONFIG;
  }
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return normalizeWorkspaceViewConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function readLayoutViewConfig(
  workspaceId: string,
  layoutId: string
): Promise<LayoutViewConfig | null> {
  const workspace = await readWorkspaceViewConfig(workspaceId);
  const normalizedLayoutId = normalizeToken(layoutId);
  if (!normalizedLayoutId) {
    return null;
  }
  return workspace.layouts[normalizedLayoutId] ?? null;
}

export async function writeLayoutViewConfig(
  workspaceId: string,
  layoutId: string,
  config: Partial<LayoutViewConfig>
): Promise<LayoutViewConfig> {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
  const normalizedLayoutId = normalizeToken(layoutId);
  if (!normalizedLayoutId) {
    throw new Error("layoutId is required");
  }
  await ensureWorkspaceStorage(normalizedWorkspaceId);
  const current = await readWorkspaceViewConfig(normalizedWorkspaceId);
  const merged = normalizeLayoutViewConfig(
    {
      ...current.layouts[normalizedLayoutId],
      ...config,
      layoutId: normalizedLayoutId,
      updatedAt: Date.now()
    },
    normalizedLayoutId
  );
  if (!merged) {
    throw new Error("Failed to normalize layout view config");
  }
  const next: WorkspaceViewConfig = {
    version: 1,
    layouts: {
      ...current.layouts,
      [normalizedLayoutId]: merged
    }
  };
  await fs.writeFile(configPath(normalizedWorkspaceId), JSON.stringify(next, null, 2), "utf8");
  return merged;
}


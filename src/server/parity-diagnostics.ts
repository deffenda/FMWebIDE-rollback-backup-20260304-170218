import { promises as fs } from "node:fs";
import path from "node:path";
import type { LayoutComponent, LayoutDefinition } from "../lib/layout-model.ts";
import { isParityMatrixReport, type ParityMatrixReport } from "../lib/parity-matrix-report.ts";
import { ensureWorkspaceStorage, normalizeWorkspaceId, workspaceLayoutsDirPath } from "./workspace-context.ts";

const PARITY_MATRIX_JSON_PATH = path.join(
  process.cwd(),
  "docs",
  "audit",
  "Parity_Matrix_FileMaker_vs_FMWebIDE.json"
);
const PARITY_MATRIX_SCHEMA_PATH = path.join(
  process.cwd(),
  "docs",
  "audit",
  "Parity_Matrix_FileMaker_vs_FMWebIDE.schema.json"
);
const BASELINE_CACHE_PATH = path.join(process.cwd(), "docs", "audit", ".cache", "baseline.json");

type BaselineSummary = {
  generatedAt: string;
  toolchain: {
    packageManager: string;
    nextVersion: string;
    reactVersion: string;
    typescriptVersion: string;
    hasStrictTypescript: boolean;
  };
  inventory: {
    apiRouteCount: number;
    componentCount: number;
    libModuleCount: number;
    serverModuleCount: number;
  };
};

type LayoutObjectBounds = {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
  groupId?: string;
  fieldBinding?: string;
};

export type LayoutFoundationDiagnostics = {
  workspaceId: string;
  source: "workspace" | "synthetic";
  layoutId: string;
  layoutName: string;
  defaultTableOccurrence: string;
  partCount: number;
  objectCount: number;
  groupedObjectCount: number;
  objects: LayoutObjectBounds[];
  canvas: {
    width: number;
    height: number;
  };
};

export type Phase1ParityDiagnosticsPayload = {
  generatedAt: string;
  parityReport: ParityMatrixReport;
  parityReportSchema: Record<string, unknown>;
  baseline: BaselineSummary | null;
  layout: LayoutFoundationDiagnostics;
  warnings: string[];
};

function fallbackParityReport(): ParityMatrixReport {
  return {
    version: 1,
    generatedAt: "unavailable",
    sourceFingerprint: "unavailable",
    summary: {
      total: 0,
      supported: 0,
      partial: 0,
      unsupported: 0,
      unknown: 0
    },
    features: []
  };
}

function toObjectBounds(component: LayoutComponent): LayoutObjectBounds {
  return {
    id: component.id,
    type: component.type,
    x: component.position.x,
    y: component.position.y,
    width: component.position.width,
    height: component.position.height,
    z: component.position.z,
    groupId: component.props.groupId,
    fieldBinding: component.binding?.field
  };
}

function createSyntheticLayout(): LayoutDefinition {
  return {
    id: "phase1-synthetic-layout",
    name: "Phase 1 Synthetic Layout",
    defaultTableOccurrence: "Assets",
    canvas: {
      width: 900,
      height: 460,
      gridSize: 8,
      showGrid: false,
      snapToGrid: false
    },
    parts: [
      {
        id: "phase1-part-header",
        type: "header",
        label: "Header",
        height: 72
      },
      {
        id: "phase1-part-body",
        type: "body",
        label: "Body",
        height: 388
      }
    ],
    components: [
      {
        id: "phase1-label-name",
        type: "label",
        position: {
          x: 32,
          y: 106,
          width: 180,
          height: 24,
          z: 1
        },
        binding: {},
        props: {
          label: "Asset Name"
        }
      },
      {
        id: "phase1-field-name",
        type: "field",
        position: {
          x: 32,
          y: 136,
          width: 320,
          height: 36,
          z: 2
        },
        binding: {
          field: "Name",
          tableOccurrence: "Assets"
        },
        props: {
          placeholder: "Name",
          controlType: "text",
          labelPlacement: "none"
        }
      },
      {
        id: "phase1-button-save",
        type: "button",
        position: {
          x: 32,
          y: 188,
          width: 120,
          height: 34,
          z: 3
        },
        binding: {},
        props: {
          label: "Commit"
        },
        events: {
          onClick: {
            action: "runScript",
            script: "Commit Records/Requests"
          }
        }
      }
    ],
    actions: []
  };
}

async function readJsonFile<T>(targetPath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(targetPath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function readParityReportWithFallback(warnings: string[]): Promise<ParityMatrixReport> {
  const report = await readJsonFile<unknown>(PARITY_MATRIX_JSON_PATH);
  if (report && isParityMatrixReport(report)) {
    return report;
  }
  warnings.push("Parity JSON report not found or invalid. Run `npm run audit` to regenerate artifacts.");
  return fallbackParityReport();
}

async function readParitySchemaWithFallback(warnings: string[]): Promise<Record<string, unknown>> {
  const schema = await readJsonFile<Record<string, unknown>>(PARITY_MATRIX_SCHEMA_PATH);
  if (schema && typeof schema === "object") {
    return schema;
  }
  warnings.push("Parity JSON schema not found. Run `npm run audit` to regenerate artifacts.");
  return {};
}

async function readBaselineSummary(): Promise<BaselineSummary | null> {
  const payload = await readJsonFile<{
    generatedAt?: string;
    toolchain?: BaselineSummary["toolchain"];
    inventory?: BaselineSummary["inventory"];
  }>(BASELINE_CACHE_PATH);
  if (!payload || !payload.toolchain || !payload.inventory) {
    return null;
  }
  return {
    generatedAt: String(payload.generatedAt ?? "unknown"),
    toolchain: payload.toolchain,
    inventory: payload.inventory
  };
}

function toLayoutDiagnostics(layout: LayoutDefinition, workspaceId: string, source: "workspace" | "synthetic"): LayoutFoundationDiagnostics {
  const objects = [...layout.components].map(toObjectBounds).sort((left, right) => {
    return left.z - right.z || left.y - right.y || left.x - right.x || left.id.localeCompare(right.id);
  });
  const groupedObjectIds = new Set(objects.filter((entry) => entry.groupId).map((entry) => entry.id));

  return {
    workspaceId,
    source,
    layoutId: layout.id,
    layoutName: layout.name,
    defaultTableOccurrence: layout.defaultTableOccurrence,
    partCount: layout.parts?.length ?? 0,
    objectCount: objects.length,
    groupedObjectCount: groupedObjectIds.size,
    objects,
    canvas: {
      width: layout.canvas.width,
      height: layout.canvas.height
    }
  };
}

async function readWorkspaceLayouts(workspaceId: string): Promise<LayoutDefinition[]> {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId);
  await ensureWorkspaceStorage(normalizedWorkspaceId);
  const layoutsDir = workspaceLayoutsDirPath(normalizedWorkspaceId);
  let entries: string[] = [];
  try {
    entries = await fs.readdir(layoutsDir);
  } catch {
    return [];
  }
  const files = entries.filter((entry) => entry.toLowerCase().endsWith(".json"));
  const layouts: LayoutDefinition[] = [];
  for (const fileName of files) {
    const filePath = path.join(layoutsDir, fileName);
    try {
      const parsed = JSON.parse(await fs.readFile(filePath, "utf8")) as LayoutDefinition;
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.components)) {
        continue;
      }
      layouts.push(parsed);
    } catch {
      continue;
    }
  }
  layouts.sort((left, right) => left.name.localeCompare(right.name));
  return layouts;
}

export async function readLayoutFoundationDiagnostics(workspaceId: string): Promise<LayoutFoundationDiagnostics> {
  const layouts = await readWorkspaceLayouts(workspaceId);
  const preferred = layouts.find((entry) => entry.components.length > 0) ?? layouts[0] ?? null;
  if (!preferred) {
    return toLayoutDiagnostics(createSyntheticLayout(), workspaceId, "synthetic");
  }
  return toLayoutDiagnostics(preferred, workspaceId, "workspace");
}

export async function readPhase1ParityDiagnostics(workspaceIdRaw?: string): Promise<Phase1ParityDiagnosticsPayload> {
  const warnings: string[] = [];
  const workspaceId = normalizeWorkspaceId(workspaceIdRaw);

  const [parityReport, parityReportSchema, baseline, layout] = await Promise.all([
    readParityReportWithFallback(warnings),
    readParitySchemaWithFallback(warnings),
    readBaselineSummary(),
    readLayoutFoundationDiagnostics(workspaceId)
  ]);

  return {
    generatedAt: new Date().toISOString(),
    parityReport,
    parityReportSchema,
    baseline,
    layout,
    warnings
  };
}

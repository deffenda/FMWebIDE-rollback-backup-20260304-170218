import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

type FidelityFixtureManifest = {
  id: string;
  label: string;
  paths: string[];
  layouts: string[];
};

type FidelityManifest = {
  version: number;
  tolerance?: {
    boundsPx?: number;
    minimumObjectCountMatch?: number;
    minimumStyleCoverage?: number;
  };
  fixtures: FidelityFixtureManifest[];
};

type LayoutComponentPayload = {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
    z: number;
  };
  props: {
    ddrArrangeOrder?: number;
    ddrSourceTop?: number;
    ddrSourceLeft?: number;
    ddrSourceBottom?: number;
    ddrSourceRight?: number;
    ddrStyleParsed?: boolean;
    ddrOriginalObjectType?: string;
    ddrFidelityWarnings?: string[];
    portalRowFields?: string[];
    portalColumnWidths?: number[];
    portalColumnHeaders?: string[];
    [key: string]: unknown;
  };
};

type LayoutPayload = {
  id: string;
  name: string;
  components: LayoutComponentPayload[];
};

type LayoutCatalogSummaryEntry = {
  name: string;
  id: string;
  objectCount: number;
  objectTypeCounts: Record<string, number>;
};

type DdrImporterModule = {
  readAsXml: (rawBuffer: Buffer) => string;
  inferDatabaseScope: (xml: string) => string;
  extractLayoutCatalogSummary: (xml: string) => LayoutCatalogSummaryEntry[];
  importDdrToWorkspace: (options: {
    cwd: string;
    ddrPath: string;
    workspaceId: string;
    summaryPath: string;
    solutionName: string;
    workspaceByDatabaseToken: Record<string, string>;
    hostHint: string;
  }) => Promise<{
    workspaceId: string;
    database: string;
    sourceFileName: string;
    importedLayoutNames: string[];
  }>;
};

type LayoutMetric = {
  layoutName: string;
  layoutId: string;
  ddrObjectCount: number;
  renderedObjectCount: number;
  objectCountMatch: number;
  boundsCoverage: number;
  styleCoverage: number;
  zOrderCoverage: number;
  objectTypeCoverage: number;
  portalFidelity: number;
  unknownObjects: number;
  warningCount: number;
  visual: {
    attempted: boolean;
    captured: boolean;
    baselineFound: boolean;
    changed: boolean;
    mismatchReason?: string;
  };
};

type FixtureResult = {
  id: string;
  label: string;
  path: string;
  workspaceId: string;
  database: string;
  layoutsRequested: string[];
  layoutsMeasured: LayoutMetric[];
  skippedLayouts: string[];
  warnings: string[];
};

const KNOWN_RENDERABLE_DDR_TYPES = new Set([
  "text",
  "field",
  "edit box",
  "drop down list",
  "drop down calendar",
  "pop up menu",
  "pop up list",
  "checkbox set",
  "radio button set",
  "container",
  "button",
  "group button",
  "popover button",
  "button bar",
  "portal",
  "web viewer",
  "line",
  "rectangle",
  "rounded rectangle",
  "round rectangle",
  "oval",
  "chart",
  "tab control",
  "slide control"
]);

function parseArgs(argv: string[]): { updateBaselines: boolean } {
  const tokens = [...argv];
  let updateBaselines = false;
  while (tokens.length > 0) {
    const token = String(tokens.shift() ?? "");
    if (!token) {
      continue;
    }
    if (token === "--update-baselines") {
      updateBaselines = true;
    }
  }
  return { updateBaselines };
}

function normalizeToken(value: string): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function slugify(value: string): string {
  return normalizeToken(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "layout";
}

function ratio(part: number, total: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) {
    return 1;
  }
  return Math.max(0, Math.min(1, part / total));
}

async function exists(absolutePath: string): Promise<boolean> {
  try {
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveFixturePath(candidates: string[]): Promise<string> {
  for (const candidate of candidates) {
    if (await exists(candidate)) {
      return candidate;
    }
  }
  return "";
}

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

function sha1(buffer: Buffer): string {
  return createHash("sha1").update(buffer).digest("hex");
}

async function tryLoadPlaywright() {
  try {
    const moduleRef = await import("playwright");
    return moduleRef;
  } catch {
    return null;
  }
}

async function captureLayoutScreenshot(options: {
  baseUrl: string;
  workspaceId: string;
  layoutId: string;
  targetPath: string;
  playwright: Awaited<ReturnType<typeof tryLoadPlaywright>>;
}): Promise<boolean> {
  if (!options.playwright) {
    return false;
  }
  const browser = await options.playwright.chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1680, height: 980 } });
    const url = `${options.baseUrl.replace(/\/+$/, "")}/layouts/${encodeURIComponent(
      options.layoutId
    )}/browse?workspace=${encodeURIComponent(options.workspaceId)}&view=form`;
    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 30_000
    });
    await page.waitForSelector(".runtime-canvas", { timeout: 30_000 });
    await fs.mkdir(path.dirname(options.targetPath), { recursive: true });
    await page.screenshot({ path: options.targetPath, fullPage: true });
    return true;
  } catch {
    return false;
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const cwd = process.cwd();
  const manifestPath = path.join(cwd, "docs", "layout-fidelity-fixtures.json");
  const reportRoot = path.join(cwd, "data", "layout-fidelity");
  const currentShotsRoot = path.join(reportRoot, "current");
  const baselineShotsRoot = path.join(reportRoot, "baselines");
  await fs.mkdir(reportRoot, { recursive: true });

  const manifest = await readJson<FidelityManifest>(manifestPath);
  const importer = (await import(path.join(cwd, "scripts", "import-ddr-layouts.mjs"))) as DdrImporterModule;
  const baseUrl = String(process.env.LAYOUT_FIDELITY_BASE_URL ?? "").trim();
  const visualEnabled = String(process.env.LAYOUT_FIDELITY_VISUAL ?? "").trim() === "1";
  const playwright = visualEnabled ? await tryLoadPlaywright() : null;

  const fixtureResults: FixtureResult[] = [];
  const warnings: string[] = [];

  for (const fixture of manifest.fixtures) {
    const fixturePath = await resolveFixturePath(fixture.paths);
    if (!fixturePath) {
      warnings.push(`Fixture ${fixture.id} not found. Checked: ${fixture.paths.join(", ")}`);
      continue;
    }

    const rawXml = await fs.readFile(fixturePath);
    const xml = importer.readAsXml(rawXml);
    const database = importer.inferDatabaseScope(xml);
    const workspaceId = `fidelity-${fixture.id}`;
    const layoutSummary = importer.extractLayoutCatalogSummary(xml);

    const importResult = await importer.importDdrToWorkspace({
      cwd,
      ddrPath: fixturePath,
      workspaceId,
      summaryPath: "",
      solutionName: "Phase 16 Layout Fidelity",
      workspaceByDatabaseToken: {},
      hostHint: ""
    });

    const layoutMapPath = path.join(cwd, "data", "workspaces", workspaceId, "layout-fm-map.json");
    const mapPayload = await readJson<{
      byFileMakerLayoutKey: Record<string, string>;
    }>(layoutMapPath);
    const normalizedMap = new Map<string, string>();
    for (const [key, value] of Object.entries(mapPayload.byFileMakerLayoutKey ?? {})) {
      normalizedMap.set(normalizeToken(key), value);
    }

    const fixtureResult: FixtureResult = {
      id: fixture.id,
      label: fixture.label,
      path: fixturePath,
      workspaceId,
      database,
      layoutsRequested: fixture.layouts,
      layoutsMeasured: [],
      skippedLayouts: [],
      warnings: []
    };

    for (const layoutName of fixture.layouts) {
      const key = `${importResult.database}::${layoutName}`;
      const layoutId =
        mapPayload.byFileMakerLayoutKey[key] ??
        normalizedMap.get(normalizeToken(key)) ??
        normalizedMap.get(normalizeToken(`${database}::${layoutName}`)) ??
        "";
      if (!layoutId) {
        fixtureResult.skippedLayouts.push(layoutName);
        continue;
      }

      const layoutFilePath = path.join(cwd, "data", "workspaces", workspaceId, "layouts", `${layoutId}.json`);
      if (!(await exists(layoutFilePath))) {
        fixtureResult.skippedLayouts.push(layoutName);
        continue;
      }
      const layoutPayload = await readJson<LayoutPayload>(layoutFilePath);
      const ddrLayoutSummary = layoutSummary.find(
        (entry) => normalizeToken(entry.name) === normalizeToken(layoutName)
      );
      const ddrObjectCount = Math.max(1, Number(ddrLayoutSummary?.objectCount ?? 0));
      const renderedObjectCount = layoutPayload.components.length;
      const objectCountMatch = ratio(Math.min(ddrObjectCount, renderedObjectCount), Math.max(ddrObjectCount, renderedObjectCount));
      const boundsCoverage = ratio(
        layoutPayload.components.filter(
          (component) =>
            Number.isFinite(component.props.ddrSourceTop) &&
            Number.isFinite(component.props.ddrSourceLeft) &&
            Number.isFinite(component.props.ddrSourceBottom) &&
            Number.isFinite(component.props.ddrSourceRight)
        ).length,
        renderedObjectCount || 1
      );
      const styleCoverage = ratio(
        layoutPayload.components.filter((component) => {
          if (component.props.ddrStyleParsed === true) {
            return true;
          }
          return [
            component.props.fillColor,
            component.props.fillGradientStartColor,
            component.props.fillGradientEndColor,
            component.props.lineColor,
            component.props.fontFamily,
            component.props.fontSize,
            component.props.textColor
          ].some((entry) => entry !== undefined && entry !== null && String(entry).trim().length > 0);
        }).length,
        renderedObjectCount || 1
      );
      const zOrderCoverage = ratio(
        layoutPayload.components.filter((component) => Number.isFinite(component.props.ddrArrangeOrder)).length,
        renderedObjectCount || 1
      );
      const ddrTypes = ddrLayoutSummary?.objectTypeCounts ?? {};
      const totalTypeInstances = Object.values(ddrTypes).reduce((sum, value) => sum + Number(value || 0), 0);
      const supportedTypeInstances = Object.entries(ddrTypes)
        .filter(([token]) => KNOWN_RENDERABLE_DDR_TYPES.has(normalizeToken(token)))
        .reduce((sum, [, count]) => sum + Number(count || 0), 0);
      const objectTypeCoverage = ratio(supportedTypeInstances, totalTypeInstances || 1);
      const portals = layoutPayload.components.filter((component) => component.type === "portal");
      const portalWithColumns = portals.filter(
        (component) =>
          Array.isArray(component.props.portalRowFields) &&
          component.props.portalRowFields.length > 0 &&
          Array.isArray(component.props.portalColumnWidths) &&
          component.props.portalColumnWidths.length > 0
      ).length;
      const portalFidelity = portals.length === 0 ? 1 : ratio(portalWithColumns, portals.length);
      const unknownObjects = layoutPayload.components.filter((component) => component.type === "unknown").length;
      const warningCount = layoutPayload.components.reduce(
        (sum, component) => sum + (component.props.ddrFidelityWarnings?.length ?? 0),
        0
      );

      const screenshotName = `${slugify(layoutPayload.name)}-${layoutId}.png`;
      const currentScreenshotPath = path.join(currentShotsRoot, fixture.id, screenshotName);
      const baselineScreenshotPath = path.join(baselineShotsRoot, fixture.id, screenshotName);
      const visual = {
        attempted: visualEnabled,
        captured: false,
        baselineFound: false,
        changed: false,
        mismatchReason: undefined as string | undefined
      };

      if (visualEnabled) {
        const captured = await captureLayoutScreenshot({
          baseUrl,
          workspaceId,
          layoutId,
          targetPath: currentScreenshotPath,
          playwright
        });
        visual.captured = captured;
        if (!captured) {
          visual.mismatchReason = playwright
            ? "Screenshot capture failed (check server/base URL/layout route)."
            : "Playwright not installed. Skipped screenshot capture.";
        } else {
          visual.baselineFound = await exists(baselineScreenshotPath);
          if (args.updateBaselines) {
            await fs.mkdir(path.dirname(baselineScreenshotPath), { recursive: true });
            await fs.copyFile(currentScreenshotPath, baselineScreenshotPath);
            visual.changed = false;
          } else if (visual.baselineFound) {
            const [currentBytes, baselineBytes] = await Promise.all([
              fs.readFile(currentScreenshotPath),
              fs.readFile(baselineScreenshotPath)
            ]);
            visual.changed = sha1(currentBytes) !== sha1(baselineBytes);
            if (visual.changed) {
              visual.mismatchReason = "Binary screenshot mismatch. Review current vs baseline images.";
            }
          } else {
            visual.mismatchReason = "Baseline screenshot missing. Run test:layout-fidelity:update-baselines.";
          }
        }
      }

      fixtureResult.layoutsMeasured.push({
        layoutName,
        layoutId,
        ddrObjectCount,
        renderedObjectCount,
        objectCountMatch,
        boundsCoverage,
        styleCoverage,
        zOrderCoverage,
        objectTypeCoverage,
        portalFidelity,
        unknownObjects,
        warningCount,
        visual
      });
    }

    fixtureResults.push(fixtureResult);
  }

  const objectCountThreshold = manifest.tolerance?.minimumObjectCountMatch ?? 0.55;
  const styleCoverageThreshold = manifest.tolerance?.minimumStyleCoverage ?? 0.45;

  let measuredLayouts = 0;
  let failedLayouts = 0;
  for (const fixture of fixtureResults) {
    measuredLayouts += fixture.layoutsMeasured.length;
    for (const metric of fixture.layoutsMeasured) {
      if (metric.objectCountMatch < objectCountThreshold || metric.styleCoverage < styleCoverageThreshold) {
        failedLayouts += 1;
      }
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    updateBaselines: args.updateBaselines,
    visualEnabled,
    baseUrl: baseUrl || null,
    tolerance: {
      objectCountMatch: objectCountThreshold,
      styleCoverage: styleCoverageThreshold,
      boundsPx: manifest.tolerance?.boundsPx ?? 1
    },
    fixtureCount: fixtureResults.length,
    measuredLayoutCount: measuredLayouts,
    failedLayoutCount: failedLayouts,
    warnings,
    fixtures: fixtureResults
  };

  const reportPath = path.join(reportRoot, "report-latest.json");
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  const lines: string[] = [
    "Phase 16 Layout Fidelity Harness",
    "-------------------------------",
    `Fixtures processed: ${fixtureResults.length}`,
    `Layouts measured: ${measuredLayouts}`,
    `Thresholds: objectCount>=${objectCountThreshold.toFixed(2)}, styleCoverage>=${styleCoverageThreshold.toFixed(2)}`
  ];

  for (const fixture of fixtureResults) {
    lines.push(`- ${fixture.label} (${fixture.id}) -> ${fixture.layoutsMeasured.length} layout(s), skipped ${fixture.skippedLayouts.length}`);
    for (const metric of fixture.layoutsMeasured.slice(0, 6)) {
      lines.push(
        `  • ${metric.layoutName}: object=${metric.objectCountMatch.toFixed(2)} style=${metric.styleCoverage.toFixed(
          2
        )} type=${metric.objectTypeCoverage.toFixed(2)} portal=${metric.portalFidelity.toFixed(2)} unknown=${metric.unknownObjects}`
      );
    }
    if (fixture.layoutsMeasured.length > 6) {
      lines.push(`  • ... ${fixture.layoutsMeasured.length - 6} additional layout(s)`);
    }
  }

  if (warnings.length > 0) {
    lines.push("Warnings:");
    for (const warning of warnings) {
      lines.push(`  - ${warning}`);
    }
  }

  lines.push(`Report: ${reportPath}`);
  // eslint-disable-next-line no-console
  console.log(lines.join("\n"));

  if (failedLayouts > 0) {
    process.exitCode = 1;
  }
}

void main();

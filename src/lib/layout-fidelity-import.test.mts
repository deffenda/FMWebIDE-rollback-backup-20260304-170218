import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

type FixtureManifest = {
  fixtures: Array<{
    id: string;
    paths: string[];
  }>;
};

type LayoutCatalogSummaryEntry = {
  name: string;
  objectCount: number;
  objectTypeCounts: Record<string, number>;
};

type DdrImporterModule = {
  readAsXml: (rawBuffer: Buffer) => string;
  extractLayoutCatalogSummary: (xml: string) => LayoutCatalogSummaryEntry[];
};

async function loadJson<T>(absolutePath: string): Promise<T> {
  const raw = await readFile(absolutePath, "utf8");
  return JSON.parse(raw) as T;
}

async function resolveExistingPath(candidates: string[]): Promise<string> {
  for (const candidate of candidates) {
    try {
      await readFile(candidate);
      return candidate;
    } catch {
      // continue
    }
  }
  return "";
}

function normalizeType(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

test("Phase 16 DDR fixture parser can extract layout/object summaries", async (t) => {
  const cwd = process.cwd();
  const manifestPath = path.join(cwd, "docs", "layout-fidelity-fixtures.json");
  const manifest = await loadJson<FixtureManifest>(manifestPath);
  const importer = (await import(path.join(cwd, "scripts", "import-ddr-layouts.mjs"))) as DdrImporterModule;

  const availableFixtures: Array<{ id: string; path: string }> = [];
  for (const fixture of manifest.fixtures) {
    const resolved = await resolveExistingPath(fixture.paths);
    if (resolved) {
      availableFixtures.push({ id: fixture.id, path: resolved });
    }
  }

  if (availableFixtures.length === 0) {
    t.skip("No Phase 16 fixture files are available in this environment");
    return;
  }

  const requiredTypes = new Set(["button bar", "popover button", "portal", "text", "field"]);
  const discoveredTypes = new Set<string>();

  for (const fixture of availableFixtures) {
    const startedAt = Date.now();
    const xml = importer.readAsXml(await readFile(fixture.path));
    const summary = importer.extractLayoutCatalogSummary(xml);
    const elapsedMs = Date.now() - startedAt;

    assert.ok(summary.length > 0, `Expected layouts to be extracted for fixture ${fixture.id}`);
    const totalObjects = summary.reduce((sum, entry) => sum + Math.max(0, Number(entry.objectCount || 0)), 0);
    assert.ok(totalObjects > 0, `Expected object counts for fixture ${fixture.id}`);

    for (const entry of summary) {
      for (const typeName of Object.keys(entry.objectTypeCounts ?? {})) {
        discoveredTypes.add(normalizeType(typeName));
      }
    }

    assert.ok(
      elapsedMs < 45_000,
      `Expected fixture ${fixture.id} parse to remain under 45s; actual ${elapsedMs}ms`
    );
  }

  for (const typeName of requiredTypes) {
    assert.ok(discoveredTypes.has(typeName), `Expected to discover DDR object type \"${typeName}\" across fixtures`);
  }
});

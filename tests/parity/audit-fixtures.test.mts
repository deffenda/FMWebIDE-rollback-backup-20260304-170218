import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const fixtureDir = path.join(process.cwd(), "tests", "fixtures", "ddr");

function listXmlFixtures(): string[] {
  if (!existsSync(fixtureDir)) {
    return [];
  }
  return readdirSync(fixtureDir)
    .filter((entry) => entry.toLowerCase().endsWith(".xml"))
    .sort((a, b) => a.localeCompare(b));
}

test("parity fixture directory exists", () => {
  assert.equal(existsSync(fixtureDir), true, "Expected tests/fixtures/ddr to exist");
});

test("at least one DDR fixture exists (synthetic fallback allowed)", () => {
  const fixtures = listXmlFixtures();
  assert.ok(fixtures.length >= 1, "Expected at least one DDR XML fixture");
});

test("synthetic fixture is clearly labeled synthetic", () => {
  const syntheticPath = path.join(fixtureDir, "synthetic-minimal-ddr.xml");
  if (!existsSync(syntheticPath)) {
    test.skip("Synthetic fixture not present");
    return;
  }
  const xml = readFileSync(syntheticPath, "utf8");
  assert.ok(xml.includes("Synthetic"), "Synthetic fixture should include explicit synthetic marker text");
});

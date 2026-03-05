import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

test("synthetic DDR fixture has minimal layout object structure", () => {
  const fixture = path.join(process.cwd(), "tests", "fixtures", "ddr", "synthetic-minimal-ddr.xml");
  if (!existsSync(fixture)) {
    test.skip("No synthetic fixture present");
    return;
  }

  const xml = readFileSync(fixture, "utf8");
  assert.match(xml, /<FMPReport>/, "Fixture should include FMPReport root");
  assert.match(xml, /<Layout\b/i, "Fixture should include at least one Layout tag");
  assert.match(xml, /<Bounds\b/i, "Fixture should include at least one Bounds node");
});

import assert from "node:assert/strict";
import test from "node:test";
import type { LayoutDefinition } from "../../../../lib/layout-model.ts";
import { computePartMetrics } from "../computePartMetrics.ts";

const layoutFixture: LayoutDefinition = {
  id: "layout-parts",
  name: "Parts Layout",
  defaultTableOccurrence: "Assets",
  canvas: {
    width: 1000,
    height: 800,
    gridSize: 8
  },
  parts: [
    { id: "titleHeader", type: "titleHeader", label: "Title Header", height: 40 },
    { id: "header", type: "header", label: "Header", height: 60 },
    { id: "body", type: "body", label: "Body", height: 500 },
    { id: "footer", type: "footer", label: "Footer", height: 40 }
  ],
  components: [],
  actions: []
};

test("computePartMetrics keeps ordered top offsets from previous heights", () => {
  const result = computePartMetrics(layoutFixture, {
    widthPx: 1000,
    heightPx: 800,
    zoom: 1
  });

  assert.equal(result.parts.length, 4);
  assert.equal(result.parts[0].topPx, 0);
  assert.equal(result.parts[1].topPx, 40);
  assert.equal(result.parts[2].topPx, 100);
  assert.equal(result.parts[3].topPx, 760);
});

test("body part expands when viewport is taller than base canvas", () => {
  const result = computePartMetrics(layoutFixture, {
    widthPx: 1000,
    heightPx: 1000,
    zoom: 1
  });
  const body = result.parts.find((entry) => entry.partId === "body");
  assert.ok(body);
  assert.equal(body!.heightPx, 860);
});

test("zoom scales part metrics consistently", () => {
  const zoomed = computePartMetrics(layoutFixture, {
    widthPx: 1000,
    heightPx: 800,
    zoom: 1.5
  });
  assert.equal(zoomed.parts[0].heightPx, 60);
  assert.equal(zoomed.parts[1].topPx, 60);
  assert.equal(zoomed.runtimeWidthPx, 1500);
});

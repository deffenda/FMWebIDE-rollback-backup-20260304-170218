import assert from "node:assert/strict";
import test from "node:test";
import { computeVirtualWindow } from "./virtual-window.ts";

test("computeVirtualWindow returns empty window for empty dataset", () => {
  const window = computeVirtualWindow({
    totalCount: 0,
    scrollTop: 0,
    viewportHeight: 480,
    rowHeight: 32
  });
  assert.deepEqual(window, {
    startIndex: 0,
    endIndexExclusive: 0,
    topSpacerPx: 0,
    bottomSpacerPx: 0,
    visibleCount: 0
  });
});

test("computeVirtualWindow renders full range when total is below threshold", () => {
  const window = computeVirtualWindow({
    totalCount: 120,
    scrollTop: 400,
    viewportHeight: 240,
    rowHeight: 24,
    fullRenderThreshold: 200
  });
  assert.equal(window.startIndex, 0);
  assert.equal(window.endIndexExclusive, 120);
  assert.equal(window.topSpacerPx, 0);
  assert.equal(window.bottomSpacerPx, 0);
  assert.equal(window.visibleCount, 120);
});

test("computeVirtualWindow clamps start/end at list boundaries", () => {
  const window = computeVirtualWindow({
    totalCount: 100_000,
    scrollTop: 100_000_000,
    viewportHeight: 640,
    rowHeight: 32,
    overscan: 12
  });
  assert.equal(window.endIndexExclusive, 100_000);
  assert.ok(window.startIndex >= 0);
  assert.ok(window.startIndex < 100_000);
  assert.ok(window.visibleCount > 0);
  assert.ok(window.bottomSpacerPx >= 0);
});

test("computeVirtualWindow maintains fixed-height accounting", () => {
  const totalCount = 50_000;
  const rowHeight = 36;
  const window = computeVirtualWindow({
    totalCount,
    scrollTop: 4_500,
    viewportHeight: 720,
    rowHeight,
    overscan: 6
  });
  const renderedHeight = window.visibleCount * rowHeight;
  const totalHeight = window.topSpacerPx + renderedHeight + window.bottomSpacerPx;
  assert.equal(totalHeight, totalCount * rowHeight);
});


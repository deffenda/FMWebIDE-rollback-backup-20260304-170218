import test from "node:test";
import assert from "node:assert/strict";

import {
  DDR_OBJECT_FLAG_ANCHOR_BOTTOM,
  DDR_OBJECT_FLAG_ANCHOR_RIGHT,
  DDR_OBJECT_FLAG_DONT_ANCHOR_LEFT,
  DDR_OBJECT_FLAG_DONT_ANCHOR_TOP,
  computeAnchoredRect,
  computeRuntimeComponentFrames,
  decodeAnchorsFromDdrObjectFlags,
  parseDdrObjectFlagBits,
  resolveComponentAnchors
} from "./anchor-engine.ts";
import type { LayoutComponent } from "../layout-model.ts";

function sampleComponent(overrides: Partial<LayoutComponent> = {}): LayoutComponent {
  return {
    id: "c1",
    type: "field",
    position: {
      x: 100,
      y: 80,
      width: 200,
      height: 40,
      z: 1
    },
    props: {},
    ...overrides
  };
}

test("parseDdrObjectFlagBits parses signed and unsigned numbers", () => {
  assert.equal(parseDdrObjectFlagBits("1073741824"), 1073741824);
  assert.equal(parseDdrObjectFlagBits("-1073741824"), 3221225472);
  assert.equal(parseDdrObjectFlagBits(""), null);
  assert.equal(parseDdrObjectFlagBits("abc"), null);
});

test("decodeAnchorsFromDdrObjectFlags applies expected bit semantics", () => {
  const leftTopDefaults = decodeAnchorsFromDdrObjectFlags(0);
  assert.deepEqual(leftTopDefaults, {
    left: true,
    top: true,
    right: false,
    bottom: false
  });

  const rightBottom = decodeAnchorsFromDdrObjectFlags(DDR_OBJECT_FLAG_ANCHOR_RIGHT | DDR_OBJECT_FLAG_ANCHOR_BOTTOM);
  assert.equal(rightBottom.left, true);
  assert.equal(rightBottom.top, true);
  assert.equal(rightBottom.right, true);
  assert.equal(rightBottom.bottom, true);

  const dontLeftDontTop = decodeAnchorsFromDdrObjectFlags(
    DDR_OBJECT_FLAG_DONT_ANCHOR_LEFT | DDR_OBJECT_FLAG_DONT_ANCHOR_TOP
  );
  assert.equal(dontLeftDontTop.left, false);
  assert.equal(dontLeftDontTop.top, false);
});

test("resolveComponentAnchors prefers explicit autosize flags over DDR flag decode", () => {
  const component = sampleComponent({
    props: {
      ddrObjectFlags: DDR_OBJECT_FLAG_DONT_ANCHOR_LEFT | DDR_OBJECT_FLAG_ANCHOR_RIGHT,
      autosizeLeft: true
    }
  });
  const anchors = resolveComponentAnchors(component);
  assert.equal(anchors.left, true);
  assert.equal(anchors.right, true);
});

test("computeAnchoredRect keeps position for default top-left anchors", () => {
  const rect = computeAnchoredRect({
    baseRect: { x: 10, y: 12, width: 80, height: 30 },
    baseContainer: { x: 0, y: 0, width: 400, height: 300 },
    runtimeContainer: { x: 0, y: 0, width: 600, height: 500 },
    anchors: { left: true, top: true, right: false, bottom: false }
  });
  assert.deepEqual(rect, { x: 10, y: 12, width: 80, height: 30 });
});

test("computeAnchoredRect stretches width when left+right anchored", () => {
  const rect = computeAnchoredRect({
    baseRect: { x: 20, y: 10, width: 100, height: 20 },
    baseContainer: { x: 0, y: 0, width: 500, height: 400 },
    runtimeContainer: { x: 0, y: 0, width: 700, height: 400 },
    anchors: { left: true, top: true, right: true, bottom: false }
  });
  assert.deepEqual(rect, { x: 20, y: 10, width: 300, height: 20 });
});

test("computeAnchoredRect pins to right when only right anchored horizontally", () => {
  const rect = computeAnchoredRect({
    baseRect: { x: 40, y: 10, width: 120, height: 20 },
    baseContainer: { x: 0, y: 0, width: 500, height: 200 },
    runtimeContainer: { x: 0, y: 0, width: 620, height: 200 },
    anchors: { left: false, top: true, right: true, bottom: false }
  });
  assert.deepEqual(rect, { x: 160, y: 10, width: 120, height: 20 });
});

test("computeAnchoredRect centers when neither horizontal anchor is set", () => {
  const rect = computeAnchoredRect({
    baseRect: { x: 40, y: 10, width: 120, height: 20 },
    baseContainer: { x: 0, y: 0, width: 500, height: 200 },
    runtimeContainer: { x: 0, y: 0, width: 620, height: 200 },
    anchors: { left: false, top: true, right: false, bottom: false }
  });
  assert.deepEqual(rect, { x: 100, y: 10, width: 120, height: 20 });
});

test("computeAnchoredRect stretches height when top+bottom anchored", () => {
  const rect = computeAnchoredRect({
    baseRect: { x: 20, y: 15, width: 120, height: 60 },
    baseContainer: { x: 0, y: 0, width: 500, height: 300 },
    runtimeContainer: { x: 0, y: 0, width: 500, height: 420 },
    anchors: { left: true, top: true, right: false, bottom: true }
  });
  assert.deepEqual(rect, { x: 20, y: 15, width: 120, height: 180 });
});

test("computeAnchoredRect pins to bottom when only bottom anchored vertically", () => {
  const rect = computeAnchoredRect({
    baseRect: { x: 20, y: 25, width: 120, height: 60 },
    baseContainer: { x: 0, y: 0, width: 500, height: 300 },
    runtimeContainer: { x: 0, y: 0, width: 500, height: 420 },
    anchors: { left: true, top: false, right: false, bottom: true }
  });
  assert.deepEqual(rect, { x: 20, y: 145, width: 120, height: 60 });
});

test("computeAnchoredRect centers when neither vertical anchor is set", () => {
  const rect = computeAnchoredRect({
    baseRect: { x: 20, y: 25, width: 120, height: 60 },
    baseContainer: { x: 0, y: 0, width: 500, height: 300 },
    runtimeContainer: { x: 0, y: 0, width: 500, height: 420 },
    anchors: { left: true, top: false, right: false, bottom: false }
  });
  assert.deepEqual(rect, { x: 20, y: 85, width: 120, height: 60 });
});

test("computeAnchoredRect respects minimum dimensions while shrinking", () => {
  const rect = computeAnchoredRect({
    baseRect: { x: 0, y: 0, width: 18, height: 20 },
    baseContainer: { x: 0, y: 0, width: 800, height: 600 },
    runtimeContainer: { x: 0, y: 0, width: 760, height: 560 },
    anchors: { left: true, top: true, right: true, bottom: true },
    minimumWidth: 8,
    minimumHeight: 8
  });
  assert.equal(rect.width, 8);
  assert.equal(rect.height, 8);
});

test("computeRuntimeComponentFrames computes layout container frames", () => {
  const components = [
    sampleComponent({
      id: "a",
      props: { autosizeLeft: true, autosizeTop: true, autosizeRight: true, autosizeBottom: false }
    })
  ];
  const frames = computeRuntimeComponentFrames({
    components,
    baseCanvas: { width: 1000, height: 700 },
    runtimeCanvas: { width: 1200, height: 700 }
  });
  assert.deepEqual(frames.a, {
    x: 100,
    y: 80,
    width: 400,
    height: 40,
    containerKind: "layout",
    containerId: undefined,
    anchors: { left: true, top: true, right: true, bottom: false }
  });
});

test("computeRuntimeComponentFrames derives anchors from DDR object flags", () => {
  const components = [
    sampleComponent({
      id: "b",
      props: {
        ddrObjectFlags: DDR_OBJECT_FLAG_DONT_ANCHOR_LEFT | DDR_OBJECT_FLAG_ANCHOR_RIGHT
      }
    })
  ];
  const frames = computeRuntimeComponentFrames({
    components,
    baseCanvas: { width: 1000, height: 700 },
    runtimeCanvas: { width: 1100, height: 700 }
  });
  assert.equal(frames.b.x, 200);
  assert.deepEqual(frames.b.anchors, {
    left: false,
    top: true,
    right: true,
    bottom: false
  });
});

test("computeRuntimeComponentFrames supports portal child container anchoring", () => {
  const portal = sampleComponent({
    id: "portal-1",
    type: "portal",
    position: { x: 300, y: 200, width: 220, height: 160, z: 1 },
    props: {
      autosizeLeft: true,
      autosizeTop: true,
      autosizeRight: true,
      autosizeBottom: true
    }
  });
  const child = sampleComponent({
    id: "portal-child",
    position: { x: 320, y: 220, width: 120, height: 30, z: 2 },
    props: {
      portalParentComponentId: "portal-1",
      autosizeLeft: true,
      autosizeTop: true,
      autosizeRight: true,
      autosizeBottom: false
    }
  });
  const frames = computeRuntimeComponentFrames({
    components: [portal, child],
    baseCanvas: { width: 1000, height: 700 },
    runtimeCanvas: { width: 1200, height: 840 }
  });
  assert.equal(frames["portal-child"].containerKind, "portalRow");
  assert.equal(frames["portal-child"].x, 320);
  assert.equal(frames["portal-child"].y, 220);
  assert.equal(frames["portal-child"].width, 320);
});

test("computeRuntimeComponentFrames resolves parent by DDR path token", () => {
  const parent = sampleComponent({
    id: "panel-1",
    type: "panel",
    position: { x: 200, y: 150, width: 400, height: 260, z: 1 },
    props: {
      panelType: "tab",
      ddrObjectPath: "138",
      autosizeLeft: true,
      autosizeTop: true,
      autosizeRight: true,
      autosizeBottom: true
    }
  });
  const child = sampleComponent({
    id: "inside-panel",
    position: { x: 240, y: 190, width: 120, height: 30, z: 2 },
    props: {
      ddrObjectPath: "138.140.7",
      autosizeLeft: false,
      autosizeTop: true,
      autosizeRight: false,
      autosizeBottom: false
    }
  });
  const frames = computeRuntimeComponentFrames({
    components: [parent, child],
    baseCanvas: { width: 1000, height: 700 },
    runtimeCanvas: { width: 1200, height: 700 }
  });
  assert.equal(frames["inside-panel"].containerKind, "tab");
  assert.equal(frames["inside-panel"].x, 340);
});

test("computeRuntimeComponentFrames detects popover parent container kind", () => {
  const popover = sampleComponent({
    id: "popover-shell",
    type: "unknown",
    position: { x: 100, y: 100, width: 300, height: 220, z: 1 },
    props: {
      ddrObjectPath: "5",
      ddrOriginalObjectType: "Popover",
      autosizeLeft: true,
      autosizeTop: true,
      autosizeRight: true,
      autosizeBottom: true
    }
  });
  const child = sampleComponent({
    id: "popover-child",
    type: "button",
    position: { x: 120, y: 120, width: 100, height: 24, z: 2 },
    props: {
      ddrObjectPath: "5.20"
    }
  });
  const frames = computeRuntimeComponentFrames({
    components: [popover, child],
    baseCanvas: { width: 1000, height: 700 },
    runtimeCanvas: { width: 1200, height: 700 }
  });
  assert.equal(frames["popover-child"].containerKind, "popover");
});

test("computeRuntimeComponentFrames keeps deterministic order for siblings", () => {
  const components = [
    sampleComponent({ id: "left", position: { x: 30, y: 30, width: 80, height: 20, z: 1 }, props: {} }),
    sampleComponent({ id: "right", position: { x: 500, y: 30, width: 80, height: 20, z: 2 }, props: { autosizeRight: true } })
  ];
  const frames = computeRuntimeComponentFrames({
    components,
    baseCanvas: { width: 800, height: 600 },
    runtimeCanvas: { width: 900, height: 600 }
  });
  assert.equal(frames.left.x, 30);
  assert.equal(frames.right.x, 500);
  assert.equal(frames.right.width > 80, true);
});

test("decodeAnchorsFromDdrObjectFlags supports null fallback behavior", () => {
  const anchors = decodeAnchorsFromDdrObjectFlags(null, {
    left: false,
    top: true,
    right: true,
    bottom: false
  });
  assert.deepEqual(anchors, {
    left: false,
    top: true,
    right: true,
    bottom: false
  });
});

test("decodeAnchorsFromDdrObjectFlags decodes each bit independently", () => {
  const rightOnly = decodeAnchorsFromDdrObjectFlags(DDR_OBJECT_FLAG_ANCHOR_RIGHT);
  assert.deepEqual(rightOnly, {
    left: true,
    top: true,
    right: true,
    bottom: false
  });
  const bottomOnly = decodeAnchorsFromDdrObjectFlags(DDR_OBJECT_FLAG_ANCHOR_BOTTOM);
  assert.deepEqual(bottomOnly, {
    left: true,
    top: true,
    right: false,
    bottom: true
  });
  const noLeft = decodeAnchorsFromDdrObjectFlags(DDR_OBJECT_FLAG_DONT_ANCHOR_LEFT);
  assert.equal(noLeft.left, false);
  const noTop = decodeAnchorsFromDdrObjectFlags(DDR_OBJECT_FLAG_DONT_ANCHOR_TOP);
  assert.equal(noTop.top, false);
});

test("computeAnchoredRect rounds coordinates to stable integers", () => {
  const rect = computeAnchoredRect({
    baseRect: { x: 10.2, y: 11.6, width: 100.4, height: 20.4 },
    baseContainer: { x: 0, y: 0, width: 401.3, height: 300.1 },
    runtimeContainer: { x: 0, y: 0, width: 501.8, height: 300.1 },
    anchors: { left: false, top: true, right: false, bottom: false }
  });
  assert.deepEqual(rect, { x: 60, y: 12, width: 100, height: 20 });
});

test("computeAnchoredRect handles zero-sized container deltas safely", () => {
  const rect = computeAnchoredRect({
    baseRect: { x: 10, y: 10, width: 20, height: 20 },
    baseContainer: { x: 0, y: 0, width: 0, height: 0 },
    runtimeContainer: { x: 0, y: 0, width: 0, height: 0 },
    anchors: { left: true, top: true, right: true, bottom: true }
  });
  assert.equal(rect.width, 20);
  assert.equal(rect.height, 20);
});

test("computeRuntimeComponentFrames anchors portal itself to layout and children to portal", () => {
  const portal = sampleComponent({
    id: "portal",
    type: "portal",
    position: { x: 60, y: 80, width: 240, height: 220, z: 1 },
    props: { autosizeRight: true, autosizeBottom: true }
  });
  const childA = sampleComponent({
    id: "portal-a",
    position: { x: 80, y: 100, width: 100, height: 24, z: 2 },
    props: { portalParentComponentId: "portal", autosizeRight: true }
  });
  const childB = sampleComponent({
    id: "portal-b",
    position: { x: 80, y: 140, width: 100, height: 24, z: 3 },
    props: { portalParentComponentId: "portal", autosizeBottom: true }
  });
  const frames = computeRuntimeComponentFrames({
    components: [portal, childA, childB],
    baseCanvas: { width: 600, height: 400 },
    runtimeCanvas: { width: 800, height: 520 }
  });
  assert.equal(frames.portal.containerKind, "layout");
  assert.equal(frames["portal-a"].containerKind, "portalRow");
  assert.equal(frames["portal-b"].containerKind, "portalRow");
  assert.ok(frames["portal-a"].width > childA.position.width);
  assert.ok(frames["portal-b"].y >= childB.position.y);
});

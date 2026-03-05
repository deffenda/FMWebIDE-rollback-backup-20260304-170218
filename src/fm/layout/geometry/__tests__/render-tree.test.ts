import assert from "node:assert/strict";
import test from "node:test";
import type { LayoutDefinition } from "../../../../lib/layout-model.ts";
import { buildLayoutRenderTree } from "../buildRenderTree.ts";
import { createGeometryBaselineCache } from "../computeObjectGeometry.ts";

const layoutFixture: LayoutDefinition = {
  id: "layout-tree",
  name: "Tree Layout",
  defaultTableOccurrence: "Assets",
  canvas: {
    width: 1000,
    height: 700,
    gridSize: 8
  },
  parts: [
    { id: "header", type: "header", label: "Header", height: 80 },
    { id: "body", type: "body", label: "Body", height: 620 }
  ],
  components: [
    {
      id: "obj-z-20",
      type: "shape",
      position: { x: 20, y: 20, width: 100, height: 40, z: 20 },
      binding: {},
      props: {}
    },
    {
      id: "obj-z-5",
      type: "field",
      position: { x: 24, y: 120, width: 280, height: 36, z: 5 },
      binding: { field: "Name", tableOccurrence: "Assets" },
      props: {}
    },
    {
      id: "obj-z-10",
      type: "button",
      position: { x: 40, y: 180, width: 120, height: 30, z: 10 },
      binding: {},
      props: { label: "Go" }
    }
  ],
  actions: []
};

test("buildLayoutRenderTree creates deterministic part/object node ordering", () => {
  const tree = buildLayoutRenderTree({
    layout: layoutFixture,
    viewport: {
      widthPx: 1000,
      heightPx: 700,
      zoom: 1
    }
  });

  assert.equal(tree.kind, "layout");
  assert.equal(tree.children.length, 2);
  assert.equal(tree.children[0].id, "header");
  assert.equal(tree.children[1].id, "body");

  const headerChildren = tree.children[0].children ?? [];
  const bodyChildren = tree.children[1].children ?? [];
  assert.equal(headerChildren.length, 1);
  assert.equal(headerChildren[0].id, "obj-z-20");
  assert.equal(bodyChildren.length, 2);
  assert.deepEqual(
    bodyChildren.map((entry) => entry.id),
    ["obj-z-5", "obj-z-10"]
  );
});

test("buildLayoutRenderTree applies zIndex and object bounds from geometry engine", () => {
  const tree = buildLayoutRenderTree({
    layout: layoutFixture,
    viewport: {
      widthPx: 1200,
      heightPx: 800,
      zoom: 1
    }
  });

  const bodyNode = tree.children.find((entry) => entry.id === "body");
  assert.ok(bodyNode);
  const object = (bodyNode!.children ?? []).find((entry) => entry.id === "obj-z-5");
  assert.ok(object);
  assert.equal(object!.zIndex, 5);
  assert.ok(object!.rectPx.x >= 24);
  assert.ok(object!.rectPx.y >= 80);
});

test("buildLayoutRenderTree infers left+right anchors for wide objects when DDR metadata is missing", () => {
  const wideLayout: LayoutDefinition = {
    ...layoutFixture,
    id: "layout-wide-anchors",
    components: [
      {
        id: "wide-body-object",
        type: "shape",
        position: { x: 0, y: 120, width: 900, height: 40, z: 1 },
        binding: {},
        props: {}
      }
    ]
  };

  const baselineCache = createGeometryBaselineCache();
  const baseline = buildLayoutRenderTree({
    layout: wideLayout,
    viewport: {
      widthPx: 1000,
      heightPx: 700,
      zoom: 1
    },
    baselineCache
  });
  const expanded = buildLayoutRenderTree({
    layout: wideLayout,
    viewport: {
      widthPx: 1400,
      heightPx: 700,
      zoom: 1
    },
    baselineCache
  });

  const baselineObject = baseline.children
    .flatMap((entry) => entry.children ?? [])
    .find((entry) => entry.id === "wide-body-object");
  const expandedObject = expanded.children
    .flatMap((entry) => entry.children ?? [])
    .find((entry) => entry.id === "wide-body-object");

  assert.ok(baselineObject);
  assert.ok(expandedObject);
  assert.ok(expandedObject!.rectPx.w > baselineObject!.rectPx.w);
});

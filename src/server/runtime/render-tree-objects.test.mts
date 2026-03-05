import assert from "node:assert/strict";
import test from "node:test";

import type { LayoutDefinition } from "../../lib/layout-model.ts";
import { createGeometryBaselineCache } from "../../fm/layout/geometry/index.ts";
import { buildDeterministicObjectMap } from "./object-ids.ts";
import { buildRenderTree } from "./render-tree.ts";
import type { RuntimeSession } from "./types.ts";

function layoutFixture(): LayoutDefinition {
  return {
    id: "layout-object-types",
    name: "Object Types",
    defaultTableOccurrence: "Assets",
    canvas: {
      width: 1000,
      height: 700,
      gridSize: 10
    },
    components: [
      {
        id: "field-number",
        type: "field",
        position: { x: 20, y: 20, width: 200, height: 30, z: 1 },
        binding: { field: "Amount", tableOccurrence: "Assets" },
        props: { dataFormat: "number" }
      },
      {
        id: "field-date",
        type: "field",
        position: { x: 20, y: 60, width: 200, height: 30, z: 2 },
        binding: { field: "PurchaseDate", tableOccurrence: "Assets" },
        props: { controlType: "date" }
      },
      {
        id: "field-notes",
        type: "field",
        position: { x: 20, y: 100, width: 280, height: 60, z: 3 },
        binding: { field: "Notes", tableOccurrence: "Assets" },
        props: { editShowVerticalScrollbar: true }
      },
      {
        id: "field-container",
        type: "field",
        position: { x: 340, y: 20, width: 200, height: 120, z: 4 },
        binding: { field: "Photo", tableOccurrence: "Assets" },
        props: { containerFormat: "cropToFit" }
      },
      {
        id: "label-title",
        type: "label",
        position: { x: 20, y: 180, width: 200, height: 24, z: 5 },
        binding: {},
        props: { label: "Asset Details" }
      },
      {
        id: "shape-box",
        type: "shape",
        position: { x: 20, y: 220, width: 120, height: 40, z: 6 },
        binding: {},
        props: {}
      },
      {
        id: "image-logo",
        type: "image",
        position: { x: 160, y: 220, width: 120, height: 40, z: 7 },
        binding: {},
        props: { fillImageUrl: "https://example.com/logo.png" }
      }
    ],
    actions: []
  };
}

function createSession(layout: LayoutDefinition): RuntimeSession {
  const objectMap = buildDeterministicObjectMap(layout);
  return {
    token: "test-session",
    workspaceId: "default",
    mode: "browse",
    layout,
    objectMap,
    objectBindings: new Map(),
    tabOrderObjectIds: [],
    records: [
      {
        recordId: "1",
        modId: "1",
        Amount: 123.45,
        PurchaseDate: "2026-03-01",
        Notes: "Multiline notes",
        Photo: "https://example.com/photo.jpg"
      }
    ],
    currentRecordIndex: 0,
    focusedObjectId: null,
    recordDirty: false,
    fieldBuffer: new Map(),
    lastClientSeq: 0,
    lastServerSeq: 0,
    createdAt: Date.now(),
    lastAccessedAt: Date.now(),
    patches: [],
    portalOffsets: new Map(),
    viewport: {
      widthPx: 1000,
      heightPx: 700,
      zoom: 1
    },
    geometryBaselineCache: createGeometryBaselineCache()
  };
}

test("buildRenderTree classifies core object types for phase 4", () => {
  const layout = layoutFixture();
  const session = createSession(layout);
  const tree = buildRenderTree(session);
  const nodes = (tree.children ?? []).flatMap((part) => part.children ?? []);
  const byObjectId = new Map(nodes.map((node) => [node.objectId, node]));

  const numberFieldNode = [...byObjectId.values()].find((node) => node.type === "field-number");
  const dateFieldNode = [...byObjectId.values()].find((node) => node.type === "field-date");
  const multilineNode = [...byObjectId.values()].find((node) => node.type === "field-multiline");
  const containerNode = [...byObjectId.values()].find((node) => node.type === "field-container");
  const textNode = [...byObjectId.values()].find((node) => node.type === "text");
  const rectangleNode = [...byObjectId.values()].find((node) => node.type === "rectangle");
  const imageNode = [...byObjectId.values()].find((node) => node.type === "image");

  assert.ok(numberFieldNode);
  assert.ok(dateFieldNode);
  assert.ok(multilineNode);
  assert.ok(containerNode);
  assert.ok(textNode);
  assert.ok(rectangleNode);
  assert.ok(imageNode);
});


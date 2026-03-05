import assert from "node:assert/strict";
import test from "node:test";

import type { LayoutDefinition } from "../../lib/layout-model.ts";
import { buildDeterministicObjectMap } from "./object-ids.ts";

function sampleLayout(): LayoutDefinition {
  return {
    id: "layout-assets",
    name: "Asset Details",
    defaultTableOccurrence: "Asset Details",
    canvas: {
      width: 1000,
      height: 700,
      gridSize: 10
    },
    components: [
      {
        id: "field-name",
        type: "field",
        position: { x: 20, y: 30, width: 220, height: 28, z: 1 },
        binding: {
          field: "Name",
          tableOccurrence: "Asset Details"
        },
        props: {
          ddrObjectPath: "1.4.2",
          ddrArrangeOrder: 1
        }
      },
      {
        id: "button-save",
        type: "button",
        position: { x: 260, y: 30, width: 140, height: 28, z: 2 },
        props: {
          label: "Save",
          ddrArrangeOrder: 2
        }
      }
    ],
    actions: []
  };
}

test("buildDeterministicObjectMap returns stable IDs for identical layouts", () => {
  const layoutA = sampleLayout();
  const layoutB = sampleLayout();
  const mapA = buildDeterministicObjectMap(layoutA);
  const mapB = buildDeterministicObjectMap(layoutB);
  assert.deepEqual(mapA, mapB);
});

test("buildDeterministicObjectMap generates unique IDs for duplicate paths", () => {
  const layout = sampleLayout();
  layout.components.push({
    id: "field-name-duplicate",
    type: "field",
    position: { x: 20, y: 70, width: 220, height: 28, z: 3 },
    binding: {
      field: "Status",
      tableOccurrence: "Asset Details"
    },
    props: {
      ddrObjectPath: "1.4.2",
      ddrArrangeOrder: 3
    }
  });
  const map = buildDeterministicObjectMap(layout);
  const values = Object.values(map.componentIdToObjectId);
  const unique = new Set(values);
  assert.equal(unique.size, values.length);
});

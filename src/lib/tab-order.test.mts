import assert from "node:assert/strict";
import test from "node:test";
import type { LayoutDefinition } from "./layout-model.ts";
import {
  inferDefaultTabOrderIds,
  normalizeLayoutTabOrder,
  resolveLayoutTabOrderIds,
  resolveNextTabOrderId,
  sanitizeTabOrderIds
} from "./tab-order.ts";

const baseLayout: LayoutDefinition = {
  id: "layout-1",
  name: "Layout",
  defaultTableOccurrence: "Assets",
  canvas: {
    width: 800,
    height: 600,
    gridSize: 8
  },
  components: [
    {
      id: "label-1",
      type: "label",
      position: { x: 20, y: 20, width: 120, height: 22, z: 1 },
      props: {
        label: "Name"
      }
    },
    {
      id: "field-1",
      type: "field",
      position: { x: 20, y: 60, width: 180, height: 28, z: 2 },
      binding: { field: "Name" },
      props: {}
    },
    {
      id: "button-1",
      type: "button",
      position: { x: 260, y: 60, width: 140, height: 28, z: 3 },
      props: {
        label: "Go"
      }
    },
    {
      id: "portal-1",
      type: "portal",
      position: { x: 20, y: 120, width: 280, height: 140, z: 4 },
      props: {
        label: "Assigned"
      }
    }
  ],
  actions: []
};

test("sanitizeTabOrderIds removes duplicates and invalid ids", () => {
  const result = sanitizeTabOrderIds(["field-1", "field-1", "missing", "button-1"], baseLayout.components);
  assert.deepEqual(result.ids, ["field-1", "button-1"]);
  assert.deepEqual(result.missing, ["missing"]);
});

test("resolveLayoutTabOrderIds prefers canonical layout tabOrder", () => {
  const layout: LayoutDefinition = {
    ...baseLayout,
    tabOrder: ["button-1", "field-1", "missing"]
  };
  assert.deepEqual(resolveLayoutTabOrderIds(layout), ["button-1", "field-1"]);
});

test("resolveLayoutTabOrderIds falls back to legacy component props.tabOrder", () => {
  const layout: LayoutDefinition = {
    ...baseLayout,
    components: baseLayout.components.map((component) => {
      if (component.id === "button-1") {
        return {
          ...component,
          props: {
            ...component.props,
            tabOrder: 1
          }
        };
      }
      if (component.id === "field-1") {
        return {
          ...component,
          props: {
            ...component.props,
            tabOrder: 2
          }
        };
      }
      return component;
    })
  };
  assert.deepEqual(resolveLayoutTabOrderIds(layout), ["button-1", "field-1"]);
});

test("inferDefaultTabOrderIds uses top-left reading order for tabbable objects", () => {
  const ids = inferDefaultTabOrderIds(baseLayout.components);
  assert.deepEqual(ids, ["field-1", "button-1", "portal-1"]);
});

test("normalizeLayoutTabOrder writes canonical layout.tabOrder and component tabOrder props", () => {
  const layout: LayoutDefinition = {
    ...baseLayout,
    tabOrder: ["button-1", "field-1"]
  };
  const normalized = normalizeLayoutTabOrder(layout);
  assert.deepEqual(normalized.tabOrder, ["button-1", "field-1"]);
  const field = normalized.components.find((component) => component.id === "field-1");
  const button = normalized.components.find((component) => component.id === "button-1");
  assert.equal(button?.props.tabOrder, 1);
  assert.equal(field?.props.tabOrder, 2);
});

test("resolveNextTabOrderId wraps in both directions", () => {
  const ordered = ["a", "b", "c"];
  assert.equal(resolveNextTabOrderId(ordered, "a", 1), "b");
  assert.equal(resolveNextTabOrderId(ordered, "a", -1), "c");
  assert.equal(resolveNextTabOrderId(ordered, "missing", 1), "a");
  assert.equal(resolveNextTabOrderId(ordered, "", -1), "c");
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  clampPanelTabIndex,
  inferPanelChildTabIndex,
  isComponentVisibleForActivePanelTab,
  parseActivePanelTabsToken,
  serializeActivePanelTabsToken
} from "./tabs-runtime.ts";
import type { LayoutComponent } from "./layout-model.ts";

const panel: LayoutComponent = {
  id: "panel-1",
  type: "panel",
  position: { x: 100, y: 100, width: 400, height: 220, z: 1 },
  props: {
    panelType: "tab",
    panelTabLabels: ["A", "B", "C"]
  }
};

test("parse/serialize panel tab token", () => {
  const parsed = parseActivePanelTabsToken("panel-1:2,panel-2:0");
  assert.deepEqual(parsed, { "panel-1": 2, "panel-2": 0 });
  assert.equal(serializeActivePanelTabsToken(parsed), "panel-1:2,panel-2:0");
  assert.deepEqual(parseActivePanelTabsToken(""), {});
});

test("clampPanelTabIndex constrains bounds", () => {
  assert.equal(clampPanelTabIndex(-3, 3), 0);
  assert.equal(clampPanelTabIndex(20, 3), 2);
  assert.equal(clampPanelTabIndex(1, 3), 1);
});

test("inferPanelChildTabIndex uses geometry fallback", () => {
  const leftChild: LayoutComponent = {
    id: "field-left",
    type: "field",
    position: { x: 120, y: 160, width: 100, height: 30, z: 2 },
    binding: { field: "Name" },
    props: {}
  };
  const rightChild: LayoutComponent = {
    id: "field-right",
    type: "field",
    position: { x: 430, y: 160, width: 60, height: 30, z: 2 },
    binding: { field: "Type" },
    props: {}
  };

  assert.equal(inferPanelChildTabIndex(panel, leftChild, 3), 0);
  assert.equal(inferPanelChildTabIndex(panel, rightChild, 3), 2);
});

test("group hints override geometry for tab association", () => {
  const child: LayoutComponent = {
    id: "field-grouped",
    type: "field",
    position: { x: 120, y: 160, width: 100, height: 30, z: 2 },
    binding: { field: "Name" },
    props: {
      groupId: "panel-1:tab:2"
    }
  };
  assert.equal(inferPanelChildTabIndex(panel, child, 3), 2);
  assert.equal(isComponentVisibleForActivePanelTab(panel, child, 2, 3), true);
  assert.equal(isComponentVisibleForActivePanelTab(panel, child, 1, 3), false);
});

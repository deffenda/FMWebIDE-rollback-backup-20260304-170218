import assert from "node:assert/strict";
import test from "node:test";
import {
  readLayoutViewConfig,
  readWorkspaceViewConfig,
  writeLayoutViewConfig
} from "./view-config-storage.ts";

test("layout view config persists normalized list and table settings", async () => {
  const workspaceId = "default";
  const layoutId = "phase6-table-layout";
  const saved = await writeLayoutViewConfig(workspaceId, layoutId, {
    listRowFields: ["Name", "Type", "name", "  "],
    tableColumns: [
      { field: "Name", width: 220, hidden: false, order: 0 },
      { field: "Type", width: 120, hidden: true, order: 1 },
      { field: "Name", width: 999, hidden: true, order: 2 }
    ]
  });
  assert.deepEqual(saved.listRowFields, ["Name", "Type"]);
  assert.equal(saved.tableColumns.length, 2);
  assert.equal(saved.tableColumns[0]?.field, "Name");
  assert.equal(saved.tableColumns[0]?.width, 220);
  assert.equal(saved.tableColumns[1]?.hidden, true);

  const readBack = await readLayoutViewConfig(workspaceId, layoutId);
  assert.ok(readBack, "Expected persisted layout view config");
  assert.deepEqual(readBack?.listRowFields, ["Name", "Type"]);
  assert.equal(readBack?.tableColumns.length, 2);
});

test("workspace view config read handles missing config safely", async () => {
  const config = await readWorkspaceViewConfig("phase6-missing-workspace");
  assert.equal(config.version, 1);
  assert.deepEqual(config.layouts, {});
});


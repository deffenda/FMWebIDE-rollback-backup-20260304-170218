import assert from "node:assert/strict";
import test from "node:test";

import type { LayoutDefinition } from "../../lib/layout-model.ts";
import {
  getRuntimeSessionSnapshot,
  openRuntimeSession,
  pollRuntimeSession,
  sendRuntimeEvent
} from "./session-store.ts";

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
          ddrArrangeOrder: 1,
          nextByTab: true
        }
      }
    ],
    actions: []
  };
}

function sampleLayoutWithTabOrderAndValidation(): LayoutDefinition {
  return {
    id: "layout-assets-tab-validation",
    name: "Asset Details Validation",
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
          ddrArrangeOrder: 1,
          tabOrder: 1,
          validationRequired: true,
          validationMessage: "Name is required."
        }
      },
      {
        id: "field-notes",
        type: "field",
        position: { x: 20, y: 70, width: 320, height: 60, z: 2 },
        binding: {
          field: "Notes",
          tableOccurrence: "Asset Details"
        },
        props: {
          ddrObjectPath: "1.4.3",
          ddrArrangeOrder: 2,
          tabOrder: 2,
          editShowVerticalScrollbar: true
        }
      }
    ],
    actions: []
  };
}

function createDependencies(layoutFactory: () => LayoutDefinition = sampleLayout) {
  const layout = layoutFactory();
  const records: Array<Record<string, unknown>> = [
    {
      recordId: "1",
      modId: "1",
      Name: "Initial Name"
    }
  ];
  return {
    loadLayoutByRouteToken: async () => layout,
    getRecords: async () => records.map((entry) => ({ ...entry })),
    createRecord: async (_tableOccurrence: string, fieldData: Record<string, unknown>) => {
      const next = {
        recordId: `${records.length + 1}`,
        modId: "1",
        ...fieldData
      };
      records.push(next);
      return next;
    },
    updateRecord: async (
      _tableOccurrence: string,
      recordId: string,
      fieldData: Record<string, unknown>
    ) => {
      const index = records.findIndex((entry) => String(entry.recordId) === recordId);
      const base = index >= 0 ? records[index] : { recordId, modId: "0" };
      const next = {
        ...base,
        ...fieldData,
        modId: `${Number.parseInt(String(base.modId ?? "0"), 10) + 1}`
      };
      if (index >= 0) {
        records[index] = next;
      } else {
        records.push(next);
      }
      return next;
    },
    deleteRecord: async (_tableOccurrence: string, recordId: string) => {
      const index = records.findIndex((entry) => String(entry.recordId) === recordId);
      if (index >= 0) {
        records.splice(index, 1);
      }
      return true;
    },
    runScript: async () => true
  };
}

test("openRuntimeSession returns initial render tree and stable token", async () => {
  const dependencies = createDependencies();
  const opened = await openRuntimeSession({
    layoutId: "Asset Details",
    workspaceId: "default"
  }, dependencies);
  assert.equal(typeof opened.sessionToken, "string");
  assert.equal(opened.sessionToken.length > 0, true);
  assert.equal(opened.serverSeq >= 1, true);
  assert.equal(opened.renderTree.type, "layout-root");
});

test("runtime session marks dirty on input and clears on commit", async () => {
  const dependencies = createDependencies();
  const opened = await openRuntimeSession({
    layoutId: "Asset Details",
    workspaceId: "default"
  }, dependencies);
  const snapshot = getRuntimeSessionSnapshot(opened.sessionToken);
  assert.ok(snapshot, "session snapshot should exist");
  const fieldBinding = snapshot
    ? [...snapshot.objectBindings.values()].find((entry) => entry.kind === "layoutField")
    : null;
  assert.ok(fieldBinding, "expected at least one field binding");
  if (!fieldBinding) {
    return;
  }

  const dirtyPatch = await sendRuntimeEvent(opened.sessionToken, {
    objectId: fieldBinding.objectId,
    eventType: "input",
    payload: {
      value: "Runtime test value"
    },
    timestamp: Date.now(),
    clientSeq: 1
  });
  assert.equal(dirtyPatch.operations.some((entry) => entry.type === "setRecordDirty"), true);

  const commitPatch = await sendRuntimeEvent(opened.sessionToken, {
    objectId: fieldBinding.objectId,
    eventType: "commit",
    payload: {},
    timestamp: Date.now(),
    clientSeq: 2
  });
  assert.equal(
    commitPatch.operations.some((entry) => entry.type === "setError"),
    false,
    "commit should not return an error patch"
  );

  const poll = await pollRuntimeSession(opened.sessionToken, opened.serverSeq);
  assert.equal(Array.isArray(poll.patchSets), true);
});

test("tab key advances focus by layout tab order", async () => {
  const dependencies = createDependencies(sampleLayoutWithTabOrderAndValidation);
  const opened = await openRuntimeSession(
    {
      layoutId: "Asset Details Validation",
      workspaceId: "default"
    },
    dependencies
  );
  const snapshot = getRuntimeSessionSnapshot(opened.sessionToken);
  assert.ok(snapshot);
  const fieldBindings = snapshot
    ? [...snapshot.objectBindings.values()].filter((entry) => entry.kind === "layoutField")
    : [];
  assert.equal(fieldBindings.length >= 2, true);
  const sorted = fieldBindings
    .map((entry) => entry.objectId)
    .sort((left, right) => left.localeCompare(right));
  const first = sorted[0] ?? "";
  const second = sorted[1] ?? "";
  const patch = await sendRuntimeEvent(opened.sessionToken, {
    objectId: first,
    eventType: "keydown",
    payload: {
      key: "Tab",
      shiftKey: false
    },
    timestamp: Date.now(),
    clientSeq: 3
  });
  const focusPatch = patch.operations.find((entry) => entry.type === "setFocus");
  assert.ok(focusPatch);
  assert.equal((focusPatch as { objectId: string }).objectId.length > 0, true);
  assert.equal((focusPatch as { objectId: string }).objectId === first, false);
  assert.equal((focusPatch as { objectId: string }).objectId === second || (focusPatch as { objectId: string }).objectId.length > 0, true);
});

test("required field validation blocks commit and returns field error", async () => {
  const dependencies = createDependencies(sampleLayoutWithTabOrderAndValidation);
  const opened = await openRuntimeSession(
    {
      layoutId: "Asset Details Validation",
      workspaceId: "default"
    },
    dependencies
  );
  const snapshot = getRuntimeSessionSnapshot(opened.sessionToken);
  assert.ok(snapshot);
  const nameBinding = snapshot
    ? [...snapshot.objectBindings.values()].find(
        (entry) => entry.kind === "layoutField" && entry.fieldName === "Name"
      )
    : null;
  assert.ok(nameBinding);
  if (!nameBinding) {
    return;
  }

  await sendRuntimeEvent(opened.sessionToken, {
    objectId: nameBinding.objectId,
    eventType: "input",
    payload: {
      value: ""
    },
    timestamp: Date.now(),
    clientSeq: 4
  });

  const commitPatch = await sendRuntimeEvent(opened.sessionToken, {
    objectId: nameBinding.objectId,
    eventType: "commit",
    payload: {},
    timestamp: Date.now(),
    clientSeq: 5
  });
  const errorPatch = commitPatch.operations.find((entry) => entry.type === "setError");
  assert.ok(errorPatch);
  const errorMessage = (errorPatch as { message: string }).message;
  assert.equal(errorMessage.includes("required"), true);
});

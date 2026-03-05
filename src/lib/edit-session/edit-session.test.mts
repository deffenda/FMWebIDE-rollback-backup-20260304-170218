import assert from "node:assert/strict";
import test from "node:test";
import {
  applyStagedRecordToRecord,
  beginEdit,
  commitRecord,
  createEmptyEditSession,
  getDirtyFieldData,
  getDirtyRecordIds,
  getPortalOperations,
  isDirty,
  revertAll,
  revertField,
  revertPortalRow,
  revertRecord,
  stageFieldChange,
  stagePortalOperation
} from "./index.ts";

test("stageFieldChange begins an edit session and tracks dirty fields", () => {
  const snapshot = {
    recordId: "101",
    Name: "Asset 1",
    Price: 10
  };
  let session = createEmptyEditSession();
  session = stageFieldChange(session, {
    recordId: "101",
    field: "Name",
    value: "Asset 1 (Updated)",
    snapshot
  });
  assert.equal(session.active, true);
  assert.equal(isDirty(session), true);
  assert.deepEqual(getDirtyFieldData(session, "101"), {
    Name: "Asset 1 (Updated)"
  });
});

test("stageFieldChange removes dirty field when value equals snapshot", () => {
  const snapshot = {
    recordId: "101",
    Name: "Asset 1",
    Price: 10
  };
  let session = createEmptyEditSession();
  session = stageFieldChange(session, {
    recordId: "101",
    field: "Name",
    value: "Asset 1 (Updated)",
    snapshot
  });
  session = stageFieldChange(session, {
    recordId: "101",
    field: "Name",
    value: "Asset 1",
    snapshot
  });
  assert.deepEqual(getDirtyFieldData(session, "101"), {});
  assert.equal(isDirty(session), false);
});

test("revertField removes only selected field dirtiness", () => {
  const snapshot = {
    recordId: "101",
    Name: "Asset 1",
    Price: 10
  };
  let session = beginEdit(createEmptyEditSession(), {
    recordId: "101",
    snapshot
  });
  session = stageFieldChange(session, {
    recordId: "101",
    field: "Name",
    value: "Asset 1 (Updated)",
    snapshot
  });
  session = stageFieldChange(session, {
    recordId: "101",
    field: "Price",
    value: 12,
    snapshot
  });
  session = revertField(session, {
    recordId: "101",
    field: "Name"
  });
  assert.deepEqual(getDirtyFieldData(session, "101"), {
    Price: 12
  });
});

test("portal operations are staged and revertPortalRow removes targeted operation", () => {
  const snapshot = {
    recordId: "101",
    Name: "Asset 1"
  };
  let session = createEmptyEditSession();
  session = stagePortalOperation(session, {
    recordId: "101",
    snapshot,
    operation: {
      id: "op-1",
      type: "delete",
      tableOccurrence: "Assignments",
      rowRecordId: "7001"
    }
  });
  session = stagePortalOperation(session, {
    recordId: "101",
    snapshot,
    operation: {
      id: "op-2",
      type: "update",
      tableOccurrence: "Assignments",
      rowRecordId: "7002",
      fieldData: {
        Note: "Updated"
      }
    }
  });
  assert.equal(getPortalOperations(session, "101").length, 2);
  session = revertPortalRow(session, {
    recordId: "101",
    operationId: "op-1"
  });
  assert.deepEqual(
    getPortalOperations(session, "101").map((operation) => operation.id),
    ["op-2"]
  );
});

test("revertRecord returns original snapshot and clears record from session", () => {
  const snapshot = {
    recordId: "101",
    Name: "Asset 1",
    Price: 10
  };
  let session = createEmptyEditSession();
  session = stageFieldChange(session, {
    recordId: "101",
    field: "Price",
    value: 22,
    snapshot
  });
  const reverted = revertRecord(session, {
    recordId: "101"
  });
  assert.equal(reverted.snapshot?.Price, 10);
  assert.deepEqual(getDirtyRecordIds(reverted.state), []);
  assert.equal(reverted.state.active, false);
});

test("commitRecord removes record dirty state", () => {
  const snapshot = {
    recordId: "101",
    Name: "Asset 1"
  };
  let session = createEmptyEditSession();
  session = stageFieldChange(session, {
    recordId: "101",
    field: "Name",
    value: "Asset 2",
    snapshot
  });
  assert.equal(isDirty(session), true);
  session = commitRecord(session, {
    recordId: "101"
  });
  assert.equal(isDirty(session), false);
});

test("applyStagedRecordToRecord overlays dirty fields", () => {
  const snapshot = {
    recordId: "101",
    Name: "Asset 1",
    Price: 10
  };
  let session = createEmptyEditSession();
  session = stageFieldChange(session, {
    recordId: "101",
    field: "Price",
    value: 99,
    snapshot
  });
  const applied = applyStagedRecordToRecord(snapshot, session);
  assert.equal(applied.Price, 99);
  assert.equal(applied.Name, "Asset 1");
});

test("revertAll clears session", () => {
  const snapshot = {
    recordId: "101",
    Name: "Asset 1"
  };
  let session = createEmptyEditSession();
  session = stageFieldChange(session, {
    recordId: "101",
    field: "Name",
    value: "Asset 2",
    snapshot
  });
  session = revertAll();
  assert.equal(session.active, false);
  assert.equal(isDirty(session), false);
});

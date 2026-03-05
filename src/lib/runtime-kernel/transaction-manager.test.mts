import assert from "node:assert/strict";
import test from "node:test";
import {
  commitTransactionBuffer,
  createTransactionBuffer,
  revertTransactionBuffer,
  stageFieldOperation
} from "./transaction-manager.ts";

test("transaction manager stages operations and commits them in order", async () => {
  let buffer = createTransactionBuffer(1000);
  buffer = stageFieldOperation(buffer, {
    stepId: "step-a",
    fieldName: "Assets::Name",
    value: "Asset A",
    now: 1001
  });
  buffer = stageFieldOperation(buffer, {
    stepId: "step-b",
    fieldName: "Assets::Type",
    value: "Laptop",
    now: 1002
  });

  const applied: string[] = [];
  const committed = await commitTransactionBuffer(
    buffer,
    {
      applyField: async (operation) => {
        applied.push(operation.fieldName);
        return {
          ok: true
        };
      },
      commit: async () => ({
        ok: true
      })
    },
    1050
  );
  assert.deepEqual(applied, ["Assets::Name", "Assets::Type"]);
  assert.equal(committed.result.ok, true);
  assert.equal(committed.buffer.state.status, "committed");
  assert.equal(committed.buffer.operations.length, 0);
});

test("transaction manager rolls back on apply failure", async () => {
  let buffer = createTransactionBuffer(2000);
  buffer = stageFieldOperation(buffer, {
    stepId: "step-a",
    fieldName: "Common::Name",
    value: "Alice",
    now: 2001
  });
  buffer = stageFieldOperation(buffer, {
    stepId: "step-b",
    fieldName: "Common::LockedField",
    value: "blocked",
    now: 2002
  });

  let reverted = false;
  const committed = await commitTransactionBuffer(
    buffer,
    {
      applyField: async (operation) => {
        if (operation.fieldName.includes("LockedField")) {
          return {
            ok: false,
            lastError: 301,
            lastMessage: "Record in use"
          };
        }
        return {
          ok: true
        };
      },
      revert: async () => {
        reverted = true;
        return {
          ok: true
        };
      }
    },
    2050
  );
  assert.equal(committed.result.ok, false);
  assert.equal(committed.buffer.state.status, "failed");
  assert.equal(reverted, true);
  assert.match(String(committed.result.lastMessage ?? ""), /Record in use/i);
});

test("transaction manager explicit revert clears staged operations", async () => {
  let buffer = createTransactionBuffer(3000);
  buffer = stageFieldOperation(buffer, {
    stepId: "step-a",
    fieldName: "Assets::Description",
    value: "Temporary",
    now: 3001
  });

  const reverted = await revertTransactionBuffer(
    buffer,
    3010,
    async () => ({
      ok: true
    })
  );
  assert.equal(reverted.result.ok, true);
  assert.equal(reverted.buffer.state.status, "reverted");
  assert.equal(reverted.buffer.operations.length, 0);
});

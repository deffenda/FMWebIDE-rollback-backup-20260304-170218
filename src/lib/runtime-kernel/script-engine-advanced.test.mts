import assert from "node:assert/strict";
import test from "node:test";
import { executeScript } from "./script-engine.ts";
import {
  clearLocalsForFrame,
  createVariableStoreState,
  getVariable,
  setVariable
} from "./variable-store.ts";
import type { RuntimeVariableStoreState, RuntimeVariableValue, ScriptDefinition } from "./types.ts";

type MutableVariableStore = {
  state: RuntimeVariableStoreState;
};

function createVariableApi(store: MutableVariableStore) {
  return {
    set(name: string, value: RuntimeVariableValue, frameId?: string) {
      store.state = setVariable(store.state, {
        name,
        value,
        frameId
      });
    },
    get(name: string, frameId?: string) {
      return getVariable(store.state, {
        name,
        frameId
      });
    },
    clearFrame(frameId: string) {
      store.state = clearLocalsForFrame(store.state, frameId);
    }
  };
}

function createBaseAdapter(store: MutableVariableStore) {
  const enteredModes: string[] = [];
  const stagedFields: Array<{ fieldName: string; value: RuntimeVariableValue }> = [];
  let committed = 0;
  let committedTransaction = 0;
  return {
    enteredModes,
    stagedFields,
    get commitCount() {
      return committed;
    },
    get commitTransactionCount() {
      return committedTransaction;
    },
    adapter: {
      resolveCurrentContext: () => ({
        id: "context-main",
        reason: "script",
        windowId: "main",
        layoutName: "Asset Details",
        tableOccurrence: "Assets",
        recordId: "10",
        pushedAt: Date.now()
      }),
      resolveFieldValue: () => "",
      actions: {
        goToLayout: async () => {},
        goToRelatedRecord: async () => ({ ok: true }),
        goToRecord: async () => {},
        enterMode: async (mode: "browse" | "find" | "preview") => {
          enteredModes.push(mode);
        },
        performFind: async () => {},
        showAllRecords: async () => ({ ok: true }),
        omitRecord: async () => ({ ok: true }),
        showOmittedOnly: async () => ({ ok: true }),
        showCustomDialog: async () => ({ button: 1 }),
        pauseScript: async () => {},
        setField: async (fieldName: string, value: RuntimeVariableValue) => {
          stagedFields.push({ fieldName, value });
          return { ok: true };
        },
        commit: async () => {
          committed += 1;
          return { ok: true };
        },
        revert: async () => ({ ok: true }),
        newRecord: async () => ({ ok: true }),
        deleteRecord: async () => ({ ok: true }),
        openRecord: async () => ({ ok: true }),
        refreshWindow: async () => {},
        replaceFieldContents: async (fieldName: string, value: RuntimeVariableValue) => {
          stagedFields.push({ fieldName, value });
          return { ok: true };
        },
        beginTransaction: async () => ({ ok: true }),
        commitTransaction: async () => {
          committedTransaction += 1;
          return { ok: true };
        },
        revertTransaction: async () => ({ ok: true }),
        performScriptOnServer: async () => ({ ok: true })
      },
      variables: createVariableApi(store)
    }
  };
}

test("advanced script engine supports nested flow, loop control, mode changes and transaction commits", async () => {
  const store: MutableVariableStore = {
    state: createVariableStoreState()
  };
  const harness = createBaseAdapter(store);
  const scriptsByName: Record<string, ScriptDefinition> = {
    "Advanced Main": {
      id: "script-main",
      name: "Advanced Main",
      steps: [
        {
          id: "s-1",
          type: "Set Error Capture",
          params: { on: true }
        },
        {
          id: "s-2",
          type: "Set Variable",
          params: {
            name: "$$branchFlag",
            value: "1"
          }
        },
        {
          id: "s-3",
          type: "If",
          params: {
            condition: "0"
          }
        },
        {
          id: "s-4",
          type: "Set Variable",
          params: {
            name: "$$branch",
            value: "if"
          }
        },
        {
          id: "s-5",
          type: "Else If",
          params: {
            condition: "$$branchFlag"
          }
        },
        {
          id: "s-6",
          type: "Set Variable",
          params: {
            name: "$$branch",
            value: "elseif"
          }
        },
        {
          id: "s-7",
          type: "Else"
        },
        {
          id: "s-8",
          type: "Set Variable",
          params: {
            name: "$$branch",
            value: "else"
          }
        },
        {
          id: "s-9",
          type: "End If"
        },
        {
          id: "s-10",
          type: "Loop"
        },
        {
          id: "s-11",
          type: "Exit Loop If",
          params: {
            condition: "1"
          }
        },
        {
          id: "s-12",
          type: "End Loop"
        },
        {
          id: "s-13",
          type: "Begin Transaction"
        },
        {
          id: "s-14",
          type: "Set Field By Name",
          params: {
            fieldName: "Assets::Name",
            value: "Asset Alpha"
          }
        },
        {
          id: "s-15",
          type: "Replace Field Contents",
          params: {
            fieldName: "Assets::Description",
            value: "Updated by transaction"
          }
        },
        {
          id: "s-16",
          type: "Commit Transaction"
        },
        {
          id: "s-17",
          type: "Enter Preview Mode"
        },
        {
          id: "s-18",
          type: "Enter Browse Mode"
        },
        {
          id: "s-19",
          type: "Enter Find Mode"
        },
        {
          id: "s-20",
          type: "Perform Script",
          params: {
            scriptName: "Child Return",
            resultVariable: "$childReturn"
          }
        },
        {
          id: "s-21",
          type: "Exit Script",
          params: {
            result: "$childReturn"
          }
        }
      ]
    },
    "Child Return": {
      id: "script-child",
      name: "Child Return",
      steps: [
        {
          id: "c-1",
          type: "Exit Script",
          params: {
            result: "child-result"
          }
        }
      ]
    }
  };

  const runState = await executeScript(
    {
      scriptName: "Advanced Main",
      scriptsByName
    },
    harness.adapter
  );
  assert.equal(runState.status, "completed");
  assert.equal(runState.result?.ok, true);
  assert.equal(runState.result?.returnValue, "child-result");
  assert.equal(getVariable(store.state, { name: "$$branch" }), "elseif");
  assert.equal(harness.stagedFields.length, 2);
  assert.equal(harness.commitTransactionCount, 1);
  assert.deepEqual(harness.enteredModes, ["preview", "browse", "find"]);
  assert.ok(runState.stepTrace.length > 10);
  assert.equal(runState.transaction.status, "committed");
});

test("Set Error Capture with Get(LastError)/Get(LastMessage) preserves script flow", async () => {
  const store: MutableVariableStore = {
    state: createVariableStoreState()
  };
  const harness = createBaseAdapter(store);
  harness.adapter.actions.omitRecord = async () => ({
    ok: false,
    lastError: 401,
    lastMessage: "No records to omit"
  });

  const scriptsByName: Record<string, ScriptDefinition> = {
    "Error Capture Script": {
      id: "script-error-capture",
      name: "Error Capture Script",
      steps: [
        {
          id: "s-1",
          type: "Set Error Capture",
          params: {
            on: true
          }
        },
        {
          id: "s-2",
          type: "Omit Record"
        },
        {
          id: "s-3",
          type: "Set Variable",
          params: {
            name: "$$capturedError",
            value: "Get(LastError)"
          }
        },
        {
          id: "s-4",
          type: "Set Variable",
          params: {
            name: "$$capturedMessage",
            value: "Get(LastMessage)"
          }
        },
        {
          id: "s-5",
          type: "Exit Script",
          params: {
            result: "$$capturedError"
          }
        }
      ]
    }
  };

  const runState = await executeScript(
    {
      scriptName: "Error Capture Script",
      scriptsByName
    },
    harness.adapter
  );
  assert.equal(runState.status, "completed");
  assert.equal(runState.result?.returnValue, 401);
  assert.equal(getVariable(store.state, { name: "$$capturedError" }), 401);
  assert.equal(getVariable(store.state, { name: "$$capturedMessage" }), "No records to omit");
});

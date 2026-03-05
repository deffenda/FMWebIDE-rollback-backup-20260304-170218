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

test("script engine executes control flow, nested scripts, and variable scopes", async () => {
  const store: MutableVariableStore = {
    state: createVariableStoreState()
  };
  const scriptsByName: Record<string, ScriptDefinition> = {
    "Main Script": {
      id: "script-main",
      name: "Main Script",
      steps: [
        {
          id: "step-1",
          type: "Set Variable",
          params: {
            name: "$$counter",
            value: 1
          }
        },
        {
          id: "step-2",
          type: "If",
          params: {
            condition: "$$counter"
          }
        },
        {
          id: "step-3",
          type: "Set Variable",
          params: {
            name: "$result",
            value: "ok"
          }
        },
        {
          id: "step-4",
          type: "Else"
        },
        {
          id: "step-5",
          type: "Set Variable",
          params: {
            name: "$result",
            value: "bad"
          }
        },
        {
          id: "step-6",
          type: "End If"
        },
        {
          id: "step-7",
          type: "Perform Script",
          params: {
            scriptName: "Child Script",
            parameter: "child-value"
          }
        },
        {
          id: "step-8",
          type: "Exit Script",
          params: {
            result: "$result"
          }
        }
      ]
    },
    "Child Script": {
      id: "script-child",
      name: "Child Script",
      steps: [
        {
          id: "child-1",
          type: "Set Variable",
          params: {
            name: "$$childParam",
            value: "Get(ScriptParameter)"
          }
        }
      ]
    }
  };

  const runState = await executeScript(
    {
      scriptName: "Main Script",
      scriptsByName
    },
    {
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
        goToRecord: async () => {},
        enterMode: async () => {},
        performFind: async () => {},
        showCustomDialog: async () => ({ button: 1 }),
        pauseScript: async () => {},
        setField: async () => ({ ok: true }),
        commit: async () => ({ ok: true }),
        revert: async () => ({ ok: true }),
        newRecord: async () => ({ ok: true }),
        deleteRecord: async () => ({ ok: true }),
        openRecord: async () => ({ ok: true }),
        refreshWindow: async () => {},
        performScriptOnServer: async () => ({ ok: true })
      },
      variables: createVariableApi(store)
    }
  );

  assert.equal(runState.status, "completed");
  assert.equal(runState.result?.ok, true);
  assert.equal(runState.result?.returnValue, "ok");
  assert.equal(getVariable(store.state, { name: "$$counter" }), 1);
  assert.equal(getVariable(store.state, { name: "$$childParam" }), "child-value");
});

test("script engine respects missing script errors", async () => {
  const store: MutableVariableStore = {
    state: createVariableStoreState()
  };
  const runState = await executeScript(
    {
      scriptName: "Unknown Script",
      scriptsByName: {}
    },
    {
      resolveCurrentContext: () => undefined,
      resolveFieldValue: () => "",
      actions: {
        goToLayout: async () => {},
        goToRecord: async () => {},
        enterMode: async () => {},
        performFind: async () => {},
        showCustomDialog: async () => ({ button: 1 }),
        pauseScript: async () => {},
        setField: async () => ({ ok: true }),
        commit: async () => ({ ok: true }),
        revert: async () => ({ ok: true }),
        newRecord: async () => ({ ok: true }),
        deleteRecord: async () => ({ ok: true }),
        openRecord: async () => ({ ok: true }),
        refreshWindow: async () => {},
        performScriptOnServer: async () => ({ ok: true })
      },
      variables: createVariableApi(store)
    }
  );
  assert.equal(runState.status, "failed");
  assert.equal(runState.lastError, 104);
});

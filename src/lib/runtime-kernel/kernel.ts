import {
  currentContextFrame,
  popContextFrame,
  pushContextFrame,
  resolveFieldReference,
  type ContextStacksByWindow
} from "./context-stack.ts";
import {
  attachFoundSetRecord,
  createFoundSet,
  currentFoundSetRecordId,
  goToFoundSetRecord,
  refreshFoundSet
} from "./foundset-store.ts";
import { executeScript, type ScriptEngineAdapter, type ScriptRuntimeActions } from "./script-engine.ts";
import {
  clearAllGlobals,
  clearLocalsForFrame,
  createVariableStoreState,
  getVariable,
  setVariable
} from "./variable-store.ts";
import {
  createWindowManagerState,
  focusWindow as focusWindowState,
  openWindow as openWindowState,
  patchWindow,
  closeWindow as closeWindowState,
  type WindowManagerState
} from "./window-manager.ts";
import type { PluginManager } from "../../plugins/manager.ts";
import type {
  FoundSetDataSource,
  FoundSetQuerySpec,
  RuntimeContextFrame,
  RuntimeKernelSnapshot,
  RuntimeKernelState,
  RuntimeKernelSubscriber,
  RuntimeMode,
  RuntimeRelationshipEdge,
  RuntimeVariableValue,
  ScriptDefinition,
  ScriptEngineRunState,
  WindowType
} from "./types.ts";

type RuntimeKernelActionsAdapter = Partial<ScriptRuntimeActions> & {
  resolveFieldValue?: (
    fieldName: string,
    context: RuntimeContextFrame | undefined
  ) => RuntimeVariableValue | Promise<RuntimeVariableValue>;
  scriptStepMode?: boolean;
  awaitScriptStep?: ScriptEngineAdapter["awaitStep"];
  implicitTransaction?: boolean;
};

type RuntimeKernelFeatureFlags = {
  scriptsEngineEnabled?: boolean;
  multiWindowEnabled?: boolean;
};

type RuntimeKernelOptions = {
  sessionId?: string;
  workspaceId: string;
  initialLayoutName: string;
  initialTableOccurrence: string;
  initialMode?: RuntimeMode;
  initialFoundSet?: {
    recordIds: string[];
    querySpec?: FoundSetQuerySpec;
    totalCount?: number;
    currentIndex?: number;
  };
  scriptsByName?: Record<string, ScriptDefinition>;
  relationships?: RuntimeRelationshipEdge[];
  featureFlags?: RuntimeKernelFeatureFlags;
  pluginManager?: PluginManager;
  adapters?: RuntimeKernelActionsAdapter;
  now?: () => number;
};

type NavigateRecordTarget = {
  mode?: "first" | "prev" | "next" | "last";
  index?: number;
  recordId?: string;
};

type RuntimeKernel = {
  getState: () => RuntimeKernelState;
  subscribe: (subscriber: RuntimeKernelSubscriber) => () => void;
  getSnapshot: () => RuntimeKernelSnapshot;
  createFoundSet: (input: {
    dataSource?: FoundSetDataSource;
    querySpec?: FoundSetQuerySpec;
    recordIds: string[];
    totalCount?: number;
    currentIndex?: number;
    attachToWindowId?: string;
    pushNavigation?: boolean;
  }) => string;
  attachFoundSetToWindow: (
    foundSetId: string,
    input?: {
      windowId?: string;
      recordId?: string;
      pushNavigation?: boolean;
    }
  ) => boolean;
  refreshFoundSet: (
    foundSetId: string,
    input: {
      recordIds: string[];
      totalCount?: number;
      preserveRecordId?: string;
    }
  ) => boolean;
  navigateRecord: (target: NavigateRecordTarget, input?: { windowId?: string }) => string | undefined;
  navigateLayout: (
    layoutName: string,
    input?: {
      tableOccurrence?: string;
      mode?: RuntimeMode;
      windowId?: string;
      foundSetId?: string;
      recordId?: string;
      pushNavigation?: boolean;
    }
  ) => boolean;
  enterMode: (mode: RuntimeMode, input?: { windowId?: string; pushNavigation?: boolean }) => boolean;
  openWindow: (input: {
    layoutName: string;
    tableOccurrence: string;
    type?: WindowType;
    title?: string;
    parentWindowId?: string;
    mode?: RuntimeMode;
    foundSetId?: string;
    recordId?: string;
  }) => string;
  closeWindow: (windowId: string) => boolean;
  focusWindow: (windowId: string) => boolean;
  setRelationships: (relationships: RuntimeRelationshipEdge[]) => void;
  setScripts: (scriptsByName: Record<string, ScriptDefinition>) => void;
  pushContext: (
    input: Omit<RuntimeContextFrame, "id" | "pushedAt"> & {
      id?: string;
      pushedAt?: number;
    }
  ) => void;
  popContext: (windowId?: string) => void;
  resolveFieldRef: (
    fieldRef: string,
    input?: {
      windowId?: string;
      fallbackTableOccurrence?: string;
    }
  ) => {
    tableOccurrence: string;
    fieldName: string;
  };
  setVariable: (name: string, value: RuntimeVariableValue, frameId?: string) => void;
  getVariable: (name: string, frameId?: string) => RuntimeVariableValue | undefined;
  clearGlobals: () => void;
  runScript: (input: {
    scriptName: string;
    parameter?: string;
  }) => Promise<ScriptEngineRunState>;
  cancelScript: () => boolean;
};

function nowWithFallback(now?: () => number): number {
  return Number(now?.() ?? Date.now());
}

function normalizeScriptsByName(scriptsByName: Record<string, ScriptDefinition>): Record<string, ScriptDefinition> {
  const normalized: Record<string, ScriptDefinition> = {};
  for (const entry of Object.values(scriptsByName)) {
    const key = entry.name.trim();
    if (!key) {
      continue;
    }
    normalized[key] = entry;
  }
  return normalized;
}

function snapshotFromState(state: RuntimeKernelState): RuntimeKernelSnapshot {
  const windows = state.windowOrder.map((windowId) => state.windows[windowId]).filter(Boolean);
  const foundSets = Object.values(state.foundSets).map((foundSet) => ({
    id: foundSet.id,
    layoutName: foundSet.dataSource.layoutName,
    tableOccurrence: foundSet.dataSource.tableOccurrence,
    totalCount: foundSet.totalCount,
    currentIndex: foundSet.currentIndex,
    currentRecordId: currentFoundSetRecordId(foundSet)
  }));
  return {
    sessionId: state.sessionId,
    workspaceId: state.workspaceId,
    focusedWindowId: state.focusedWindowId,
    windows,
    foundSets,
    contextStacksByWindow: state.contextStacksByWindow,
    variables: {
      globalNames: Object.keys(state.variables.globals),
      localFrameIds: Object.keys(state.variables.localsByFrameId)
    },
    activeScriptRun: state.activeScriptRun
      ? {
          runId: state.activeScriptRun.runId,
          status: state.activeScriptRun.status,
          activeFrameId: state.activeScriptRun.activeFrameId,
          callDepth: state.activeScriptRun.callStack.length,
          lastError: state.activeScriptRun.lastError,
          lastMessage: state.activeScriptRun.lastMessage,
          callStack: [...state.activeScriptRun.callStack],
          stepTraceTail: state.activeScriptRun.stepTrace.slice(-20)
        }
      : undefined,
    activeTransaction: state.activeTransaction
  };
}

function isWindowKnown(state: RuntimeKernelState, windowId: string): boolean {
  const normalized = windowId.trim();
  if (!normalized) {
    return false;
  }
  return Boolean(state.windows[normalized]);
}

function patchTopContextFrame(
  stacks: ContextStacksByWindow,
  windowId: string,
  patch: Partial<Pick<RuntimeContextFrame, "layoutName" | "tableOccurrence" | "recordId" | "foundSetId">>
): ContextStacksByWindow {
  const currentStack = stacks[windowId] ?? [];
  if (currentStack.length === 0) {
    return stacks;
  }
  const last = currentStack[currentStack.length - 1];
  const nextLast: RuntimeContextFrame = {
    ...last,
    layoutName: patch.layoutName ?? last.layoutName,
    tableOccurrence: patch.tableOccurrence ?? last.tableOccurrence,
    recordId: patch.recordId ?? last.recordId,
    foundSetId: patch.foundSetId ?? last.foundSetId
  };
  return {
    ...stacks,
    [windowId]: [...currentStack.slice(0, -1), nextLast]
  };
}

function defaultActions(): ScriptRuntimeActions {
  const unsupported = async () => ({
    ok: false,
    lastError: 1201,
    lastMessage: "Unsupported in runtime kernel without adapter"
  });
  return {
    goToLayout: async () => {},
    goToRecord: async () => {},
    enterMode: async () => {},
    performFind: async () => {},
    showCustomDialog: async () => ({ button: 1 }),
    pauseScript: async (durationMs) => {
      if (durationMs <= 0) {
        return;
      }
      await new Promise((resolve) => {
        setTimeout(resolve, durationMs);
      });
    },
    setField: unsupported,
    commit: unsupported,
    revert: unsupported,
    newRecord: unsupported,
    deleteRecord: unsupported,
    openRecord: unsupported,
    refreshWindow: async () => {},
    performScriptOnServer: unsupported
  };
}

export function createRuntimeKernel(options: RuntimeKernelOptions): RuntimeKernel {
  const now = options.now;
  const featureFlags: Required<RuntimeKernelFeatureFlags> = {
    scriptsEngineEnabled: options.featureFlags?.scriptsEngineEnabled ?? true,
    multiWindowEnabled: options.featureFlags?.multiWindowEnabled ?? true
  };
  const subscribers = new Set<RuntimeKernelSubscriber>();
  const runtimeActions = {
    ...defaultActions(),
    ...(options.adapters ?? {})
  } satisfies RuntimeKernelActionsAdapter & ScriptRuntimeActions;
  const pluginManager = options.pluginManager;

  const emitPluginHook = (name: "OnRecordLoad" | "OnRecordCommit" | "OnLayoutEnter" | "OnScriptStart" | "OnScriptEnd" | "OnTransactionStart" | "OnTransactionEnd", payload: Record<string, unknown>) => {
    if (!pluginManager) {
      return;
    }
    void pluginManager.emitHook(name, {
      ...payload,
      workspaceId: options.workspaceId
    });
  };

  const baseWindowState = createWindowManagerState({
    layoutName: options.initialLayoutName,
    tableOccurrence: options.initialTableOccurrence,
    mode: options.initialMode ?? "browse",
    now: nowWithFallback(now)
  });

  let state: RuntimeKernelState = {
    sessionId: options.sessionId?.trim() || `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    workspaceId: options.workspaceId,
    windows: baseWindowState.windows,
    windowOrder: baseWindowState.windowOrder,
    focusedWindowId: baseWindowState.focusedWindowId,
    foundSets: {},
    contextStacksByWindow: pushContextFrame(
      {},
      {
        reason: "initial",
        windowId: baseWindowState.focusedWindowId,
        layoutName: options.initialLayoutName,
        tableOccurrence: options.initialTableOccurrence,
        pushedAt: nowWithFallback(now)
      }
    ),
    variables: createVariableStoreState(),
    relationships: [...(options.relationships ?? [])],
    scriptsByName: normalizeScriptsByName(options.scriptsByName ?? {}),
    scriptHistory: [],
    transactionHistory: []
  };

  if (options.initialFoundSet && options.initialFoundSet.recordIds.length > 0) {
    const foundSet = createFoundSet({
      dataSource: {
        workspaceId: options.workspaceId,
        layoutName: options.initialLayoutName,
        tableOccurrence: options.initialTableOccurrence
      },
      querySpec: options.initialFoundSet.querySpec ?? {},
      recordIds: options.initialFoundSet.recordIds,
      totalCount: options.initialFoundSet.totalCount,
      currentIndex: options.initialFoundSet.currentIndex,
      now: nowWithFallback(now)
    });
    const currentRecordId = currentFoundSetRecordId(foundSet);
    state = {
      ...state,
      foundSets: {
        [foundSet.id]: foundSet
      }
    };
    const patchedWindows = patchWindow(
      {
        windows: state.windows,
        windowOrder: state.windowOrder,
        focusedWindowId: state.focusedWindowId
      },
      {
        windowId: baseWindowState.focusedWindowId,
        foundSetId: foundSet.id,
        recordId: currentRecordId
      }
    );
    state = {
      ...state,
      windows: patchedWindows.windows,
      windowOrder: patchedWindows.windowOrder,
      focusedWindowId: patchedWindows.focusedWindowId,
      contextStacksByWindow: patchTopContextFrame(state.contextStacksByWindow, baseWindowState.focusedWindowId, {
        foundSetId: foundSet.id,
        recordId: currentRecordId
      })
    };
  }

  const notify = () => {
    for (const subscriber of subscribers) {
      subscriber(state);
    }
  };

  const setState = (next: RuntimeKernelState | ((current: RuntimeKernelState) => RuntimeKernelState)) => {
    const resolved = typeof next === "function" ? next(state) : next;
    state = resolved;
    notify();
  };

  const resolveWindowId = (windowId?: string): string => {
    const normalized = windowId?.trim();
    return normalized && state.windows[normalized] ? normalized : state.focusedWindowId;
  };

  const kernel: RuntimeKernel = {
    getState: () => state,
    subscribe: (subscriber) => {
      subscribers.add(subscriber);
      return () => {
        subscribers.delete(subscriber);
      };
    },
    getSnapshot: () => snapshotFromState(state),
    createFoundSet: (input) => {
      const targetWindowId = resolveWindowId(input.attachToWindowId);
      const targetWindow = state.windows[targetWindowId];
      const nextFoundSet = createFoundSet({
        dataSource:
          input.dataSource ??
          ({
            workspaceId: state.workspaceId,
            layoutName: targetWindow.layoutName,
            tableOccurrence: targetWindow.tableOccurrence
          } satisfies FoundSetDataSource),
        querySpec: input.querySpec ?? {},
        recordIds: input.recordIds,
        totalCount: input.totalCount,
        currentIndex: input.currentIndex,
        now: nowWithFallback(now)
      });
      const currentRecordId = currentFoundSetRecordId(nextFoundSet);
      setState((previous) => {
        let nextState: RuntimeKernelState = {
          ...previous,
          foundSets: {
            ...previous.foundSets,
            [nextFoundSet.id]: nextFoundSet
          }
        };
        if (input.attachToWindowId !== undefined || input.pushNavigation !== undefined) {
          const patched = patchWindow(
            {
              windows: nextState.windows,
              windowOrder: nextState.windowOrder,
              focusedWindowId: nextState.focusedWindowId
            },
            {
              windowId: targetWindowId,
              foundSetId: nextFoundSet.id,
              recordId: currentRecordId,
              pushNavigation: input.pushNavigation ?? true,
              now: nowWithFallback(now)
            }
          );
          nextState = {
            ...nextState,
            windows: patched.windows,
            windowOrder: patched.windowOrder,
            focusedWindowId: patched.focusedWindowId,
            contextStacksByWindow: patchTopContextFrame(nextState.contextStacksByWindow, targetWindowId, {
              foundSetId: nextFoundSet.id,
              recordId: currentRecordId
            })
          };
        }
        return nextState;
      });
      return nextFoundSet.id;
    },
    attachFoundSetToWindow: (foundSetId, input) => {
      const normalizedFoundSetId = foundSetId.trim();
      if (!normalizedFoundSetId || !state.foundSets[normalizedFoundSetId]) {
        return false;
      }
      const targetWindowId = resolveWindowId(input?.windowId);
      if (!isWindowKnown(state, targetWindowId)) {
        return false;
      }
      const foundSet = state.foundSets[normalizedFoundSetId];
      const recordId = input?.recordId?.trim() || currentFoundSetRecordId(foundSet);
      setState((previous) => {
        const patched = patchWindow(
          {
            windows: previous.windows,
            windowOrder: previous.windowOrder,
            focusedWindowId: previous.focusedWindowId
          },
          {
            windowId: targetWindowId,
            foundSetId: normalizedFoundSetId,
            recordId,
            pushNavigation: input?.pushNavigation ?? true,
            now: nowWithFallback(now)
          }
        );
        return {
          ...previous,
          windows: patched.windows,
          windowOrder: patched.windowOrder,
          focusedWindowId: patched.focusedWindowId,
          contextStacksByWindow: patchTopContextFrame(previous.contextStacksByWindow, targetWindowId, {
            foundSetId: normalizedFoundSetId,
            recordId
          })
        };
      });
      return true;
    },
    refreshFoundSet: (foundSetId, input) => {
      const normalizedFoundSetId = foundSetId.trim();
      const current = state.foundSets[normalizedFoundSetId];
      if (!normalizedFoundSetId || !current) {
        return false;
      }
      const refreshed = refreshFoundSet({
        foundSet: current,
        recordIds: input.recordIds,
        totalCount: input.totalCount,
        preserveRecordId: input.preserveRecordId,
        now: nowWithFallback(now)
      });
      setState((previous) => {
        let nextState: RuntimeKernelState = {
          ...previous,
          foundSets: {
            ...previous.foundSets,
            [normalizedFoundSetId]: refreshed
          }
        };
        const nextRecordId = currentFoundSetRecordId(refreshed);
        const attachedWindowIds = previous.windowOrder.filter(
          (windowId) => previous.windows[windowId]?.foundSetId === normalizedFoundSetId
        );
        for (const windowId of attachedWindowIds) {
          const patched = patchWindow(
            {
              windows: nextState.windows,
              windowOrder: nextState.windowOrder,
              focusedWindowId: nextState.focusedWindowId
            },
            {
              windowId,
              recordId: nextRecordId
            }
          );
          nextState = {
            ...nextState,
            windows: patched.windows,
            windowOrder: patched.windowOrder,
            focusedWindowId: patched.focusedWindowId,
            contextStacksByWindow: patchTopContextFrame(nextState.contextStacksByWindow, windowId, {
              recordId: nextRecordId
            })
          };
        }
        return nextState;
      });
      return true;
    },
    navigateRecord: (target, input) => {
      const targetWindowId = resolveWindowId(input?.windowId);
      const targetWindow = state.windows[targetWindowId];
      const foundSetId = targetWindow?.foundSetId;
      if (!targetWindow || !foundSetId) {
        return undefined;
      }
      const foundSet = state.foundSets[foundSetId];
      if (!foundSet) {
        return undefined;
      }
      const nextFoundSet = goToFoundSetRecord(foundSet, target);
      const nextRecordId = currentFoundSetRecordId(nextFoundSet);
      setState((previous) => {
        const patched = patchWindow(
          {
            windows: previous.windows,
            windowOrder: previous.windowOrder,
            focusedWindowId: previous.focusedWindowId
          },
          {
            windowId: targetWindowId,
            recordId: nextRecordId,
            pushNavigation: false
          }
        );
        return {
          ...previous,
          foundSets: {
            ...previous.foundSets,
            [foundSetId]: nextFoundSet
          },
          windows: patched.windows,
          windowOrder: patched.windowOrder,
          focusedWindowId: patched.focusedWindowId,
          contextStacksByWindow: patchTopContextFrame(previous.contextStacksByWindow, targetWindowId, {
            foundSetId,
            recordId: nextRecordId
          })
        };
      });
      if (nextRecordId) {
        emitPluginHook("OnRecordLoad", {
          windowId: targetWindowId,
          foundSetId,
          recordId: nextRecordId,
          layoutName: targetWindow.layoutName,
          tableOccurrence: targetWindow.tableOccurrence
        });
      }
      return nextRecordId;
    },
    navigateLayout: (layoutName, input) => {
      const normalizedLayout = layoutName.trim();
      if (!normalizedLayout) {
        return false;
      }
      const targetWindowId = resolveWindowId(input?.windowId);
      if (!isWindowKnown(state, targetWindowId)) {
        return false;
      }
      setState((previous) => {
        const currentWindow = previous.windows[targetWindowId];
        const tableOccurrence = input?.tableOccurrence?.trim() || currentWindow.tableOccurrence;
        const mode = input?.mode ?? currentWindow.mode;
        const foundSetId = input?.foundSetId ?? currentWindow.foundSetId;
        const foundSetRecordId =
          input?.recordId ??
          (foundSetId && previous.foundSets[foundSetId]
            ? currentFoundSetRecordId(previous.foundSets[foundSetId])
            : currentWindow.recordId);
        const patched = patchWindow(
          {
            windows: previous.windows,
            windowOrder: previous.windowOrder,
            focusedWindowId: previous.focusedWindowId
          },
          {
            windowId: targetWindowId,
            layoutName: normalizedLayout,
            tableOccurrence,
            mode,
            foundSetId,
            recordId: foundSetRecordId,
            pushNavigation: input?.pushNavigation ?? true,
            now: nowWithFallback(now)
          }
        );
        const nextStacks = pushContextFrame(previous.contextStacksByWindow, {
          reason: "layoutNavigation",
          windowId: targetWindowId,
          layoutName: normalizedLayout,
          tableOccurrence,
          foundSetId,
          recordId: foundSetRecordId
        });
        return {
          ...previous,
          windows: patched.windows,
          windowOrder: patched.windowOrder,
          focusedWindowId: patched.focusedWindowId,
          contextStacksByWindow: nextStacks
        };
      });
      emitPluginHook("OnLayoutEnter", {
        windowId: targetWindowId,
        layoutName: normalizedLayout,
        tableOccurrence: input?.tableOccurrence?.trim() || state.windows[targetWindowId]?.tableOccurrence || ""
      });
      return true;
    },
    enterMode: (mode, input) => {
      const targetWindowId = resolveWindowId(input?.windowId);
      if (!isWindowKnown(state, targetWindowId)) {
        return false;
      }
      setState((previous) => {
        const patched = patchWindow(
          {
            windows: previous.windows,
            windowOrder: previous.windowOrder,
            focusedWindowId: previous.focusedWindowId
          },
          {
            windowId: targetWindowId,
            mode,
            pushNavigation: input?.pushNavigation ?? true,
            now: nowWithFallback(now)
          }
        );
        return {
          ...previous,
          windows: patched.windows,
          windowOrder: patched.windowOrder,
          focusedWindowId: patched.focusedWindowId
        };
      });
      return true;
    },
    openWindow: (input) => {
      if (!featureFlags.multiWindowEnabled && (input.type ?? "card") !== "main") {
        return state.focusedWindowId;
      }
      const targetType = input.type ?? "card";
      const parentWindowId = input.parentWindowId?.trim() || state.focusedWindowId;
      const windowManager: WindowManagerState = {
        windows: state.windows,
        windowOrder: state.windowOrder,
        focusedWindowId: state.focusedWindowId
      };
      const nextWindowState = openWindowState(windowManager, {
        type: targetType,
        title: input.title,
        parentWindowId,
        layoutName: input.layoutName,
        tableOccurrence: input.tableOccurrence,
        mode: input.mode ?? "browse",
        foundSetId: input.foundSetId,
        recordId: input.recordId,
        now: nowWithFallback(now)
      });
      const createdWindowId = nextWindowState.focusedWindowId;
      setState((previous) => {
        const nextStacks = pushContextFrame(previous.contextStacksByWindow, {
          reason: targetType === "card" ? "openCardWindow" : "openWindow",
          windowId: createdWindowId,
          layoutName: input.layoutName,
          tableOccurrence: input.tableOccurrence,
          foundSetId: input.foundSetId,
          recordId: input.recordId
        });
        return {
          ...previous,
          windows: nextWindowState.windows,
          windowOrder: nextWindowState.windowOrder,
          focusedWindowId: nextWindowState.focusedWindowId,
          contextStacksByWindow: nextStacks
        };
      });
      return createdWindowId;
    },
    closeWindow: (windowId) => {
      const normalized = windowId.trim();
      if (!normalized || normalized === "main" || !state.windows[normalized]) {
        return false;
      }
      setState((previous) => {
        const windowManager: WindowManagerState = {
          windows: previous.windows,
          windowOrder: previous.windowOrder,
          focusedWindowId: previous.focusedWindowId
        };
        const closed = closeWindowState(windowManager, normalized);
        const nextStacks: ContextStacksByWindow = {};
        for (const [candidateWindowId, frames] of Object.entries(previous.contextStacksByWindow)) {
          if (candidateWindowId !== normalized) {
            nextStacks[candidateWindowId] = frames;
          }
        }
        return {
          ...previous,
          windows: closed.windows,
          windowOrder: closed.windowOrder,
          focusedWindowId: closed.focusedWindowId,
          contextStacksByWindow: nextStacks
        };
      });
      return true;
    },
    focusWindow: (windowId) => {
      const normalized = windowId.trim();
      if (!normalized || !state.windows[normalized]) {
        return false;
      }
      setState((previous) => {
        const focused = focusWindowState(
          {
            windows: previous.windows,
            windowOrder: previous.windowOrder,
            focusedWindowId: previous.focusedWindowId
          },
          normalized
        );
        return {
          ...previous,
          windows: focused.windows,
          windowOrder: focused.windowOrder,
          focusedWindowId: focused.focusedWindowId
        };
      });
      return true;
    },
    setRelationships: (relationships) => {
      setState((previous) => ({
        ...previous,
        relationships: [...relationships]
      }));
    },
    setScripts: (scriptsByName) => {
      setState((previous) => ({
        ...previous,
        scriptsByName: normalizeScriptsByName(scriptsByName)
      }));
    },
    pushContext: (input) => {
      setState((previous) => ({
        ...previous,
        contextStacksByWindow: pushContextFrame(previous.contextStacksByWindow, input)
      }));
    },
    popContext: (windowId) => {
      const targetWindowId = resolveWindowId(windowId);
      setState((previous) => ({
        ...previous,
        contextStacksByWindow: popContextFrame(previous.contextStacksByWindow, targetWindowId)
      }));
    },
    resolveFieldRef: (fieldRef, input) => {
      const targetWindowId = resolveWindowId(input?.windowId);
      return resolveFieldReference(
        fieldRef,
        state.contextStacksByWindow,
        targetWindowId,
        input?.fallbackTableOccurrence
      );
    },
    setVariable: (name, value, frameId) => {
      setState((previous) => ({
        ...previous,
        variables: setVariable(previous.variables, {
          name,
          value,
          frameId
        })
      }));
    },
    getVariable: (name, frameId) => {
      return getVariable(state.variables, {
        name,
        frameId
      });
    },
    clearGlobals: () => {
      setState((previous) => ({
        ...previous,
        variables: clearAllGlobals(previous.variables)
      }));
    },
    runScript: async (input) => {
      if (!featureFlags.scriptsEngineEnabled) {
        const startedAt = nowWithFallback(now);
        const disabledState: ScriptEngineRunState = {
          runId: `run-disabled-${startedAt.toString(36)}`,
          status: "failed",
          startedAt,
          completedAt: startedAt,
          callStack: [],
          lastError: 1205,
          lastMessage: "Script engine disabled by feature flag",
          errorCapture: false,
          stepTrace: [],
          transaction: {
            id: "txn-none",
            status: "idle",
            startedAt,
            operationCount: 0,
            lastError: 0
          },
          result: {
            ok: false,
            lastError: 1205,
            lastMessage: "Script engine disabled by feature flag"
          }
        };
        setState((previous) => ({
          ...previous,
          activeScriptRun: disabledState,
          scriptHistory: [...previous.scriptHistory, disabledState].slice(-80),
          activeTransaction: undefined
        }));
        return disabledState;
      }

      emitPluginHook("OnScriptStart", {
        scriptName: input.scriptName,
        parameter: input.parameter,
        windowId: state.focusedWindowId
      });

      let previousTransactionStatus = state.activeTransaction?.status ?? "idle";

      const adapter: ScriptEngineAdapter = {
        resolveCurrentContext: () => {
          const currentWindowId = state.focusedWindowId;
          return currentContextFrame(state.contextStacksByWindow, currentWindowId);
        },
        resolveFieldValue: async (fieldName) => {
          const context = currentContextFrame(state.contextStacksByWindow, state.focusedWindowId);
          if (runtimeActions.resolveFieldValue) {
            return runtimeActions.resolveFieldValue(fieldName, context);
          }
          return "";
        },
        actions: {
          ...runtimeActions,
          goToLayout: async (layoutName) => {
            const handled = kernel.navigateLayout(layoutName, {
              pushNavigation: true
            });
            if (!handled) {
              await runtimeActions.goToLayout(layoutName);
            }
          },
          goToRecord: async (target) => {
            const recordId = kernel.navigateRecord(target, {});
            if (!recordId) {
              await runtimeActions.goToRecord(target);
            }
          },
          enterMode: async (mode) => {
            const handled = kernel.enterMode(mode, {
              pushNavigation: true
            });
            if (!handled) {
              await runtimeActions.enterMode(mode);
            }
          },
          performFind: runtimeActions.performFind,
          showCustomDialog: runtimeActions.showCustomDialog,
          pauseScript: runtimeActions.pauseScript,
          setField: runtimeActions.setField,
          commit: async () => {
            const result = await runtimeActions.commit();
            if (result.ok) {
              const currentWindow = state.windows[state.focusedWindowId];
              emitPluginHook("OnRecordCommit", {
                windowId: state.focusedWindowId,
                layoutName: currentWindow?.layoutName,
                tableOccurrence: currentWindow?.tableOccurrence,
                recordId: currentWindow?.recordId
              });
            }
            return result;
          },
          revert: runtimeActions.revert,
          newRecord: async () => {
            const result = await runtimeActions.newRecord();
            if (result.ok && result.recordId) {
              const currentWindow = state.windows[state.focusedWindowId];
              const foundSetId = currentWindow?.foundSetId;
              if (foundSetId && state.foundSets[foundSetId]) {
                const nextFoundSet = attachFoundSetRecord(state.foundSets[foundSetId], result.recordId, true);
                setState((previous) => ({
                  ...previous,
                  foundSets: {
                    ...previous.foundSets,
                    [foundSetId]: nextFoundSet
                  },
                  windows: {
                    ...previous.windows,
                    [state.focusedWindowId]: {
                      ...previous.windows[state.focusedWindowId],
                      recordId: result.recordId
                    }
                  }
                }));
              }
            }
            return result;
          },
          deleteRecord: runtimeActions.deleteRecord,
          openRecord: runtimeActions.openRecord,
          refreshWindow: runtimeActions.refreshWindow,
          goToRelatedRecord: runtimeActions.goToRelatedRecord,
          showAllRecords: runtimeActions.showAllRecords,
          omitRecord: runtimeActions.omitRecord,
          showOmittedOnly: runtimeActions.showOmittedOnly,
          replaceFieldContents: runtimeActions.replaceFieldContents,
          beginTransaction: runtimeActions.beginTransaction,
          commitTransaction: runtimeActions.commitTransaction,
          revertTransaction: runtimeActions.revertTransaction,
          performScriptOnServer: runtimeActions.performScriptOnServer
        },
        variables: {
          set: (name, value, frameId) => {
            setState((previous) => ({
              ...previous,
              variables: setVariable(previous.variables, {
                name,
                value,
                frameId
              })
            }));
          },
          get: (name, frameId) => {
            return getVariable(state.variables, {
              name,
              frameId
            });
          },
          clearFrame: (frameId) => {
            setState((previous) => ({
              ...previous,
              variables: clearLocalsForFrame(previous.variables, frameId)
            }));
          }
        },
        onState: (nextRunState) => {
          setState((previous) => ({
            ...previous,
            activeScriptRun: nextRunState,
            activeTransaction: nextRunState.transaction.status === "active" ? nextRunState.transaction : undefined
          }));
        },
        onTransactionState: (nextTransactionState) => {
          if (previousTransactionStatus !== "active" && nextTransactionState.status === "active") {
            emitPluginHook("OnTransactionStart", {
              transactionId: nextTransactionState.id,
              operationCount: nextTransactionState.operationCount
            });
          }
          if (previousTransactionStatus === "active" && nextTransactionState.status !== "active") {
            emitPluginHook("OnTransactionEnd", {
              transactionId: nextTransactionState.id,
              status: nextTransactionState.status,
              lastError: nextTransactionState.lastError,
              lastMessage: nextTransactionState.lastMessage
            });
          }
          previousTransactionStatus = nextTransactionState.status;
          setState((previous) => ({
            ...previous,
            activeTransaction: nextTransactionState.status === "active" ? nextTransactionState : undefined,
            transactionHistory:
              nextTransactionState.status === "active"
                ? previous.transactionHistory
                : [...previous.transactionHistory, nextTransactionState].slice(-80)
          }));
        },
        stepMode: Boolean(runtimeActions.scriptStepMode),
        awaitStep: runtimeActions.awaitScriptStep,
        implicitTransaction: Boolean(runtimeActions.implicitTransaction),
        executeCustomStep: async (customStepInput) => {
          if (!pluginManager) {
            return {
              handled: false
            };
          }
          return pluginManager.executeScriptStep(customStepInput);
        }
      };

      const runState = await executeScript(
        {
          scriptName: input.scriptName,
          parameter: input.parameter,
          scriptsByName: state.scriptsByName
        },
        adapter
      );
      setState((previous) => ({
        ...previous,
        activeScriptRun: runState,
        scriptHistory: [...previous.scriptHistory, runState].slice(-80),
        activeTransaction: runState.transaction.status === "active" ? runState.transaction : undefined,
        transactionHistory:
          runState.transaction.status === "idle" || runState.transaction.status === "active"
            ? previous.transactionHistory
            : [...previous.transactionHistory, runState.transaction].slice(-80)
      }));
      emitPluginHook("OnScriptEnd", {
        scriptName: input.scriptName,
        status: runState.status,
        lastError: runState.lastError,
        lastMessage: runState.lastMessage
      });
      return runState;
    },
    cancelScript: () => {
      if (!state.activeScriptRun || state.activeScriptRun.status !== "running") {
        return false;
      }
      setState((previous) => ({
        ...previous,
        activeScriptRun: {
          ...previous.activeScriptRun!,
          status: "cancelled",
          completedAt: nowWithFallback(now)
        }
      }));
      return true;
    }
  };

  pluginManager?.setRuntimeKernelSnapshotProvider(() => snapshotFromState(state));
  return kernel;
}

export type { RuntimeKernel, RuntimeKernelFeatureFlags, RuntimeKernelOptions };

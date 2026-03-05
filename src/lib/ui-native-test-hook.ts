type UiNativeMode = "layout" | "browse";

export type UiNativeDebugState = {
  mode: UiNativeMode;
  layoutId: string;
  workspaceId?: string;
  recordId?: string;
  lastCommandId?: string;
  lastError?: string;
  updatedAt: string;
};

type UiNativeTestBridge = {
  getState: () => UiNativeDebugState;
  setLastAction: (commandId: string, errorMessage?: string) => UiNativeDebugState;
  setRecordId: (recordId?: string) => UiNativeDebugState;
  reset: () => UiNativeDebugState;
};

declare global {
  interface Window {
    __FMWEB_NATIVE_UI_TEST__?: UiNativeTestBridge;
  }
}

function buildState(mode: UiNativeMode, layoutId: string, workspaceId?: string): UiNativeDebugState {
  return {
    mode,
    layoutId,
    workspaceId,
    updatedAt: new Date().toISOString()
  };
}

export function installUiNativeTestHook(mode: UiNativeMode, layoutId: string, workspaceId?: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get("uiTest") !== "1") {
    if (window.__FMWEB_NATIVE_UI_TEST__) {
      delete window.__FMWEB_NATIVE_UI_TEST__;
    }
    return;
  }

  let state = buildState(mode, layoutId, workspaceId);

  const sync = (): UiNativeDebugState => ({
    ...state,
    updatedAt: new Date().toISOString()
  });

  window.__FMWEB_NATIVE_UI_TEST__ = {
    getState: () => state,
    setLastAction: (commandId: string, errorMessage?: string) => {
      state = {
        ...sync(),
        lastCommandId: commandId,
        lastError: errorMessage
      };
      return state;
    },
    setRecordId: (recordId?: string) => {
      state = {
        ...sync(),
        recordId
      };
      return state;
    },
    reset: () => {
      state = buildState(mode, layoutId, workspaceId);
      return state;
    }
  };
}


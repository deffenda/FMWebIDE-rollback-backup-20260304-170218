import type { RuntimeVariableStoreState, RuntimeVariableValue } from "./types";

export function createVariableStoreState(): RuntimeVariableStoreState {
  return {
    globals: {},
    localsByFrameId: {}
  };
}

function normalizeVariableName(name: string): string {
  return name.trim();
}

export function setVariable(
  state: RuntimeVariableStoreState,
  input: {
    name: string;
    value: RuntimeVariableValue;
    frameId?: string;
  }
): RuntimeVariableStoreState {
  const normalizedName = normalizeVariableName(input.name);
  if (!normalizedName) {
    return state;
  }

  if (normalizedName.startsWith("$$")) {
    return {
      ...state,
      globals: {
        ...state.globals,
        [normalizedName]: input.value
      }
    };
  }

  if (normalizedName.startsWith("$")) {
    const frameId = input.frameId?.trim();
    if (!frameId) {
      return state;
    }
    const currentLocals = state.localsByFrameId[frameId] ?? {};
    return {
      ...state,
      localsByFrameId: {
        ...state.localsByFrameId,
        [frameId]: {
          ...currentLocals,
          [normalizedName]: input.value
        }
      }
    };
  }

  return state;
}

export function getVariable(
  state: RuntimeVariableStoreState,
  input: {
    name: string;
    frameId?: string;
  }
): RuntimeVariableValue | undefined {
  const normalizedName = normalizeVariableName(input.name);
  if (!normalizedName) {
    return undefined;
  }

  if (normalizedName.startsWith("$$")) {
    return state.globals[normalizedName];
  }

  if (normalizedName.startsWith("$")) {
    const frameId = input.frameId?.trim();
    if (!frameId) {
      return undefined;
    }
    return state.localsByFrameId[frameId]?.[normalizedName];
  }

  return undefined;
}

export function clearLocalsForFrame(state: RuntimeVariableStoreState, frameId: string): RuntimeVariableStoreState {
  const normalized = frameId.trim();
  if (!normalized || !state.localsByFrameId[normalized]) {
    return state;
  }

  const nextLocals: Record<string, Record<string, RuntimeVariableValue>> = {};
  for (const [key, value] of Object.entries(state.localsByFrameId)) {
    if (key !== normalized) {
      nextLocals[key] = value;
    }
  }

  return {
    ...state,
    localsByFrameId: nextLocals
  };
}

export function clearAllGlobals(state: RuntimeVariableStoreState): RuntimeVariableStoreState {
  if (Object.keys(state.globals).length === 0) {
    return state;
  }
  return {
    ...state,
    globals: {}
  };
}

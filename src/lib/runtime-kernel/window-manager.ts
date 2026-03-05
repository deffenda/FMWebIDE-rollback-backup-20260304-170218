import type { RuntimeMode, RuntimeNavigationEntry, RuntimeWindowState, WindowType } from "./types";

type OpenWindowInput = {
  id?: string;
  type?: WindowType;
  title?: string;
  parentWindowId?: string;
  layoutName: string;
  tableOccurrence: string;
  mode?: RuntimeMode;
  foundSetId?: string;
  recordId?: string;
  now?: number;
};

export type WindowManagerState = {
  windows: Record<string, RuntimeWindowState>;
  windowOrder: string[];
  focusedWindowId: string;
};

function nextWindowId(prefix: WindowType): string {
  return `${prefix}-window-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createNavigationEntry(input: {
  layoutName: string;
  mode: RuntimeMode;
  foundSetId?: string;
  recordId?: string;
  now?: number;
}): RuntimeNavigationEntry {
  return {
    layoutName: input.layoutName,
    mode: input.mode,
    foundSetId: input.foundSetId,
    recordId: input.recordId,
    timestamp: Number(input.now ?? Date.now())
  };
}

export function createWindowManagerState(input: {
  layoutName: string;
  tableOccurrence: string;
  mode?: RuntimeMode;
  now?: number;
}): WindowManagerState {
  const mainWindowId = "main";
  const mode = input.mode ?? "browse";
  const main: RuntimeWindowState = {
    id: mainWindowId,
    type: "main",
    title: input.layoutName,
    layoutName: input.layoutName,
    tableOccurrence: input.tableOccurrence,
    mode,
    navigationStack: [
      createNavigationEntry({
        layoutName: input.layoutName,
        mode,
        now: input.now
      })
    ]
  };

  return {
    windows: {
      [mainWindowId]: main
    },
    windowOrder: [mainWindowId],
    focusedWindowId: mainWindowId
  };
}

export function openWindow(state: WindowManagerState, input: OpenWindowInput): WindowManagerState {
  const windowType = input.type ?? "card";
  const id = input.id?.trim() || nextWindowId(windowType);
  const mode = input.mode ?? "browse";
  const existing = state.windows[id];
  const nextWindow: RuntimeWindowState = {
    id,
    type: windowType,
    title: input.title?.trim() || input.layoutName,
    parentWindowId: input.parentWindowId,
    layoutName: input.layoutName,
    tableOccurrence: input.tableOccurrence,
    mode,
    foundSetId: input.foundSetId,
    recordId: input.recordId,
    navigationStack: existing?.navigationStack?.length
      ? [...existing.navigationStack]
      : [
          createNavigationEntry({
            layoutName: input.layoutName,
            mode,
            foundSetId: input.foundSetId,
            recordId: input.recordId,
            now: input.now
          })
        ]
  };

  const nextOrder = state.windowOrder.includes(id) ? [...state.windowOrder] : [...state.windowOrder, id];
  return {
    windows: {
      ...state.windows,
      [id]: nextWindow
    },
    windowOrder: nextOrder,
    focusedWindowId: id
  };
}

export function focusWindow(state: WindowManagerState, windowId: string): WindowManagerState {
  const normalized = windowId.trim();
  if (!normalized || !state.windows[normalized] || state.focusedWindowId === normalized) {
    return state;
  }
  return {
    ...state,
    focusedWindowId: normalized
  };
}

export function closeWindow(state: WindowManagerState, windowId: string): WindowManagerState {
  const normalized = windowId.trim();
  if (!normalized || normalized === "main" || !state.windows[normalized]) {
    return state;
  }

  const nextWindows: Record<string, RuntimeWindowState> = {};
  for (const [key, value] of Object.entries(state.windows)) {
    if (key !== normalized) {
      nextWindows[key] = value;
    }
  }
  const nextOrder = state.windowOrder.filter((entry) => entry !== normalized);

  let focused = state.focusedWindowId;
  if (focused === normalized || !nextWindows[focused]) {
    focused = nextOrder[nextOrder.length - 1] ?? "main";
  }

  return {
    windows: nextWindows,
    windowOrder: nextOrder,
    focusedWindowId: focused
  };
}

export function patchWindow(
  state: WindowManagerState,
  input: {
    windowId: string;
    layoutName?: string;
    tableOccurrence?: string;
    mode?: RuntimeMode;
    foundSetId?: string;
    recordId?: string;
    pushNavigation?: boolean;
    now?: number;
  }
): WindowManagerState {
  const normalized = input.windowId.trim();
  const current = state.windows[normalized];
  if (!normalized || !current) {
    return state;
  }

  const next: RuntimeWindowState = {
    ...current,
    layoutName: input.layoutName ?? current.layoutName,
    tableOccurrence: input.tableOccurrence ?? current.tableOccurrence,
    mode: input.mode ?? current.mode,
    foundSetId: input.foundSetId ?? current.foundSetId,
    recordId: input.recordId ?? current.recordId
  };

  if (input.pushNavigation) {
    next.navigationStack = [
      ...current.navigationStack,
      createNavigationEntry({
        layoutName: next.layoutName,
        mode: next.mode,
        foundSetId: next.foundSetId,
        recordId: next.recordId,
        now: input.now
      })
    ].slice(-120);
  }

  return {
    ...state,
    windows: {
      ...state.windows,
      [normalized]: next
    }
  };
}

export type MenuCommandDispatchEvent = {
  commandId: string;
  timestamp: number;
  source: "layout" | "browse";
};

type MenuCommandListener = (event: MenuCommandDispatchEvent) => void;

const history: MenuCommandDispatchEvent[] = [];
const listeners = new Set<MenuCommandListener>();

function getWindowTarget(): (Window & {
  __fmMenuCommandBus?: {
    getHistory: () => MenuCommandDispatchEvent[];
    getLast: () => MenuCommandDispatchEvent | null;
    clear: () => void;
  };
}) | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window as Window & {
    __fmMenuCommandBus?: {
      getHistory: () => MenuCommandDispatchEvent[];
      getLast: () => MenuCommandDispatchEvent | null;
      clear: () => void;
    };
  };
}

function ensureWindowBridge(): void {
  const target = getWindowTarget();
  if (!target || target.__fmMenuCommandBus) {
    return;
  }
  target.__fmMenuCommandBus = {
    getHistory: () => [...history],
    getLast: () => history[history.length - 1] ?? null,
    clear: () => {
      history.length = 0;
    }
  };
}

export function dispatchMenuCommand(commandId: string, source: "layout" | "browse"): void {
  const event: MenuCommandDispatchEvent = {
    commandId,
    source,
    timestamp: Date.now()
  };
  history.push(event);
  if (history.length > 200) {
    history.splice(0, history.length - 200);
  }
  ensureWindowBridge();
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // Ignore listener failures to keep dispatch side-effect free.
    }
  }
}

export function subscribeMenuCommand(listener: MenuCommandListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getMenuCommandHistory(): MenuCommandDispatchEvent[] {
  return [...history];
}

export function clearMenuCommandHistory(): void {
  history.length = 0;
}

ensureWindowBridge();

export type LayoutInteractionType =
  | "objectEnter"
  | "objectExit"
  | "objectClick"
  | "fieldCommit"
  | "buttonClick"
  | "portalRowClick";

export type LayoutInteractionEvent = {
  objectId: string;
  type: LayoutInteractionType;
  timestamp: number;
  detail?: Record<string, unknown>;
};

export type LayoutInteractionHandler = (event: LayoutInteractionEvent) => void;

export type LayoutInteractionRouter = {
  dispatch: (event: LayoutInteractionEvent) => void;
  subscribe: (objectId: string, handler: LayoutInteractionHandler) => () => void;
  getLastEvent: () => LayoutInteractionEvent | null;
};

export function createLayoutInteractionRouter(): LayoutInteractionRouter {
  const handlersByObjectId = new Map<string, Set<LayoutInteractionHandler>>();
  let lastEvent: LayoutInteractionEvent | null = null;

  const dispatch = (event: LayoutInteractionEvent): void => {
    lastEvent = event;
    const handlers = handlersByObjectId.get(event.objectId);
    if (!handlers || handlers.size === 0) {
      return;
    }
    for (const handler of handlers) {
      try {
        handler(event);
      } catch {
        // Isolation boundary: handler faults cannot break runtime interaction routing.
      }
    }
  };

  const subscribe = (objectId: string, handler: LayoutInteractionHandler): (() => void) => {
    const token = String(objectId ?? "").trim();
    if (!token) {
      return () => {};
    }
    let handlers = handlersByObjectId.get(token);
    if (!handlers) {
      handlers = new Set();
      handlersByObjectId.set(token, handlers);
    }
    handlers.add(handler);
    return () => {
      const current = handlersByObjectId.get(token);
      if (!current) {
        return;
      }
      current.delete(handler);
      if (current.size === 0) {
        handlersByObjectId.delete(token);
      }
    };
  };

  return {
    dispatch,
    subscribe,
    getLastEvent: () => lastEvent
  };
}

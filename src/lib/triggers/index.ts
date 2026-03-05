export type RuntimeTriggerEvent = {
  name: string;
  timestamp: number;
  payload?: Record<string, unknown>;
  outcome?: "info" | "allowed" | "vetoed";
  request?: boolean;
};

export type RuntimeTriggerHandler = (
  event: RuntimeTriggerEvent
) => void | boolean | Promise<void | boolean>;

export type TriggerBus = {
  emit: (event: Omit<RuntimeTriggerEvent, "timestamp"> & { timestamp?: number }) => RuntimeTriggerEvent;
  emitRequest: (
    event: Omit<RuntimeTriggerEvent, "timestamp" | "request" | "outcome"> & { timestamp?: number }
  ) => Promise<{ allowed: boolean; event: RuntimeTriggerEvent }>;
  on: (handler: RuntimeTriggerHandler) => () => void;
  getHistory: () => RuntimeTriggerEvent[];
  clearHistory: () => void;
};

export function createTriggerBus(): TriggerBus {
  const handlers = new Set<RuntimeTriggerHandler>();
  const history: RuntimeTriggerEvent[] = [];
  return {
    emit(event) {
      const normalized: RuntimeTriggerEvent = {
        name: String(event.name ?? "").trim() || "unknown",
        timestamp: event.timestamp ?? Date.now(),
        payload: event.payload
      };
      history.push(normalized);
      if (history.length > 200) {
        history.splice(0, history.length - 200);
      }
      for (const handler of handlers) {
        handler(normalized);
      }
      return normalized;
    },
    on(handler) {
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    },
    async emitRequest(event) {
      const normalized: RuntimeTriggerEvent = {
        name: String(event.name ?? "").trim() || "unknown",
        timestamp: event.timestamp ?? Date.now(),
        payload: event.payload,
        request: true,
        outcome: "allowed"
      };
      let allowed = true;
      for (const handler of handlers) {
        const result = await handler(normalized);
        if (result === false) {
          allowed = false;
        }
      }
      normalized.outcome = allowed ? "allowed" : "vetoed";
      history.push(normalized);
      if (history.length > 200) {
        history.splice(0, history.length - 200);
      }
      return {
        allowed,
        event: normalized
      };
    },
    getHistory() {
      return [...history];
    },
    clearHistory() {
      history.length = 0;
    }
  };
}

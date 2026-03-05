type ValueListCacheKey = string;

export type ValueListCacheEntry<T> = {
  key: ValueListCacheKey;
  createdAt: number;
  expiresAt: number;
  payload: T;
};

export type ValueListCacheState = {
  size: number;
  keys: string[];
};

export type ValueListCache<T> = {
  get: (workspaceId: string, scope: string, tableOccurrence: string | undefined) => T | null;
  set: (
    workspaceId: string,
    scope: string,
    tableOccurrence: string | undefined,
    payload: T,
    ttlMs?: number
  ) => void;
  clear: () => void;
  getState: () => ValueListCacheState;
};

function keyFor(workspaceId: string, scope: string, tableOccurrence: string | undefined): ValueListCacheKey {
  const workspaceToken = workspaceId.trim().toLowerCase() || "default";
  const scopeToken = scope.trim().toLowerCase() || "database";
  const tableToken = String(tableOccurrence ?? "").trim().toLowerCase();
  return `${workspaceToken}::${scopeToken}::${tableToken}`;
}

export function createValueListCache<T>(defaultTtlMs = 30_000): ValueListCache<T> {
  const byKey = new Map<ValueListCacheKey, ValueListCacheEntry<T>>();
  return {
    get(workspaceId, scope, tableOccurrence) {
      const key = keyFor(workspaceId, scope, tableOccurrence);
      const entry = byKey.get(key);
      if (!entry) {
        return null;
      }
      if (entry.expiresAt <= Date.now()) {
        byKey.delete(key);
        return null;
      }
      return entry.payload;
    },
    set(workspaceId, scope, tableOccurrence, payload, ttlMs) {
      const key = keyFor(workspaceId, scope, tableOccurrence);
      const now = Date.now();
      byKey.set(key, {
        key,
        createdAt: now,
        expiresAt: now + Math.max(1, Math.round(ttlMs ?? defaultTtlMs)),
        payload
      });
    },
    clear() {
      byKey.clear();
    },
    getState() {
      const now = Date.now();
      for (const [key, entry] of byKey.entries()) {
        if (entry.expiresAt <= now) {
          byKey.delete(key);
        }
      }
      return {
        size: byKey.size,
        keys: [...byKey.keys()].sort((a, b) => a.localeCompare(b))
      };
    }
  };
}

type RequestCacheEntry<T> = {
  value: T;
  expiresAt: number;
  lastAccessAt: number;
};

export type RequestCacheStats = {
  size: number;
  inflight: number;
  hits: number;
  misses: number;
  evictions: number;
};

export type RequestCache<T> = {
  get: (key: string) => T | null;
  set: (key: string, value: T, ttlMs?: number) => void;
  getOrSet: (key: string, producer: () => Promise<T>, ttlMs?: number) => Promise<T>;
  clear: () => void;
  deleteMatching: (predicate: (key: string) => boolean) => number;
  getStats: () => RequestCacheStats;
};

export type CreateRequestCacheOptions = {
  ttlMs?: number;
  maxEntries?: number;
  now?: () => number;
};

function normalizeKey(raw: string): string {
  return String(raw ?? "").trim();
}

export function createRequestCache<T>(options?: CreateRequestCacheOptions): RequestCache<T> {
  const ttlMs = Math.max(10, Math.round(Number(options?.ttlMs ?? 3_000)));
  const maxEntries = Math.max(1, Math.round(Number(options?.maxEntries ?? 256)));
  const now = options?.now ?? Date.now;
  const entries = new Map<string, RequestCacheEntry<T>>();
  const inflight = new Map<string, Promise<T>>();
  const stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };

  const pruneExpired = () => {
    const ts = now();
    for (const [key, entry] of entries.entries()) {
      if (entry.expiresAt <= ts) {
        entries.delete(key);
      }
    }
  };

  const evictIfNeeded = () => {
    if (entries.size <= maxEntries) {
      return;
    }
    const list = [...entries.entries()].sort((left, right) => left[1].lastAccessAt - right[1].lastAccessAt);
    while (entries.size > maxEntries && list.length > 0) {
      const [oldestKey] = list.shift()!;
      if (entries.delete(oldestKey)) {
        stats.evictions += 1;
      }
    }
  };

  return {
    get(key) {
      const normalized = normalizeKey(key);
      if (!normalized) {
        return null;
      }
      pruneExpired();
      const entry = entries.get(normalized);
      if (!entry) {
        stats.misses += 1;
        return null;
      }
      entry.lastAccessAt = now();
      stats.hits += 1;
      return entry.value;
    },
    set(key, value, customTtlMs) {
      const normalized = normalizeKey(key);
      if (!normalized) {
        return;
      }
      const ttl = Math.max(10, Math.round(Number(customTtlMs ?? ttlMs)));
      const ts = now();
      entries.set(normalized, {
        value,
        expiresAt: ts + ttl,
        lastAccessAt: ts
      });
      evictIfNeeded();
    },
    async getOrSet(key, producer, customTtlMs) {
      const normalized = normalizeKey(key);
      if (!normalized) {
        return producer();
      }

      const cached = this.get(normalized);
      if (cached != null) {
        return cached;
      }

      const existingPromise = inflight.get(normalized);
      if (existingPromise) {
        return existingPromise;
      }

      const task = producer()
        .then((value) => {
          this.set(normalized, value, customTtlMs);
          inflight.delete(normalized);
          return value;
        })
        .catch((error) => {
          inflight.delete(normalized);
          throw error;
        });
      inflight.set(normalized, task);
      return task;
    },
    clear() {
      entries.clear();
      inflight.clear();
    },
    deleteMatching(predicate) {
      let removed = 0;
      for (const key of entries.keys()) {
        if (predicate(key)) {
          entries.delete(key);
          removed += 1;
        }
      }
      return removed;
    },
    getStats() {
      pruneExpired();
      return {
        size: entries.size,
        inflight: inflight.size,
        hits: stats.hits,
        misses: stats.misses,
        evictions: stats.evictions
      };
    }
  };
}


type RateBucket = {
  windowStart: number;
  count: number;
};

const buckets = new Map<string, RateBucket>();

function now(): number {
  return Date.now();
}

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): {
  ok: true;
  remaining: number;
} | {
  ok: false;
  retryAfterSeconds: number;
} {
  const current = now();
  const existing = buckets.get(key);
  if (!existing || current - existing.windowStart >= windowMs) {
    buckets.set(key, {
      windowStart: current,
      count: 1
    });
    return {
      ok: true,
      remaining: Math.max(0, maxRequests - 1)
    };
  }

  if (existing.count >= maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.windowStart + windowMs - current) / 1000));
    return {
      ok: false,
      retryAfterSeconds
    };
  }

  existing.count += 1;
  buckets.set(key, existing);
  return {
    ok: true,
    remaining: Math.max(0, maxRequests - existing.count)
  };
}

export function resetRateLimiterForTests(): void {
  buckets.clear();
}

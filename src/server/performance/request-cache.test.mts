import assert from "node:assert/strict";
import test from "node:test";
import { createRequestCache } from "./request-cache.ts";

test("request cache returns cached values and reports stats", () => {
  let tick = 1_000;
  const cache = createRequestCache<number>({
    ttlMs: 100,
    now: () => tick
  });

  assert.equal(cache.get("a"), null);
  cache.set("a", 10);
  assert.equal(cache.get("a"), 10);

  tick += 200;
  assert.equal(cache.get("a"), null);

  const stats = cache.getStats();
  assert.ok(stats.hits >= 1);
  assert.ok(stats.misses >= 2);
});

test("request cache coalesces inflight producers", async () => {
  const cache = createRequestCache<string>();
  let invocations = 0;
  const producer = async () => {
    invocations += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return "ok";
  };

  const [first, second] = await Promise.all([
    cache.getOrSet("same", producer),
    cache.getOrSet("same", producer)
  ]);

  assert.equal(first, "ok");
  assert.equal(second, "ok");
  assert.equal(invocations, 1);
});

test("request cache evicts least recently used entries", () => {
  let tick = 0;
  const cache = createRequestCache<number>({
    maxEntries: 2,
    now: () => ++tick
  });
  cache.set("a", 1);
  cache.set("b", 2);
  assert.equal(cache.get("a"), 1);
  cache.set("c", 3);

  // b should be evicted because a was recently accessed.
  assert.equal(cache.get("a"), 1);
  assert.equal(cache.get("b"), null);
  assert.equal(cache.get("c"), 3);
});


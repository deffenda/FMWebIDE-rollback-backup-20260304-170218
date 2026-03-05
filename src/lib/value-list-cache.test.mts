import assert from "node:assert/strict";
import test from "node:test";
import { createValueListCache } from "./value-list-cache.ts";

test("value-list cache stores and retrieves scoped entries", () => {
  const cache = createValueListCache<{ count: number }>(60_000);
  cache.set("assets", "database", undefined, { count: 3 });
  cache.set("assets", "layout", "Asset Details", { count: 7 });

  assert.deepEqual(cache.get("assets", "database", undefined), { count: 3 });
  assert.deepEqual(cache.get("assets", "layout", "Asset Details"), { count: 7 });
  assert.equal(cache.get("assets", "layout", "Vendors"), null);
  assert.equal(cache.getState().size, 2);
});

test("value-list cache expires stale entries", async () => {
  const cache = createValueListCache<{ count: number }>(5);
  cache.set("assets", "database", undefined, { count: 1 }, 5);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(cache.get("assets", "database", undefined), null);
  assert.equal(cache.getState().size, 0);
});

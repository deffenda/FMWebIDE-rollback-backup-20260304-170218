import assert from "node:assert/strict";
import test from "node:test";
import { createTriggerBus } from "./index.ts";

test("trigger bus emits events in order", () => {
  const bus = createTriggerBus();
  const seen: string[] = [];
  const unsubscribe = bus.on((event) => {
    seen.push(event.name);
  });
  bus.emit({ name: "OnLayoutEnter" });
  bus.emit({ name: "OnRecordLoad" });
  unsubscribe();
  bus.emit({ name: "OnObjectEnter" });

  assert.deepEqual(seen, ["OnLayoutEnter", "OnRecordLoad"]);
  assert.deepEqual(
    bus.getHistory().map((entry) => entry.name),
    ["OnLayoutEnter", "OnRecordLoad", "OnObjectEnter"]
  );
});

test("emitRequest supports veto outcomes", async () => {
  const bus = createTriggerBus();
  bus.on((event) => {
    if (event.name === "OnRecordCommitRequest") {
      return false;
    }
    return true;
  });
  const outcome = await bus.emitRequest({
    name: "OnRecordCommitRequest"
  });
  assert.equal(outcome.allowed, false);
  assert.equal(outcome.event.outcome, "vetoed");
  assert.equal(outcome.event.request, true);
});

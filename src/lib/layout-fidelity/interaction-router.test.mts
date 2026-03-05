import test from "node:test";
import assert from "node:assert/strict";

import { createLayoutInteractionRouter } from "./interaction-router.ts";

test("interaction router dispatches by object id", () => {
  const router = createLayoutInteractionRouter();
  const events: string[] = [];
  router.subscribe("obj-1", (event) => {
    events.push(`${event.objectId}:${event.type}`);
  });
  router.dispatch({
    objectId: "obj-1",
    type: "objectClick",
    timestamp: Date.now()
  });
  router.dispatch({
    objectId: "obj-2",
    type: "objectClick",
    timestamp: Date.now()
  });
  assert.deepEqual(events, ["obj-1:objectClick"]);
});

test("interaction router isolates handler failures", () => {
  const router = createLayoutInteractionRouter();
  let executed = false;
  router.subscribe("obj-1", () => {
    throw new Error("expected");
  });
  router.subscribe("obj-1", () => {
    executed = true;
  });
  router.dispatch({
    objectId: "obj-1",
    type: "objectEnter",
    timestamp: Date.now()
  });
  assert.equal(executed, true);
});

test("interaction router exposes last event snapshot", () => {
  const router = createLayoutInteractionRouter();
  assert.equal(router.getLastEvent(), null);
  const event = {
    objectId: "obj-9",
    type: "buttonClick" as const,
    timestamp: Date.now(),
    detail: {
      script: "Do Something"
    }
  };
  router.dispatch(event);
  assert.deepEqual(router.getLastEvent(), event);
});

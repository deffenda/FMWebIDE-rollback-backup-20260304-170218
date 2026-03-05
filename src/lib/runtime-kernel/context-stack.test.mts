import assert from "node:assert/strict";
import test from "node:test";
import {
  currentContextFrame,
  popContextFrame,
  pushContextFrame,
  resolveFieldReference
} from "./context-stack.ts";

test("context stack push/pop tracks active context per window", () => {
  let stacks = {};
  stacks = pushContextFrame(stacks, {
    reason: "initial",
    windowId: "main",
    layoutName: "Asset Details",
    tableOccurrence: "Assets",
    recordId: "100"
  });
  stacks = pushContextFrame(stacks, {
    reason: "portalRow",
    windowId: "main",
    layoutName: "Asset Details",
    tableOccurrence: "Assignments",
    recordId: "900",
    portal: {
      componentId: "portal-assigned",
      rowToken: "900"
    }
  });

  assert.equal(currentContextFrame(stacks, "main")?.tableOccurrence, "Assignments");
  stacks = popContextFrame(stacks, "main");
  assert.equal(currentContextFrame(stacks, "main")?.tableOccurrence, "Assets");
});

test("field reference resolution respects explicit and implicit TO context", () => {
  let stacks = {};
  stacks = pushContextFrame(stacks, {
    reason: "initial",
    windowId: "main",
    layoutName: "Asset Details",
    tableOccurrence: "Assets"
  });

  const explicit = resolveFieldReference("Assignments::Note", stacks, "main");
  assert.deepEqual(explicit, {
    tableOccurrence: "Assignments",
    fieldName: "Note"
  });

  const implicit = resolveFieldReference("Name", stacks, "main");
  assert.deepEqual(implicit, {
    tableOccurrence: "Assets",
    fieldName: "Name"
  });
});

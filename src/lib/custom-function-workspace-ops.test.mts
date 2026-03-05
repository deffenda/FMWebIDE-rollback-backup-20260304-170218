import assert from "node:assert/strict";
import test from "node:test";
import {
  createWorkspaceCustomFunctionEntry,
  duplicateWorkspaceCustomFunctionEntry,
  parseCustomFunctionParameters,
  resolveNextCustomFunctionName,
  type CustomFunctionWorkspaceEntry
} from "./custom-function-workspace-ops.ts";

const sample: CustomFunctionWorkspaceEntry[] = [
  {
    id: "cf-1",
    name: "UpperName",
    parameters: ["first", "last"],
    definition: "Upper ( first & \" \" & last )",
    source: "workspace"
  },
  {
    id: "cf-2",
    name: "UpperName Copy",
    parameters: ["value"],
    definition: "Upper ( value )",
    source: "ddr"
  }
];

test("parseCustomFunctionParameters supports semicolon/comma/newline lists with dedupe", () => {
  const parsed = parseCustomFunctionParameters("first ; second, third\nsecond ; fourth");
  assert.deepEqual(parsed, ["first", "second", "third", "fourth"]);
});

test("resolveNextCustomFunctionName appends copy suffix for collisions", () => {
  const result = resolveNextCustomFunctionName(
    ["UpperName", "UpperName Copy", "UpperName Copy 2"],
    "UpperName"
  );
  assert.equal(result, "UpperName Copy 3");
});

test("createWorkspaceCustomFunctionEntry creates stable defaults and unique ids", () => {
  const now = () => 100;
  const first = createWorkspaceCustomFunctionEntry(sample, {
    seed: {
      name: "",
      definition: "",
      parameters: ["first", "first", " second "]
    },
    now,
    idPrefix: "cf"
  });
  assert.equal(first.id, "cf-100");
  assert.equal(first.name, "NewFunction");
  assert.equal(first.definition.includes("Return expression"), true);
  assert.deepEqual(first.parameters, ["first", "second"]);
  assert.equal(first.source, "workspace");

  const second = createWorkspaceCustomFunctionEntry([...sample, first], {
    seed: { name: "UpperName" },
    now,
    idPrefix: "cf"
  });
  assert.equal(second.id, "cf-100-2");
  assert.equal(second.name, "UpperName Copy 2");
});

test("duplicateWorkspaceCustomFunctionEntry clones with workspace source and unique copy name", () => {
  const duplicate = duplicateWorkspaceCustomFunctionEntry(sample, sample[0], {
    now: () => 200,
    idPrefix: "cf"
  });
  assert.equal(duplicate.id, "cf-200");
  assert.equal(duplicate.name, "UpperName Copy 2");
  assert.equal(duplicate.source, "workspace");
  assert.deepEqual(duplicate.parameters, ["first", "last"]);
});

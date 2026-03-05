import assert from "node:assert/strict";
import test from "node:test";
import {
  createWorkspaceThemeEntry,
  duplicateWorkspaceThemeEntry,
  resolveNextWorkspaceThemeName,
  type WorkspaceThemeEntry
} from "./theme-workspace-ops.ts";

const workspaceThemes: WorkspaceThemeEntry[] = [
  {
    id: "theme-1",
    name: "Aerial",
    description: "Workspace touch variant",
    source: "workspace"
  },
  {
    id: "theme-2",
    name: "Aerial Copy",
    source: "workspace"
  }
];

test("resolveNextWorkspaceThemeName generates stable copy suffixes", () => {
  const next = resolveNextWorkspaceThemeName(
    ["Aerial", "Aerial Copy", "Aerial Copy 2"],
    "Aerial"
  );
  assert.equal(next, "Aerial Copy 3");
});

test("createWorkspaceThemeEntry uses additional name hints and unique ids", () => {
  const created = createWorkspaceThemeEntry(workspaceThemes, {
    requestedName: "Minimalist",
    additionalNameHints: ["Minimalist", "Minimalist Copy"],
    now: () => 200
  });
  assert.equal(created.id, "theme-200");
  assert.equal(created.name, "Minimalist Copy 2");
  assert.equal(created.source, "workspace");
});

test("duplicateWorkspaceThemeEntry clones description and produces workspace copy name", () => {
  const duplicate = duplicateWorkspaceThemeEntry(workspaceThemes, workspaceThemes[0], {
    additionalNameHints: ["Aerial Copy 2"],
    now: () => 250
  });
  assert.equal(duplicate.id, "theme-250");
  assert.equal(duplicate.name, "Aerial Copy 3");
  assert.equal(duplicate.description, "Workspace touch variant");
  assert.equal(duplicate.source, "workspace");
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  resolvePortalFieldKeyForRow,
  resolvePortalRelatedWriteTarget,
  resolvePortalRowVisualState
} from "./portal-runtime.ts";

test("resolvePortalRowVisualState applies alternate rows only to data rows when enabled", () => {
  const dataOdd = resolvePortalRowVisualState({
    rowKind: "data",
    rowIndex: 1,
    useAlternateRowState: true,
    useActiveRowState: false,
    rowToken: "row-1",
    activeRowToken: ""
  });
  assert.equal(dataOdd.alternate, true);

  const dataEven = resolvePortalRowVisualState({
    rowKind: "data",
    rowIndex: 0,
    useAlternateRowState: true,
    useActiveRowState: false,
    rowToken: "row-0",
    activeRowToken: ""
  });
  assert.equal(dataEven.alternate, false);

  const placeholder = resolvePortalRowVisualState({
    rowKind: "placeholder",
    rowIndex: 1,
    useAlternateRowState: true,
    useActiveRowState: false,
    rowToken: "index-1",
    activeRowToken: ""
  });
  assert.equal(placeholder.alternate, false);

  const createRow = resolvePortalRowVisualState({
    rowKind: "create",
    rowIndex: 1,
    useAlternateRowState: true,
    useActiveRowState: false,
    rowToken: "create",
    activeRowToken: ""
  });
  assert.equal(createRow.alternate, false);
});

test("resolvePortalRowVisualState applies active state only when row token matches", () => {
  const active = resolvePortalRowVisualState({
    rowKind: "data",
    rowIndex: 2,
    useAlternateRowState: false,
    useActiveRowState: true,
    rowToken: "row-2",
    activeRowToken: "row-2"
  });
  assert.equal(active.active, true);

  const inactive = resolvePortalRowVisualState({
    rowKind: "data",
    rowIndex: 2,
    useAlternateRowState: false,
    useActiveRowState: true,
    rowToken: "row-2",
    activeRowToken: ""
  });
  assert.equal(inactive.active, false);
});

test("resolvePortalRelatedWriteTarget writes related portal fields by table occurrence, not layout name", () => {
  const resolved = resolvePortalRelatedWriteTarget({
    relatedTableOccurrence: "Assignments",
    defaultTableOccurrence: "Asset Details",
    relatedLayoutHint: "Assigned"
  });
  assert.deepEqual(resolved, {
    tableOccurrence: "Assignments",
    layoutName: "Assigned"
  });
});

test("resolvePortalRelatedWriteTarget falls back to default table occurrence for non-related fields", () => {
  const resolved = resolvePortalRelatedWriteTarget({
    relatedTableOccurrence: "",
    defaultTableOccurrence: "Asset Details"
  });
  assert.deepEqual(resolved, {
    tableOccurrence: "Asset Details",
    layoutName: undefined
  });
});

test("resolvePortalFieldKeyForRow prefers table occurrence qualified field keys", () => {
  const row: Record<string, unknown> = {
    "Assignments::Note": "Assigned note",
    "Used By::Note": "Other note",
    Note: "Unqualified note"
  };
  const key = resolvePortalFieldKeyForRow(row, "Note", {
    tableOccurrence: "Assignments",
    portalName: "Used By"
  });
  assert.equal(key, "Assignments::Note");
});

test("resolvePortalFieldKeyForRow falls back to unqualified key when needed", () => {
  const row: Record<string, unknown> = {
    Note: "Standalone"
  };
  const key = resolvePortalFieldKeyForRow(row, "Note", {
    tableOccurrence: "Assignments",
    portalName: "Used By"
  });
  assert.equal(key, "Note");
});

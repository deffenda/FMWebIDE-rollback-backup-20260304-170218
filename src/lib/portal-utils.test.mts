import assert from "node:assert/strict";
import test from "node:test";
import {
  addPortalRowFields,
  comparePortalSortValues,
  movePortalRowFields,
  normalizePortalSortRules,
  removePortalRowFields,
  resolvePortalActiveRowToken,
  resolvePortalSortFieldValue,
  sanitizePortalSetupDraft,
  sortPortalRowsForPreview
} from "./portal-utils.ts";

test("normalizePortalSortRules removes invalid entries and deduplicates case-insensitively", () => {
  const normalized = normalizePortalSortRules([
    null,
    { field: "  Name  ", order: "ascending" },
    { field: "name", order: "descending" },
    { field: "", order: "custom" },
    { field: "Type", order: "custom", valueList: "  Employee  " },
    { field: "CreatedAt", order: "invalid-order" }
  ]);

  assert.deepEqual(normalized, [
    { field: "Name", order: "ascending", valueList: undefined },
    { field: "Type", order: "custom", valueList: "Employee" },
    { field: "CreatedAt", order: "ascending", valueList: undefined }
  ]);
});

test("comparePortalSortValues handles numeric and date values before text", () => {
  assert.equal(comparePortalSortValues("2", "10"), -1);
  assert.equal(comparePortalSortValues("2026-02-01", "2026-03-01"), -1);
  assert.equal(comparePortalSortValues("Bravo", "alpha"), 1);
});

test("resolvePortalSortFieldValue resolves qualified and unqualified field names", () => {
  const row = {
    "Assignments::Name": "Ada",
    Name: "Primary Name",
    Price: 12
  };

  assert.equal(resolvePortalSortFieldValue(row, "Assignments::Name"), "Ada");
  assert.equal(resolvePortalSortFieldValue(row, "name"), "Ada");
  assert.equal(resolvePortalSortFieldValue(row, "Name"), "Primary Name");
  assert.equal(resolvePortalSortFieldValue(row, "price"), 12);
});

test("sortPortalRowsForPreview applies ascending, descending and custom value list ordering", () => {
  const rows = [
    { Name: "C", Priority: "Low", Price: "120" },
    { Name: "A", Priority: "High", Price: "20" },
    { Name: "B", Priority: "Medium", Price: "50" }
  ];

  const customSorted = sortPortalRowsForPreview(
    rows,
    [{ field: "Priority", order: "custom", valueList: "PriorityList" }],
    new Map([["PriorityList", ["High", "Medium", "Low"]]])
  );
  assert.deepEqual(customSorted.map((row) => row.Name), ["A", "B", "C"]);

  const numericDescSorted = sortPortalRowsForPreview(
    rows,
    [{ field: "Price", order: "descending" }],
    new Map()
  );
  assert.deepEqual(numericDescSorted.map((row) => row.Name), ["C", "B", "A"]);
});

test("sanitizePortalSetupDraft preserves explicit row fields and filters sort rules by known fields", () => {
  const sanitized = sanitizePortalSetupDraft({
    tableOccurrence: " Assignments ",
    fallbackTableOccurrence: "Assets",
    sortRecords: true,
    filterRecords: false,
    allowDelete: true,
    allowVerticalScrolling: true,
    scrollBar: "always",
    resetScrollOnExit: true,
    initialRowInput: "2",
    rowsInput: "7",
    useAlternateRowState: true,
    useActiveRowState: false,
    rowFields: [" Name", "Date Returned", "Name", "MissingField "],
    sortRules: [
      { field: "Date Returned", order: "ascending" },
      { field: "Unknown", order: "descending" }
    ],
    sortReorderBySummary: false,
    sortSummaryField: "",
    sortOverrideLanguage: false,
    sortLanguage: "",
    availableFieldNames: ["Name", "Date Returned", "Note"]
  });

  assert.equal(sanitized.tableOccurrence, "Assignments");
  assert.equal(sanitized.props.repetitionsTo, 7);
  assert.equal(sanitized.props.portalInitialRow, 2);
  assert.deepEqual(sanitized.props.portalRowFields, ["Name", "Date Returned", "MissingField"]);
  assert.deepEqual(sanitized.props.portalSortRules, [{ field: "Date Returned", order: "ascending", valueList: undefined }]);
});

test("sanitizePortalSetupDraft applies safety defaults and scroll behavior constraints", () => {
  const sanitized = sanitizePortalSetupDraft({
    tableOccurrence: "   ",
    fallbackTableOccurrence: "Assets",
    sortRecords: false,
    filterRecords: true,
    allowDelete: false,
    allowVerticalScrolling: false,
    scrollBar: "always",
    resetScrollOnExit: true,
    initialRowInput: "0",
    rowsInput: "-1",
    useAlternateRowState: false,
    useActiveRowState: true,
    rowFields: ["Name"],
    sortRules: [],
    sortReorderBySummary: true,
    sortSummaryField: "  Summary::Count ",
    sortOverrideLanguage: true,
    sortLanguage: "  ",
    availableFieldNames: []
  });

  assert.equal(sanitized.tableOccurrence, "Assets");
  assert.equal(sanitized.props.portalInitialRow, 1);
  assert.equal(sanitized.props.repetitionsTo, 6);
  assert.equal(sanitized.props.portalAllowVerticalScrolling, false);
  assert.equal(sanitized.props.portalScrollBar, "never");
  assert.equal(sanitized.props.portalResetScrollOnExit, false);
  assert.equal(sanitized.props.portalSortLanguage, "English");
  assert.equal(sanitized.props.portalSortSummaryField, "Summary::Count");
});

test("addPortalRowFields appends only unique values in available-field order", () => {
  const next = addPortalRowFields(
    ["Note"],
    [" Date Returned ", "note", "EmployeeForeignKey"],
    ["EmployeeForeignKey", "Date Returned", "Note", "ModID"]
  );
  assert.deepEqual(next, ["Note", "EmployeeForeignKey", "Date Returned"]);
});

test("removePortalRowFields removes selected row fields case-insensitively", () => {
  const next = removePortalRowFields(
    ["EmployeeForeignKey", "Date Returned", "Note", "ModID"],
    ["note", " modid "]
  );
  assert.deepEqual(next, ["EmployeeForeignKey", "Date Returned"]);
});

test("movePortalRowFields reorders selected fields up/down while preserving selection grouping", () => {
  const rows = ["EmployeeForeignKey", "Date Returned", "Note", "ModID"];
  const movedUp = movePortalRowFields(rows, ["Note", "ModID"], "up");
  assert.deepEqual(movedUp, ["EmployeeForeignKey", "Note", "ModID", "Date Returned"]);

  const movedDown = movePortalRowFields(rows, ["EmployeeForeignKey", "Date Returned"], "down");
  assert.deepEqual(movedDown, ["Note", "EmployeeForeignKey", "Date Returned", "ModID"]);
});

test("resolvePortalActiveRowToken honors existing selection and falls back to initial row", () => {
  const rows = [
    { recordId: "11", Name: "A" },
    { recordId: "22", Name: "B" },
    { recordId: "33", Name: "C" }
  ];

  assert.equal(
    resolvePortalActiveRowToken(rows, {
      initialRow: 2
    }),
    "22"
  );

  assert.equal(
    resolvePortalActiveRowToken(rows, {
      initialRow: 2,
      existingToken: "33"
    }),
    "33"
  );

  assert.equal(
    resolvePortalActiveRowToken(rows, {
      initialRow: 2,
      existingToken: "missing"
    }),
    "22"
  );
});

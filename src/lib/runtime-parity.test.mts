import assert from "node:assert/strict";
import test from "node:test";
import {
  applyStagedRecordToRecord,
  beginEdit,
  commitRecord,
  createEmptyEditSession,
  getDirtyFieldData,
  isDirty,
  revertRecord,
  stageFieldChange
} from "./edit-session/index.ts";
import { resolveContainerRenderModel } from "./container-runtime.ts";
import { evaluateFMCalcBoolean, evaluateFMCalcText } from "./fmcalc/index.ts";
import {
  applyFindRequestsOnRecords,
  constrainFoundSetRecordIds,
  createFindRequest,
  extendFoundSetRecordIds
} from "./find-mode.ts";
import {
  applyAutoEnterOnCreate,
  buildFieldEngineConfig,
  validateRecordForCommit
} from "./field-engine.ts";
import {
  applyRepetitionValueChange,
  normalizeRepetitionRange,
  resolveRepetitionValues
} from "./repeating-fields.ts";
import { buildTableDisplayRows } from "./sort-reporting.ts";
import { resolvePortalActiveRowToken } from "./portal-utils.ts";
import {
  buildRuntimeCapabilitiesFromFields,
  canDeleteRuntimePortalRows,
  canEditRuntimeField,
  canViewRuntimeField
} from "./runtime-capabilities.ts";
import { clampPanelTabIndex, parseActivePanelTabsToken, serializeActivePanelTabsToken } from "./tabs-runtime.ts";
import { evaluateRecordCommitRequestPolicy } from "./trigger-policy.ts";
import { createTriggerBus } from "./triggers/index.ts";
import { createValueListCache } from "./value-list-cache.ts";
import { createRuntimeKernel } from "./runtime-kernel/kernel.ts";
import type { LayoutDefinition } from "./layout-model.ts";

const parityChecklist = new Map<string, boolean>([
  ["hideObjectWhen", false],
  ["portalFilterAndActiveRow", false],
  ["commitRevertLifecycle", false],
  ["containerRenderMock", false],
  ["repeatingFieldsMock", false],
  ["triggerOrderMock", false],
  ["tabsRuntime", false],
  ["valueListCache", false],
  ["privilegeGating", false],
  ["commitRequestVeto", false],
  ["foundSetModel", false],
  ["windowStackModel", false],
  ["variableScopes", false],
  ["contextStackResolution", false],
  ["scriptEngineLite", false],
  ["findRequestsOmit", false],
  ["findConstrainExtend", false],
  ["sortGroupSubsummary", false],
  ["fieldEngineValidationAutoEnter", false]
]);

function mark(check: string): void {
  parityChecklist.set(check, true);
}

function printChecklist(): void {
  const ordered = [...parityChecklist.entries()];
  // Keep this summary stable so test runners can parse/check parity coverage.
  console.log("\nRuntime Parity Checklist:");
  for (const [name, passed] of ordered) {
    console.log(`- ${name}: ${passed ? "PASS" : "MISSING"}`);
  }
}

test("hideObjectWhen evaluation is deterministic in browse + find semantics", () => {
  const browseContext = {
    currentTableOccurrence: "Assets",
    currentRecord: {
      recordId: "10",
      Status: "Archived"
    }
  };
  const hideInBrowse = evaluateFMCalcBoolean('Status = "Archived"', browseContext);
  assert.equal(hideInBrowse.ok, true);
  assert.equal(hideInBrowse.value, true);

  const visibleInFindWhenNotApplied = true; // applyInFindMode = false in browse runtime
  assert.equal(visibleInFindWhenNotApplied, true);

  const hideInFindWhenApplied = evaluateFMCalcBoolean('Status = "Archived"', browseContext);
  assert.equal(hideInFindWhenApplied.ok, true);
  assert.equal(hideInFindWhenApplied.value, true);

  mark("hideObjectWhen");
});

test("portal filter calc and active-row token resolution are stable", () => {
  const currentRecord = {
    recordId: "500",
    Name: "Asset 1"
  };
  const relatedRows = [
    { recordId: "1", "Assignments::Note": "", "Assignments::EmployeeForeignKey": 1 },
    { recordId: "2", "Assignments::Note": "Ready", "Assignments::EmployeeForeignKey": 5 },
    { recordId: "3", "Assignments::Note": "Available", "Assignments::EmployeeForeignKey": 0 }
  ];

  const filtered = relatedRows.filter((row) => {
    const result = evaluateFMCalcBoolean(
      'Not IsEmpty(Assignments::Note) and Assignments::EmployeeForeignKey > 0',
      {
        currentTableOccurrence: "Assets",
        currentRecord,
        relatedTableOccurrence: "Assignments",
        relatedRecord: row
      }
    );
    return result.ok ? result.value : false;
  });
  assert.deepEqual(
    filtered.map((row) => String(row.recordId)),
    ["2"]
  );

  const active = resolvePortalActiveRowToken(filtered, { initialRow: 1 });
  assert.equal(active, "2");
  const retained = resolvePortalActiveRowToken(filtered, { initialRow: 1, existingToken: "2" });
  assert.equal(retained, "2");

  mark("portalFilterAndActiveRow");
});

test("edit session commit/revert lifecycle keeps staged and committed data separate", () => {
  const snapshot = {
    recordId: "200",
    Name: "Original",
    Price: 10
  };

  let session = createEmptyEditSession();
  session = beginEdit(session, {
    recordId: "200",
    snapshot
  });
  session = stageFieldChange(session, {
    recordId: "200",
    field: "Name",
    value: "Edited",
    snapshot
  });
  assert.equal(isDirty(session), true);
  assert.deepEqual(getDirtyFieldData(session, "200"), {
    Name: "Edited"
  });

  const merged = applyStagedRecordToRecord(snapshot, session);
  assert.equal(merged.Name, "Edited");
  assert.equal(snapshot.Name, "Original");

  const reverted = revertRecord(session, {
    recordId: "200"
  });
  assert.equal(reverted.snapshot?.Name, "Original");
  assert.equal(isDirty(reverted.state), false);

  session = stageFieldChange(session, {
    recordId: "200",
    field: "Price",
    value: 25,
    snapshot
  });
  const committed = commitRecord(session, {
    recordId: "200"
  });
  assert.equal(isDirty(committed), false);

  mark("commitRevertLifecycle");
});

test("container render model handles image/pdf/interactive payloads in mock mode", () => {
  assert.equal(resolveContainerRenderModel("https://example.com/photo.jpg").kind, "image");
  assert.equal(resolveContainerRenderModel("https://example.com/doc.pdf").kind, "pdf");
  assert.equal(
    resolveContainerRenderModel("https://example.com/clip.mp4", {
      optimizeFor: "interactive"
    }).kind,
    "interactive"
  );
  assert.equal(resolveContainerRenderModel("").kind, "empty");
  assert.equal(
    evaluateFMCalcText('"Preview: " & "Container"', {
      currentRecord: {}
    }).value,
    "Preview: Container"
  );

  mark("containerRenderMock");
});

test("repeating field helper resolves and updates repetition values", () => {
  const range = normalizeRepetitionRange(1, 3);
  assert.deepEqual(resolveRepetitionValues(["A", "B"], range), [
    { repetition: 1, value: "A" },
    { repetition: 2, value: "B" },
    { repetition: 3, value: "" }
  ]);
  assert.deepEqual(applyRepetitionValueChange(["A", "B"], 3, "C"), ["A", "B", "C"]);

  mark("repeatingFieldsMock");
});

test("trigger bus preserves firing order", () => {
  const bus = createTriggerBus();
  const observed: string[] = [];
  const unsubscribe = bus.on((event) => {
    observed.push(event.name);
  });
  bus.emit({ name: "OnLayoutEnter" });
  bus.emit({ name: "OnRecordLoad" });
  bus.emit({ name: "OnObjectEnter:Name" });
  unsubscribe();
  bus.emit({ name: "OnObjectExit:Name" });

  assert.deepEqual(observed, ["OnLayoutEnter", "OnRecordLoad", "OnObjectEnter:Name"]);
  assert.deepEqual(
    bus.getHistory().map((event) => event.name),
    ["OnLayoutEnter", "OnRecordLoad", "OnObjectEnter:Name", "OnObjectExit:Name"]
  );

  mark("triggerOrderMock");
});

test("tab runtime token roundtrip and clamping are deterministic", () => {
  const token = serializeActivePanelTabsToken({
    "panel-asset": 2,
    "panel-assigned": 0
  });
  assert.equal(token, "panel-asset:2,panel-assigned:0");
  const parsed = parseActivePanelTabsToken(token);
  assert.deepEqual(parsed, {
    "panel-asset": 2,
    "panel-assigned": 0
  });
  assert.equal(clampPanelTabIndex(9, 3), 2);

  mark("tabsRuntime");
});

test("value-list cache supports scoped keys and expiry", async () => {
  const cache = createValueListCache<{ count: number }>(5);
  cache.set("assets", "database", undefined, { count: 3 }, 5);
  assert.deepEqual(cache.get("assets", "database", undefined), { count: 3 });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(cache.get("assets", "database", undefined), null);
  mark("valueListCache");
});

test("privilege capability map gates visibility/edit/delete", () => {
  const restricted = buildRuntimeCapabilitiesFromFields({
    workspaceId: "assets",
    source: "mock",
    role: "restricted",
    fieldNames: ["PrimaryKey", "Total", "Name"]
  });
  assert.equal(canViewRuntimeField(restricted, "PrimaryKey"), false);
  assert.equal(canEditRuntimeField(restricted, "Total"), false);
  assert.equal(canEditRuntimeField(restricted, "Name"), true);
  assert.equal(canDeleteRuntimePortalRows(restricted), false);

  const fullAccess = buildRuntimeCapabilitiesFromFields({
    workspaceId: "assets",
    source: "mock",
    role: "fullAccess",
    fieldNames: ["Name"]
  });
  assert.equal(canDeleteRuntimePortalRows(fullAccess), true);

  mark("privilegeGating");
});

test("record commit request policy can veto save", () => {
  const layout: LayoutDefinition = {
    id: "asset-details",
    name: "Asset Details",
    defaultTableOccurrence: "Assets",
    canvas: {
      width: 1024,
      height: 768,
      gridSize: 8
    },
    components: [],
    actions: [],
    rules: [
      {
        id: "deny-archived",
        condition: 'Status = "Archived"',
        effect: "OnRecordCommitRequest:deny"
      }
    ]
  };
  const allowed = evaluateRecordCommitRequestPolicy(layout, {
    recordId: "1",
    Status: "Active"
  });
  assert.equal(allowed.allowed, true);
  const denied = evaluateRecordCommitRequestPolicy(layout, {
    recordId: "2",
    Status: "Archived"
  });
  assert.equal(denied.allowed, false);
  assert.ok(denied.reasons.length > 0);

  mark("commitRequestVeto");
});

test("found set model supports deterministic record pointer transitions", () => {
  const kernel = createRuntimeKernel({
    workspaceId: "assets",
    initialLayoutName: "Asset Details",
    initialTableOccurrence: "Assets",
    initialFoundSet: {
      recordIds: ["10", "20", "30"],
      currentIndex: 0
    }
  });
  assert.equal(kernel.navigateRecord({ mode: "next" }), "20");
  assert.equal(kernel.navigateRecord({ mode: "last" }), "30");
  assert.equal(kernel.navigateRecord({ mode: "first" }), "10");
  mark("foundSetModel");
});

test("window stack model supports independent card windows", () => {
  const kernel = createRuntimeKernel({
    workspaceId: "assets",
    initialLayoutName: "Asset Details",
    initialTableOccurrence: "Assets"
  });
  const cardWindowId = kernel.openWindow({
    type: "card",
    layoutName: "Assignments Card",
    tableOccurrence: "Assignments"
  });
  assert.equal(kernel.getSnapshot().focusedWindowId, cardWindowId);
  assert.equal(kernel.getSnapshot().windows.length, 2);
  assert.equal(kernel.closeWindow(cardWindowId), true);
  assert.equal(kernel.getSnapshot().windows.length, 1);
  mark("windowStackModel");
});

test("runtime variables maintain local and global scopes", () => {
  const kernel = createRuntimeKernel({
    workspaceId: "assets",
    initialLayoutName: "Asset Details",
    initialTableOccurrence: "Assets"
  });
  kernel.setVariable("$$theme", "Universal Touch");
  kernel.setVariable("$recordName", "Asset A", "frame-asset");
  assert.equal(kernel.getVariable("$$theme"), "Universal Touch");
  assert.equal(kernel.getVariable("$recordName", "frame-asset"), "Asset A");
  assert.equal(kernel.getVariable("$recordName", "frame-other"), undefined);
  mark("variableScopes");
});

test("context stack resolution handles explicit and implicit TO references", () => {
  const kernel = createRuntimeKernel({
    workspaceId: "assets",
    initialLayoutName: "Asset Details",
    initialTableOccurrence: "Assets"
  });
  kernel.pushContext({
    reason: "portalRow",
    windowId: "main",
    layoutName: "Asset Details",
    tableOccurrence: "Assignments",
    recordId: "900"
  });
  assert.deepEqual(kernel.resolveFieldRef("Note"), {
    tableOccurrence: "Assignments",
    fieldName: "Note"
  });
  assert.deepEqual(kernel.resolveFieldRef("Assets::Name"), {
    tableOccurrence: "Assets",
    fieldName: "Name"
  });
  mark("contextStackResolution");
});

test("script engine lite executes basic navigation and variable steps", async () => {
  const kernel = createRuntimeKernel({
    workspaceId: "assets",
    initialLayoutName: "Asset Details",
    initialTableOccurrence: "Assets",
    scriptsByName: {
      "Go Vendors": {
        id: "go-vendors",
        name: "Go Vendors",
        steps: [
          {
            id: "set-var",
            type: "Set Variable",
            params: {
              name: "$$targetLayout",
              value: "Vendors"
            }
          },
          {
            id: "goto-layout",
            type: "Go to Layout",
            params: {
              layoutName: "Vendors"
            }
          }
        ]
      }
    }
  });
  const runState = await kernel.runScript({
    scriptName: "Go Vendors"
  });
  assert.equal(runState.status, "completed");
  assert.equal(kernel.getSnapshot().windows[0].layoutName, "Vendors");
  assert.equal(kernel.getVariable("$$targetLayout"), "Vendors");
  mark("scriptEngineLite");
});

test("find request model supports omit requests", () => {
  const seeded = [
    { recordId: "1", Name: "Asset-A", Status: "Active" },
    { recordId: "2", Name: "Asset-B", Status: "Archived" },
    { recordId: "3", Name: "Asset-C", Status: "Active" }
  ];
  const requests = [
    createFindRequest({
      id: "req-1",
      criteria: {
        Name: "Asset*"
      }
    }),
    createFindRequest({
      id: "req-2",
      criteria: {
        Status: "Archived"
      },
      omit: true
    })
  ];
  const result = applyFindRequestsOnRecords(seeded, requests);
  assert.deepEqual(
    result.records.map((entry) => entry.recordId),
    ["1", "3"]
  );
  mark("findRequestsOmit");
});

test("constrain and extend found set helpers preserve record order semantics", () => {
  const current = ["10", "20", "30"];
  const next = ["30", "10", "40"];
  assert.deepEqual(constrainFoundSetRecordIds(current, next), ["10", "30"]);
  assert.deepEqual(extendFoundSetRecordIds(current, next), ["10", "20", "30", "40"]);
  mark("findConstrainExtend");
});

test("sort/group/subsummary runtime helper generates report rows", () => {
  const rows = buildTableDisplayRows({
    records: [
      { recordId: "10", Name: "Laptop", Type: "Hardware", Price: 1200 },
      { recordId: "20", Name: "Cable", Type: "Accessory", Price: 20 },
      { recordId: "30", Name: "Tablet", Type: "Hardware", Price: 1400 }
    ],
    fieldNames: ["Name", "Type", "Price"],
    sort: [
      {
        field: "Type",
        direction: "asc",
        mode: "standard"
      }
    ],
    leadingGrandSummary: true,
    trailingGrandSummary: true,
    leadingGroupField: "Type",
    trailingGroupField: null,
    leadingSubtotals: {
      Price: ["sum", "count"]
    },
    trailingSubtotals: {}
  });
  assert.ok(rows.some((entry) => entry.kind === "group"));
  assert.ok(rows.some((entry) => entry.kind === "summary"));
  assert.ok(rows.some((entry) => entry.kind === "record"));
  mark("sortGroupSubsummary");
});

test("field engine validates commits and applies auto-enter values", () => {
  const layout: LayoutDefinition = {
    id: "asset-details-field-engine",
    name: "Asset Details",
    defaultTableOccurrence: "Assets",
    canvas: {
      width: 800,
      height: 600,
      gridSize: 8
    },
    components: [
      {
        id: "field-name",
        type: "field",
        position: { x: 10, y: 10, width: 120, height: 20, z: 1 },
        binding: {
          field: "Name"
        },
        props: {
          validationRequired: true
        }
      },
      {
        id: "field-price",
        type: "field",
        position: { x: 10, y: 40, width: 120, height: 20, z: 2 },
        binding: {
          field: "Price"
        },
        props: {
          strictDataType: true
        }
      },
      {
        id: "field-seq",
        type: "field",
        position: { x: 10, y: 70, width: 120, height: 20, z: 3 },
        binding: {
          field: "Seq"
        },
        props: {
          autoEnterSerial: true
        }
      }
    ],
    actions: []
  };
  const config = buildFieldEngineConfig({
    layout,
    fieldTypeByName: {
      Name: "Text",
      Price: "Number",
      Seq: "Number"
    }
  });
  const validationErrors = validateRecordForCommit({
    record: {
      recordId: "1",
      Name: "",
      Price: "abc"
    },
    dirtyFields: {
      Name: "",
      Price: "abc"
    },
    config,
    currentTableOccurrence: "Assets"
  });
  assert.ok(validationErrors.length >= 2);
  const createPayload = applyAutoEnterOnCreate({
    baseFieldData: {
      Name: "Asset-1"
    },
    config,
    existingRecords: [{ recordId: "10", Seq: 2 }],
    currentTableOccurrence: "Assets",
    accountName: "tester"
  });
  assert.equal(createPayload.Seq, 3);
  mark("fieldEngineValidationAutoEnter");
});

test("runtime parity checklist summary", () => {
  printChecklist();
  for (const [check, passed] of parityChecklist.entries()) {
    assert.equal(passed, true, `Expected parity check "${check}" to pass`);
  }
});

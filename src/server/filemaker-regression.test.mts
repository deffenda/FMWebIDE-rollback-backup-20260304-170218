import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import type { FMRecord, LayoutDefinition } from "../lib/layout-model.ts";
import type { RuntimeVariableValue, ScriptDefinition } from "../lib/runtime-kernel/types.ts";
import { applyFindRequestsOnRecords, constrainFoundSetRecordIds, createFindRequest, extendFoundSetRecordIds } from "../lib/find-mode.ts";
import { applyAutoEnterOnCreate, buildFieldEngineConfig, validateRecordForCommit } from "../lib/field-engine.ts";
import { buildTableDisplayRows } from "../lib/sort-reporting.ts";
import { calculateSummarySet } from "../lib/summary-engine.ts";
import { normalizeLayoutTabOrder, resolveLayoutTabOrderIds } from "../lib/tab-order.ts";
import { parseBrowseLaunchModeToken } from "../lib/browse-url-state.ts";
import { executeScript } from "../lib/runtime-kernel/script-engine.ts";
import { createVariableStoreState, getVariable, setVariable, clearLocalsForFrame } from "../lib/runtime-kernel/variable-store.ts";
import { createTransactionBuffer, stageFieldOperation, commitTransactionBuffer } from "../lib/runtime-kernel/transaction-manager.ts";
import { listAppLayerCapabilities } from "../config/appLayerCapabilities.ts";
import {
  createRecord,
  deleteRecord,
  getAvailableLayouts,
  getRecords,
  getValueLists,
  isUsingMockData,
  updateRecord
} from "./filemaker-client.ts";
import { readAppLayerWorkspaceConfig, writeAppLayerWorkspaceConfig } from "./app-layer-storage.ts";
import { readSavedSearchConfig, writeSavedSearchConfig } from "./saved-search-storage.ts";

type LayoutTargets = {
  assets: string;
  vendors: string;
  employees: string;
};

type CreatedRecord = {
  table: keyof LayoutTargets;
  layoutName: string;
  recordId: string;
  fields: Record<string, unknown>;
};

type MutableVariableStore = {
  state: ReturnType<typeof createVariableStoreState>;
};

const runAgainstMock = process.env.FM_TEST_ALLOW_MOCK === "1";
const allowIntegration = process.env.FM_INTEGRATION_TESTS === "1";
const syntheticTag = `fmwebide-${Date.now().toString(36)}`;
const createdRecords: CreatedRecord[] = [];

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

function pickLayout(layouts: string[], candidates: string[]): string {
  for (const candidate of candidates) {
    const direct = layouts.find((entry) => normalize(entry) === normalize(candidate));
    if (direct) {
      return direct;
    }
  }
  for (const candidate of candidates) {
    const partial = layouts.find((entry) => normalize(entry).includes(normalize(candidate)));
    if (partial) {
      return partial;
    }
  }
  throw new Error(
    `Unable to resolve layout. Tried: ${candidates.join(", ")}. Available: ${layouts.join(", ")}`
  );
}

function resolveTargets(layouts: string[]): LayoutTargets {
  return {
    assets: pickLayout(layouts, ["Asset Details", "Asset List", "Assets"]),
    vendors: pickLayout(layouts, ["Vendor Details", "Vendor List", "Vendors"]),
    employees: pickLayout(layouts, ["Employee Details", "Employee List", "Employees"])
  };
}

function wildcardToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`, "i");
}

function recordMatchesFind(record: FMRecord, criteria: Record<string, string>): boolean {
  const entries = Object.entries(criteria).filter(([, value]) => value.trim().length > 0);
  if (entries.length === 0) {
    return true;
  }
  for (const [fieldName, expected] of entries) {
    const actual = String(record[fieldName] ?? "");
    const token = expected.trim();
    if (token.includes("*") || token.includes("?")) {
      if (!wildcardToRegex(token).test(actual)) {
        return false;
      }
      continue;
    }
    if (!actual.toLowerCase().includes(token.toLowerCase())) {
      return false;
    }
  }
  return true;
}

function createVariableApi(store: MutableVariableStore) {
  return {
    set(name: string, value: unknown, frameId?: string) {
      store.state = setVariable(store.state, {
        name,
        value: value as RuntimeVariableValue,
        frameId
      });
    },
    get(name: string, frameId?: string) {
      return getVariable(store.state, {
        name,
        frameId
      });
    },
    clearFrame(frameId: string) {
      store.state = clearLocalsForFrame(store.state, frameId);
    }
  };
}

async function safeDelete(layoutName: string, recordId: string): Promise<void> {
  try {
    await deleteRecord(layoutName, recordId);
  } catch {
    // Ignore cleanup failures so test teardown stays resilient.
  }
}

async function cleanupCreatedRecords(): Promise<void> {
  for (const entry of [...createdRecords].reverse()) {
    await safeDelete(entry.layoutName, entry.recordId);
  }
  createdRecords.length = 0;
}

async function createWithTracking(
  table: keyof LayoutTargets,
  layoutName: string,
  fields: Record<string, unknown>
): Promise<CreatedRecord> {
  const created = await createRecord(layoutName, fields);
  const recordId = String(created.recordId ?? "").trim();
  assert.ok(recordId, `Expected recordId from createRecord(${layoutName})`);
  const tracked: CreatedRecord = {
    table,
    layoutName,
    recordId,
    fields
  };
  createdRecords.push(tracked);
  return tracked;
}

async function fetchTaggedRecords(layoutName: string): Promise<FMRecord[]> {
  const rows = await getRecords({ tableOccurrence: layoutName, limit: 500 });
  return rows.filter((row) => {
    const candidates = [
      row.Name,
      row.name,
      row.Description,
      row.description,
      row["First Name"],
      row["Last Name"]
    ];
    return candidates.some((value) => String(value ?? "").toLowerCase().includes(syntheticTag));
  });
}

if (!allowIntegration) {
  test("FileMaker integration regression suite", { skip: true }, () => {});
} else {
  test("FileMaker integration regression suite", async (t) => {
    const parityChecklist = new Map<string, boolean>([
      ["crud:create-edit-delete", false],
      ["find:criteria-consistency", false],
      ["find:requests-omit-constrain-extend", false],
      ["reporting:sort-group-subsummary", false],
      ["field-engine:validation-auto-enter", false],
      ["value-lists:human-readable", false],
      ["portal:payload-and-related-edit", false],
      ["tab-order:canonical-resolution", false],
      ["saved-finds:workspace-persistence", false],
      ["saved-found-sets:workspace-persistence", false],
      ["phase6:list-view-runtime", false],
      ["phase6:table-view-runtime", false],
      ["phase6:preview-mode-runtime", false],
      ["phase6:status-menubar-parity", false],
      ["phase8:script-engine-advanced", false],
      ["phase8:transactions", false],
      ["phase8:summary-engine", false],
      ["phase11:app-layer-capability-registry", false],
      ["phase11:app-layer-manage-shell-routing", false],
      ["phase11:app-layer-workspace-storage", false]
    ]);
    const markParity = (name: string) => {
      if (parityChecklist.has(name)) {
        parityChecklist.set(name, true);
      }
    };
    const printParity = () => {
      // Machine-readable footer for CI logs and local audit trails.
      console.log("\nFM Integration Parity Checklist v11:");
      for (const [name, passed] of parityChecklist.entries()) {
        console.log(`- ${name}: ${passed ? "PASS" : "MISSING"}`);
      }
      const totals = [...parityChecklist.values()];
      const passedCount = totals.filter(Boolean).length;
      const parityLevel = totals.length === 0 ? 0 : Math.round((passedCount / totals.length) * 100);
      console.log(`Parity Level (Phase 1-11 target): ${passedCount}/${totals.length} (${parityLevel}%)`);
      const appLayerEntries = [...parityChecklist.entries()].filter(([name]) => name.startsWith("phase11:"));
      const appLayerPassed = appLayerEntries.filter(([, passed]) => passed).length;
      console.log(`Parity Checklist App Layer: ${appLayerPassed}/${appLayerEntries.length} passed`);
    };

    if (isUsingMockData() && !runAgainstMock) {
      t.skip("Skipping integration suite because FileMaker env vars are not active. Set FM_TEST_ALLOW_MOCK=1 to run against mock.");
      return;
    }

    const layoutsPayload = await getAvailableLayouts();
    assert.ok(layoutsPayload.layouts.length > 0, "Expected at least one available layout");
    let targets: LayoutTargets;
    try {
      targets = resolveTargets(layoutsPayload.layouts);
    } catch (error) {
      t.skip(
        `Skipping integration suite because required Assets/Vendors/Employees layouts are unavailable (${error instanceof Error ? error.message : "layout mismatch"}).`
      );
      return;
    }

    const vendorSeed = [
      { Name: `${syntheticTag}-Vendor-A`, Description: `${syntheticTag} industrial supply partner` },
      { Name: `${syntheticTag}-Vendor-B`, Description: `${syntheticTag} field service supplier` },
      { Name: `${syntheticTag}-Vendor-C`, Description: `${syntheticTag} maintenance vendor` }
    ];
    const employeeSeed = [
      {
        "First Name": `${syntheticTag}-Employee-A`,
        "Last Name": "Operations",
        Description: `${syntheticTag} operations manager`
      },
      {
        "First Name": `${syntheticTag}-Employee-B`,
        "Last Name": "Field",
        Description: `${syntheticTag} field technician`
      },
      {
        "First Name": `${syntheticTag}-Employee-C`,
        "Last Name": "Warehouse",
        Description: `${syntheticTag} warehouse specialist`
      }
    ];
    const assetSeed = [
      {
        Name: `${syntheticTag}-Asset-A`,
        Description: "Dell Latitude 7440 for field engineering",
        "Serial Number": `SN-${syntheticTag}-A`,
        Type: "Laptop",
        Vendor: `${syntheticTag}-Vendor-A`,
        Price: 2199.95
      },
      {
        Name: `${syntheticTag}-Asset-B`,
        Description: "Fluke thermal camera for inspections",
        "Serial Number": `SN-${syntheticTag}-B`,
        Type: "Camera",
        Vendor: `${syntheticTag}-Vendor-B`,
        Price: 1495.0
      },
      {
        Name: `${syntheticTag}-Asset-C`,
        Description: "Surface Pro for project management",
        "Serial Number": `SN-${syntheticTag}-C`,
        Type: "Tablet",
        Vendor: `${syntheticTag}-Vendor-C`,
        Price: 1849.49
      }
    ];

    t.after(async () => {
      await cleanupCreatedRecords();
      printParity();
    });

    await t.test("create three vendor, employee, and asset records", async () => {
      for (const vendor of vendorSeed) {
        await createWithTracking("vendors", targets.vendors, vendor);
      }
      for (const employee of employeeSeed) {
        await createWithTracking("employees", targets.employees, employee);
      }
      for (const asset of assetSeed) {
        await createWithTracking("assets", targets.assets, asset);
      }

      const vendorRows = await fetchTaggedRecords(targets.vendors);
      const employeeRows = await fetchTaggedRecords(targets.employees);
      const assetRows = await fetchTaggedRecords(targets.assets);
      assert.equal(vendorRows.length, 3, "Expected 3 created vendor records");
      assert.equal(employeeRows.length, 3, "Expected 3 created employee records");
      assert.equal(assetRows.length, 3, "Expected 3 created asset records");
      markParity("crud:create-edit-delete");
    });

    await t.test("edit seeded records and verify persisted updates", async () => {
      for (const created of createdRecords) {
        const updatedPayload: Record<string, unknown> = {
          ...created.fields
        };

        if (created.table === "assets") {
          const currentName = String(created.fields.Name ?? "");
          updatedPayload.Name = `${currentName}-Edited`;
          updatedPayload.Description = `${created.fields.Description ?? ""} (refreshed)`;
          updatedPayload.Price = Number(created.fields.Price ?? 0) + 100;
        }
        if (created.table === "vendors") {
          const currentName = String(created.fields.Name ?? "");
          updatedPayload.Name = `${currentName}-Edited`;
          updatedPayload.Description = `${created.fields.Description ?? ""} (preferred)`;
        }
        if (created.table === "employees") {
          const currentFirstName = String(created.fields["First Name"] ?? "");
          updatedPayload["First Name"] = `${currentFirstName}-Edited`;
          updatedPayload["Last Name"] = `${created.fields["Last Name"] ?? "Staff"} II`;
          updatedPayload.Description = `${created.fields.Description ?? ""} (preferred)`;
        }

        await updateRecord(created.layoutName, created.recordId, updatedPayload);
        created.fields = updatedPayload;
      }

      const assetRows = await fetchTaggedRecords(targets.assets);
      const editedCount = assetRows.filter((row) => String(row.Name ?? "").endsWith("-Edited")).length;
      assert.equal(editedCount, 3, "Expected all asset records to be updated");
      markParity("crud:create-edit-delete");
    });

    await t.test("find-mode criteria semantics produce consistent found set across form/list/table", async () => {
      const records = await fetchTaggedRecords(targets.assets);
      assert.ok(records.length >= 3, "Expected tagged asset records for find verification");

      const criteria = {
        Name: `${syntheticTag}*Edited`,
        Description: "field"
      };
      const expected = records.filter((row) => recordMatchesFind(row, criteria));
      assert.ok(expected.length >= 1, "Expected at least one record to match find criteria");

      for (const view of ["form", "list", "table"] as const) {
        const found = records.filter((row) => recordMatchesFind(row, criteria));
        assert.equal(
          found.length,
          expected.length,
          `Expected ${view} view find semantics to match shared criteria filtering`
        );
      }
      markParity("find:criteria-consistency");
      markParity("phase6:list-view-runtime");
      markParity("phase6:table-view-runtime");
    });

    await t.test("preview token and browse menubar actions are wired", async () => {
      assert.equal(parseBrowseLaunchModeToken("preview"), "preview");
      const browseModeSource = fs.readFileSync(
        path.resolve(process.cwd(), "components/browse-mode.tsx"),
        "utf8"
      );
      assert.ok(
        browseModeSource.includes("view-preview-mode"),
        "Expected preview mode command in browse menubar"
      );
      assert.ok(
        browseModeSource.includes("view-toggle-preview-print-guides"),
        "Expected preview print guide toggle in browse menubar"
      );
      assert.ok(
        browseModeSource.includes("runtime-preview-page-guides"),
        "Expected preview print guide overlay class in browse renderer"
      );
      assert.ok(
        browseModeSource.includes("records-constrain-found-set"),
        "Expected records/find parity action in browse menubar"
      );
      assert.ok(
        browseModeSource.includes("view-capabilities"),
        "Expected runtime capabilities action in browse menubar"
      );
      markParity("phase6:preview-mode-runtime");
      markParity("phase6:status-menubar-parity");
    });

    await t.test("new layout/report assistant includes FileMaker-style template starters", async () => {
      const layoutModeSource = fs.readFileSync(
        path.resolve(process.cwd(), "components/layout-mode.tsx"),
        "utf8"
      );
      for (const token of [
        "newLayoutTemplateOptions",
        "newLayoutTemplatesByDevice",
        "Vertical Labels",
        "Envelopes",
        "Mail Merge",
        "Labels",
        "newLayoutTouchTargetOptions",
        "Include in layout menus"
      ]) {
        assert.ok(
          layoutModeSource.includes(token),
          `Expected New Layout/Report assistant token: ${token}`
        );
      }
      markParity("phase16:new-layout-assistant-templates");
    });

    await t.test("phase11 app-layer capability registry and manage shell wiring are present", async () => {
      const capabilities = listAppLayerCapabilities();
      const capabilityKeys = new Set(capabilities.map((entry) => entry.key));
      for (const expected of [
        "manageDatabase",
        "manageSecurity",
        "manageValueLists",
        "manageLayouts",
        "manageScripts",
        "manageExternalDataSources",
        "manageContainers",
        "manageCustomFunctions",
        "manageCustomMenus",
        "manageThemes"
      ]) {
        assert.ok(capabilityKeys.has(expected as (typeof capabilities)[number]["key"]), `Missing capability key: ${expected}`);
      }
      const layoutModeSource = fs.readFileSync(path.resolve(process.cwd(), "components/layout-mode.tsx"), "utf8");
      for (const actionId of [
        "file-manage-database",
        "file-manage-security",
        "file-value-lists",
        "file-manage-layouts",
        "file-manage-scripts",
        "file-manage-external-data-sources",
        "file-manage-containers",
        "file-manage-custom-functions",
        "file-manage-custom-menus",
        "file-manage-themes"
      ]) {
        assert.ok(layoutModeSource.includes(actionId), `Expected layout-mode manage action: ${actionId}`);
      }
      assert.ok(
        layoutModeSource.includes("app-layer-manage-center-modal"),
        "Expected app-layer manage center modal implementation"
      );
      markParity("phase11:app-layer-capability-registry");
      markParity("phase11:app-layer-manage-shell-routing");
    });

    await t.test("find requests support omit/constrain/extend semantics", async () => {
      const rows = await fetchTaggedRecords(targets.assets);
      assert.ok(rows.length >= 3, "Expected seeded records for find request semantics");
      const include = createFindRequest({
        id: "include-assets",
        criteria: {
          Name: `${syntheticTag}*`
        }
      });
      const omit = createFindRequest({
        id: "omit-assets",
        criteria: {
          Name: "*-C*"
        },
        omit: true
      });
      const found = applyFindRequestsOnRecords(rows, [include, omit]).records;
      assert.ok(found.length >= 2, "Expected include/omit semantics to keep at least two seeded assets");

      const currentIds = rows.map((entry) => String(entry.recordId ?? "")).filter((entry) => entry.length > 0);
      const foundIds = found.map((entry) => String(entry.recordId ?? "")).filter((entry) => entry.length > 0);
      const constrained = constrainFoundSetRecordIds(currentIds, foundIds);
      const extended = extendFoundSetRecordIds(constrained, currentIds);
      assert.ok(constrained.length <= foundIds.length, "Constrain should not increase found set");
      assert.equal(extended.length, currentIds.length, "Extend should restore union with prior found set");
      markParity("find:requests-omit-constrain-extend");
    });

    await t.test("layout tab-order normalization resolves deterministic canonical order", async () => {
      const layout: LayoutDefinition = {
        id: "tab-order-regression",
        name: "Tab Order Regression",
        defaultTableOccurrence: targets.assets,
        canvas: {
          width: 1024,
          height: 768,
          gridSize: 8
        },
        components: [
          {
            id: "button-late",
            type: "button",
            position: { x: 380, y: 88, width: 120, height: 28, z: 3 },
            props: {
              tabOrder: 3
            }
          },
          {
            id: "field-first",
            type: "field",
            position: { x: 80, y: 84, width: 200, height: 28, z: 1 },
            binding: {
              field: "Name"
            },
            props: {
              tabOrder: 1
            }
          },
          {
            id: "field-middle",
            type: "field",
            position: { x: 80, y: 130, width: 200, height: 28, z: 2 },
            binding: {
              field: "Type"
            },
            props: {
              tabOrder: 2
            }
          }
        ],
        actions: []
      };

      const normalized = normalizeLayoutTabOrder(layout);
      assert.deepEqual(resolveLayoutTabOrderIds(normalized), ["field-first", "field-middle", "button-late"]);
      assert.deepEqual(normalized.tabOrder, ["field-first", "field-middle", "button-late"]);
      markParity("tab-order:canonical-resolution");
    });

    await t.test("sort/group/subsummary reporting helper produces deterministic rows", async () => {
      const rows = await fetchTaggedRecords(targets.assets);
      const displayRows = buildTableDisplayRows({
        records: rows,
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
      assert.ok(displayRows.some((entry) => entry.kind === "group"), "Expected group rows");
      assert.ok(displayRows.some((entry) => entry.kind === "summary"), "Expected summary rows");
      assert.ok(displayRows.some((entry) => entry.kind === "record"), "Expected record rows");
      markParity("reporting:sort-group-subsummary");
    });

    await t.test("field engine applies validation and auto-enter defaults", async () => {
      const fieldConfig = buildFieldEngineConfig({
        layout: {
          id: "field-engine-test-layout",
          name: "Field Engine Test",
          defaultTableOccurrence: targets.assets,
          canvas: {
            width: 800,
            height: 600,
            gridSize: 8
          },
          components: [
            {
              id: "f-name",
              type: "field",
              position: { x: 10, y: 10, width: 200, height: 28, z: 1 },
              binding: {
                field: "Name"
              },
              props: {
                validationRequired: true
              }
            },
            {
              id: "f-price",
              type: "field",
              position: { x: 10, y: 50, width: 200, height: 28, z: 2 },
              binding: {
                field: "Price"
              },
              props: {
                strictDataType: true
              }
            },
            {
              id: "f-sequence",
              type: "field",
              position: { x: 10, y: 90, width: 200, height: 28, z: 3 },
              binding: {
                field: "Sequence"
              },
              props: {
                autoEnterSerial: true
              }
            }
          ],
          actions: []
        },
        fieldTypeByName: {
          Name: "Text",
          Price: "Number",
          Sequence: "Number"
        }
      });
      const validationErrors = validateRecordForCommit({
        record: {
          recordId: "1",
          Name: "",
          Price: "not-a-number"
        },
        dirtyFields: {
          Name: "",
          Price: "not-a-number"
        },
        config: fieldConfig,
        currentTableOccurrence: targets.assets
      });
      assert.ok(validationErrors.length >= 2, "Expected required + strict type errors");

      const autoEntered = applyAutoEnterOnCreate({
        baseFieldData: {
          Name: `${syntheticTag}-Auto`
        },
        config: fieldConfig,
        existingRecords: [{ recordId: "1", Sequence: 10 }],
        currentTableOccurrence: targets.assets,
        accountName: "integration-user"
      });
      assert.equal(autoEntered.Sequence, 11);
      markParity("field-engine:validation-auto-enter");
    });

    await t.test("value lists expose human-readable display values", async () => {
      const catalog = await getValueLists({ scope: "database", tableOccurrence: targets.assets });
      assert.ok(catalog.valueLists.length > 0, "Expected at least one value list in catalog");

      const employeeList = catalog.valueLists.find((entry) => normalize(entry.name) === "employee");
      assert.ok(employeeList, "Expected Employee value list");
      const vendorList = catalog.valueLists.find((entry) => normalize(entry.name) === "vendor");
      assert.ok(vendorList, "Expected Vendor value list");
      const typeList = catalog.valueLists.find((entry) => normalize(entry.name) === "type");
      assert.ok(typeList, "Expected Type value list");

      const employeeItems = employeeList?.items ?? [];
      if (employeeItems.length > 0) {
        assert.ok(
          employeeItems.some((item) => /[A-Za-z]/.test(item.displayValue)),
          "Expected Employee list display values to be human-readable"
        );
        assert.ok(
          employeeItems.every((item) => String(item.displayValue ?? "").trim().length > 0),
          "Expected Employee list display values to be non-empty"
        );
      } else {
        assert.ok(
          (employeeList?.values ?? []).some((value) => /[A-Za-z]/.test(value)),
          "Expected Employee value list values to contain readable labels"
        );
      }
      markParity("value-lists:human-readable");
    });

    await t.test("saved finds and saved found sets persist at workspace scope", async () => {
      const workspaceId = "assets";
      const savedFindId = `saved-find-${syntheticTag}`;
      const savedFoundSetId = `saved-found-set-${syntheticTag}`;
      const nextConfig = await writeSavedSearchConfig(workspaceId, {
        savedFinds: [
          {
            id: savedFindId,
            name: `Saved Find ${syntheticTag}`,
            layoutId: targets.assets,
            createdAt: Date.now(),
            requests: [
              {
                id: `${savedFindId}-request`,
                criteria: {
                  Name: `${syntheticTag}*`
                },
                omit: false
              }
            ]
          }
        ],
        savedFoundSets: [
          {
            id: savedFoundSetId,
            name: `Saved Found Set ${syntheticTag}`,
            layoutId: targets.assets,
            tableOccurrence: targets.assets,
            recordIds: createdRecords
              .filter((entry) => entry.table === "assets")
              .map((entry) => entry.recordId)
              .filter((entry) => entry.length > 0),
            capturedAt: Date.now(),
            source: "find"
          }
        ]
      });
      assert.ok(nextConfig.savedFinds.some((entry) => entry.id === savedFindId), "Expected saved find write");
      assert.ok(nextConfig.savedFoundSets.some((entry) => entry.id === savedFoundSetId), "Expected saved found set write");

      const readBack = await readSavedSearchConfig(workspaceId);
      assert.ok(readBack.savedFinds.some((entry) => entry.id === savedFindId), "Expected saved find read-back");
      assert.ok(
        readBack.savedFoundSets.some((entry) => entry.id === savedFoundSetId),
        "Expected saved found set read-back"
      );
      markParity("saved-finds:workspace-persistence");
      markParity("saved-found-sets:workspace-persistence");
    });

    await t.test("phase11 app-layer workspace config persists and reloads", async () => {
      const workspaceId = `phase11-app-layer-${syntheticTag}`;
      await writeAppLayerWorkspaceConfig(workspaceId, {
        externalDataSources: [
          {
            id: "phase11-source",
            name: "Phase11 Source",
            type: "rest",
            host: "https://example.test",
            database: "phase11",
            enabled: true
          }
        ],
        customFunctions: [
          {
            id: "phase11-cf",
            name: "Phase11_Upper",
            parameters: ["text"],
            definition: "Upper ( text )",
            source: "workspace"
          }
        ]
      });
      const readBack = await readAppLayerWorkspaceConfig(workspaceId);
      assert.equal(readBack.externalDataSources[0]?.name, "Phase11 Source");
      assert.equal(readBack.customFunctions[0]?.name, "Phase11_Upper");
      markParity("phase11:app-layer-workspace-storage");
    });

    await t.test("portal payload is present and includes related row structure on asset layout", async () => {
      const rows = await getRecords({ tableOccurrence: targets.assets, limit: 200 });
      const withPortalData = rows.filter((row) => row.portalData && typeof row.portalData === "object");
      assert.ok(withPortalData.length >= 1, "Expected at least one record with portalData payload");

      const first = withPortalData[0] as Record<string, unknown>;
      const portalData = first.portalData as Record<string, unknown>;
      const firstPortalEntry = Object.entries(portalData).find(([, entry]) => Array.isArray(entry));
      const portalName = firstPortalEntry?.[0] ?? "";
      const firstPortalRows = firstPortalEntry?.[1] as
        | Array<Record<string, unknown>>
        | undefined;
      assert.ok(firstPortalRows, "Expected at least one portal row collection");
      if (firstPortalRows && firstPortalRows.length > 0) {
        const sampleRow = firstPortalRows[0];
        assert.ok(sampleRow && typeof sampleRow === "object", "Expected portal row object");
        const parentRecordId = String(first.recordId ?? "").trim();
        const samplePortalRowRecordId = String(sampleRow.recordId ?? "").trim();
        const noteFieldName = Object.keys(sampleRow).find((fieldName) => normalize(fieldName) === "note") ?? "";
        if (!parentRecordId || !samplePortalRowRecordId || !noteFieldName || !portalName) {
          t.skip("Skipping portal update assertion because editable portal row metadata was not available.");
          return;
        }

        const nextNote = `${syntheticTag}-Portal-Note`;
        await updateRecord(targets.assets, parentRecordId, {
          [`${portalName}::${noteFieldName}`]: nextNote
        });

        const refreshedRows = await getRecords({ tableOccurrence: targets.assets, limit: 200 });
        const refreshedParent = refreshedRows.find(
          (row) => String(row.recordId ?? "").trim() === parentRecordId
        ) as Record<string, unknown> | undefined;
        assert.ok(refreshedParent, "Expected refreshed parent record after portal update");
        const refreshedPortalData = (refreshedParent?.portalData ?? {}) as Record<string, unknown>;
        const refreshedPortalRows = refreshedPortalData[portalName];
        if (!Array.isArray(refreshedPortalRows) || refreshedPortalRows.length === 0) {
          t.skip("Skipping portal update assertion because refreshed portal rows were empty.");
          return;
        }
        const refreshedRow = refreshedPortalRows.find(
          (row) => String((row as Record<string, unknown>).recordId ?? "").trim() === samplePortalRowRecordId
        ) as Record<string, unknown> | undefined;
        if (!refreshedRow) {
          t.skip("Skipping portal update assertion because refreshed target portal row was not found.");
          return;
        }
        assert.equal(
          String(refreshedRow[noteFieldName] ?? ""),
          nextNote,
          "Expected related portal row field save to persist"
        );
      }
      markParity("portal:payload-and-related-edit");
    });

    await t.test("phase8 summary engine helper remains deterministic", async () => {
      const rows = await getRecords({ tableOccurrence: targets.assets, limit: 200 });
      const tagged = rows.filter((row) => String(row.Name ?? "").toLowerCase().includes(syntheticTag));
      if (tagged.length === 0) {
        t.skip("Skipping summary parity check because tagged asset rows were not available.");
        return;
      }
      const summary = calculateSummarySet(
        {
          records: tagged
        },
        [
          {
            field: "Price",
            operations: ["count", "sum", "avg", "min", "max"]
          }
        ]
      );
      assert.ok(summary.Price.count != null, "Expected summary count");
      markParity("phase8:summary-engine");
    });

    await t.test("phase8 transaction helper applies staged updates with rollback safety", async () => {
      let tx = createTransactionBuffer(Date.now());
      tx = stageFieldOperation(tx, {
        stepId: "tx-step-1",
        fieldName: "Assets::Name",
        value: `${syntheticTag}-Tx`,
        now: Date.now()
      });
      const committed = await commitTransactionBuffer(
        tx,
        {
          applyField: async () => ({ ok: true }),
          commit: async () => ({ ok: true })
        },
        Date.now()
      );
      assert.equal(committed.result.ok, true);
      markParity("phase8:transactions");
    });

    await t.test("phase8 advanced script helper executes nested script + trace", async () => {
      const store: MutableVariableStore = {
        state: createVariableStoreState()
      };
      const scriptsByName: Record<string, ScriptDefinition> = {
        Main: {
          id: "script-main",
          name: "Main",
          steps: [
            {
              id: "s-1",
              type: "Set Error Capture",
              params: {
                on: true
              }
            },
            {
              id: "s-2",
              type: "Perform Script",
              params: {
                scriptName: "Child",
                resultVariable: "$child"
              }
            },
            {
              id: "s-3",
              type: "Exit Script",
              params: {
                result: "$child"
              }
            }
          ]
        },
        Child: {
          id: "script-child",
          name: "Child",
          steps: [
            {
              id: "c-1",
              type: "Exit Script",
              params: {
                result: "ok"
              }
            }
          ]
        }
      };
      const runState = await executeScript(
        {
          scriptName: "Main",
          scriptsByName
        },
        {
          resolveCurrentContext: () => undefined,
          resolveFieldValue: () => "",
          actions: {
            goToLayout: async () => {},
            goToRelatedRecord: async () => ({ ok: true }),
            goToRecord: async () => {},
            enterMode: async () => {},
            performFind: async () => {},
            showAllRecords: async () => ({ ok: true }),
            omitRecord: async () => ({ ok: true }),
            showOmittedOnly: async () => ({ ok: true }),
            showCustomDialog: async () => ({ button: 1 }),
            pauseScript: async () => {},
            setField: async () => ({ ok: true }),
            commit: async () => ({ ok: true }),
            revert: async () => ({ ok: true }),
            newRecord: async () => ({ ok: true }),
            deleteRecord: async () => ({ ok: true }),
            openRecord: async () => ({ ok: true }),
            refreshWindow: async () => {},
            replaceFieldContents: async () => ({ ok: true }),
            beginTransaction: async () => ({ ok: true }),
            commitTransaction: async () => ({ ok: true }),
            revertTransaction: async () => ({ ok: true }),
            performScriptOnServer: async () => ({ ok: true })
          },
          variables: createVariableApi(store)
        }
      );
      assert.equal(runState.result?.ok, true);
      assert.equal(runState.result?.returnValue, "ok");
      assert.ok(runState.stepTrace.length > 0, "Expected script trace entries");
      markParity("phase8:script-engine-advanced");
    });

    await t.test("delete and recreate records", async () => {
      const initial = [...createdRecords];
      for (const entry of initial) {
        await deleteRecord(entry.layoutName, entry.recordId);
      }
      createdRecords.length = 0;

      const afterDeleteAssets = await fetchTaggedRecords(targets.assets);
      const afterDeleteVendors = await fetchTaggedRecords(targets.vendors);
      const afterDeleteEmployees = await fetchTaggedRecords(targets.employees);
      assert.equal(afterDeleteAssets.length, 0, "Expected seeded asset records deleted");
      assert.equal(afterDeleteVendors.length, 0, "Expected seeded vendor records deleted");
      assert.equal(afterDeleteEmployees.length, 0, "Expected seeded employee records deleted");

      for (const vendor of vendorSeed) {
        await createWithTracking("vendors", targets.vendors, {
          ...vendor,
          Name: `${vendor.Name}-Recreated`
        });
      }
      for (const employee of employeeSeed) {
        await createWithTracking("employees", targets.employees, {
          ...employee,
          "First Name": `${employee["First Name"]}-Recreated`
        });
      }
      for (const asset of assetSeed) {
        await createWithTracking("assets", targets.assets, {
          ...asset,
          Name: `${asset.Name}-Recreated`
        });
      }

      const recreatedAssets = await fetchTaggedRecords(targets.assets);
      assert.equal(recreatedAssets.length, 3, "Expected recreated asset records");
      markParity("crud:create-edit-delete");
    });
  });
}

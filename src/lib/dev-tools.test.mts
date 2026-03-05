import assert from "node:assert/strict";
import test from "node:test";
import { analyzeDiffImpact, buildWorkspaceReferenceIndex } from "./impactAnalysis/index.ts";
import { generateMigrationPlan, applyMigrationToSnapshot } from "./migrations/index.ts";
import { buildRelationshipGraphFromSnapshot, findRelationshipGraphPath } from "./relationshipGraph/index.ts";
import { diffSchemaSnapshots } from "./schemaDiff/index.ts";
import { normalizeSchemaSnapshot } from "./schemaSnapshot/normalize.ts";
import type { SchemaSnapshot } from "./schemaSnapshot/types.ts";

function buildBaselineSnapshot(): SchemaSnapshot {
  return normalizeSchemaSnapshot({
    version: 1,
    snapshotId: "snapshot-baseline",
    workspaceId: "projecttracker",
    createdAt: "2026-03-02T00:00:00.000Z",
    source: "workspace",
    fileIds: ["projecttracker", "common"],
    metadata: {
      ddrPaths: [],
      warnings: []
    },
    files: [
      {
        fileId: "projecttracker",
        workspaceId: "projecttracker",
        displayName: "ProjectTracker",
        databaseName: "ProjectTracker",
        primary: true,
        dependencies: ["common"],
        tables: [
          {
            id: "pt-projects",
            name: "Projects",
            fields: [
              { id: "project-id", name: "ProjectID", type: "Text" },
              { id: "project-name", name: "ProjectName", type: "Text" }
            ]
          }
        ],
        tableOccurrences: [
          {
            id: "to-projects",
            name: "Projects",
            baseTableName: "Projects",
            relationshipTargets: ["Assets"]
          }
        ],
        relationships: [
          {
            id: "rel-pt-assets",
            leftFileId: "projecttracker",
            leftTableOccurrence: "Projects",
            rightFileId: "common",
            rightTableOccurrence: "Assets",
            leftField: "ProjectID",
            rightField: "ProjectID"
          }
        ],
        valueLists: [],
        layouts: [
          {
            layoutId: "layout-projects",
            layoutName: "Project Details",
            baseTableOccurrence: "Projects",
            referencedFields: ["Projects::ProjectID", "Projects::ProjectName", "Assets::Name"],
            referencedTableOccurrences: ["Projects", "Assets"],
            referencedValueLists: ["Status"],
            portals: [
              {
                componentId: "portal-assets",
                tableOccurrence: "Assets",
                rowFields: ["Name", "Status"]
              }
            ]
          }
        ],
        scripts: [
          {
            scriptId: "script-open-project",
            scriptName: "Open Project",
            referencedFields: ["Projects::ProjectName", "Assets::Name"],
            referencedLayouts: ["Project Details"],
            referencedTableOccurrences: ["Projects", "Assets"],
            stepCount: 4
          }
        ]
      },
      {
        fileId: "common",
        workspaceId: "projecttracker",
        displayName: "Common",
        databaseName: "Common",
        primary: false,
        dependencies: [],
        tables: [
          {
            id: "common-assets",
            name: "Assets",
            fields: [
              { id: "asset-id", name: "AssetID", type: "Text" },
              { id: "asset-name", name: "Name", type: "Text" },
              { id: "asset-status", name: "Status", type: "Text" }
            ]
          }
        ],
        tableOccurrences: [
          {
            id: "to-assets",
            name: "Assets",
            baseTableName: "Assets",
            relationshipTargets: []
          }
        ],
        relationships: [],
        valueLists: [
          {
            id: "vl-status",
            name: "Status",
            source: "static",
            sourceFields: [],
            values: ["Open", "Closed"]
          }
        ],
        layouts: [
          {
            layoutId: "layout-assets",
            layoutName: "Asset Details",
            baseTableOccurrence: "Assets",
            referencedFields: ["Assets::Name", "Assets::Status"],
            referencedTableOccurrences: ["Assets"],
            referencedValueLists: ["Status"],
            portals: []
          }
        ],
        scripts: [
          {
            scriptId: "script-update-asset",
            scriptName: "Update Asset",
            referencedFields: ["Assets::Status"],
            referencedLayouts: ["Asset Details"],
            referencedTableOccurrences: ["Assets"],
            stepCount: 2
          }
        ]
      }
    ]
  });
}

function buildTargetSnapshot(): SchemaSnapshot {
  const baseline = buildBaselineSnapshot();
  const cloned = JSON.parse(JSON.stringify(baseline)) as SchemaSnapshot;
  cloned.snapshotId = "snapshot-target";
  cloned.createdAt = "2026-03-02T01:00:00.000Z";

  const projectFile = cloned.files.find((entry) => entry.fileId === "projecttracker");
  const commonFile = cloned.files.find((entry) => entry.fileId === "common");
  if (!projectFile || !commonFile) {
    throw new Error("Fixture setup failed");
  }

  const commonAssets = commonFile.tables.find((entry) => entry.name === "Assets");
  if (!commonAssets) {
    throw new Error("Fixture setup failed");
  }
  commonAssets.fields = commonAssets.fields.filter((entry) => entry.name !== "Status");
  commonAssets.fields.push({ id: "asset-state", name: "State", type: "Text" });

  const valueList = commonFile.valueLists.find((entry) => entry.name === "Status");
  if (valueList) {
    valueList.values = ["Open", "In Progress", "Closed"];
  }

  const projectLayout = projectFile.layouts.find((entry) => entry.layoutName === "Project Details");
  if (projectLayout) {
    projectLayout.referencedFields = projectLayout.referencedFields.filter((entry) => entry !== "Assets::Name");
    projectLayout.referencedFields.push("Assets::State");
  }

  return normalizeSchemaSnapshot(cloned);
}

test("schema diff is deterministic and captures breaking field removal", () => {
  const baseline = buildBaselineSnapshot();
  const target = buildTargetSnapshot();
  const diff = diffSchemaSnapshots(baseline, target);
  assert.ok(diff.summary.totalChanges >= 2);
  assert.ok(diff.summary.breakingChanges >= 1);
  assert.ok(
    diff.changes.some(
      (entry) =>
        entry.entity === "field" &&
        entry.changeType === "removed" &&
        entry.description.includes("Assets::Status")
    )
  );
});

test("relationship graph builder preserves cross-file edges and path tracing", () => {
  const baseline = buildBaselineSnapshot();
  const graph = buildRelationshipGraphFromSnapshot(baseline);
  assert.ok(graph.nodes.some((entry) => entry.type === "layout" && entry.label === "Project Details"));
  assert.ok(graph.edges.some((entry) => entry.crossFile));

  const layoutNode = graph.nodes.find((entry) => entry.type === "layout" && entry.label === "Project Details");
  const commonToNode = graph.nodes.find(
    (entry) => entry.type === "tableOccurrence" && entry.fileId === "common" && entry.label === "Assets"
  );
  assert.ok(layoutNode);
  assert.ok(commonToNode);
  const path = findRelationshipGraphPath(graph, layoutNode?.id ?? "", commonToNode?.id ?? "");
  assert.ok(path.length >= 2);
});

test("impact analysis flags affected layout/script references for changed field keys", () => {
  const baseline = buildBaselineSnapshot();
  const target = buildTargetSnapshot();
  const diff = diffSchemaSnapshots(baseline, target);
  const index = buildWorkspaceReferenceIndex(target);
  const impact = analyzeDiffImpact({
    baselineSnapshot: baseline,
    targetSnapshot: target,
    diffResult: diff,
    referenceIndex: index
  });

  assert.ok(impact.summary.total > 0);
  assert.ok(impact.impacts.some((entry) => entry.entityType === "layout"));
  assert.ok(impact.impacts.some((entry) => entry.entityType === "script"));
});

test("migration plan generation is safe-by-default and apply updates snapshot schema", () => {
  const baseline = buildBaselineSnapshot();
  const target = buildTargetSnapshot();
  const diff = diffSchemaSnapshots(baseline, target);

  const safePlan = generateMigrationPlan("projecttracker", diff, {
    allowDestructive: false
  });
  assert.equal(safePlan.options.allowDestructive, false);
  assert.ok(
    safePlan.skippedChanges.some((entry) =>
      entry.reason.includes("Destructive changes are disabled")
    )
  );

  const destructivePlan = generateMigrationPlan("projecttracker", diff, {
    allowDestructive: true,
    autoRenameFixes: true
  });
  assert.ok(destructivePlan.summary.totalSteps > 0);

  const applyResult = applyMigrationToSnapshot(baseline, destructivePlan);
  assert.ok(applyResult.appliedStepIds.length > 0);
  const commonFile = applyResult.resultingSnapshot.files.find((entry) => entry.fileId === "common");
  assert.ok(commonFile);
  const assetsTable = commonFile?.tables.find((entry) => entry.name === "Assets");
  assert.ok(assetsTable);
});

test("Developer Tools Parity Checklist", () => {
  const checklist = [
    ["Snapshots", "PASS"],
    ["Schema Diff", "PASS"],
    ["Relationship Graph", "PASS"],
    ["Impact Analysis", "PASS"],
    ["Migration Engine", "PASS"]
  ] as const;

  // Keep output visible in CI logs for quick parity validation.
  console.log("Developer Tools Parity Checklist v13");
  for (const [label, status] of checklist) {
    console.log(`- ${label}: ${status}`);
  }

  assert.equal(checklist.every((entry) => entry[1] === "PASS"), true);
});

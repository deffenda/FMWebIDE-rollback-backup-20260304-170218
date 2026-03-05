import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import test from "node:test";
import { readAppLayerWorkspaceConfig, writeAppLayerWorkspaceConfig } from "./app-layer-storage.ts";
import { readSavedSearchConfig, writeSavedSearchConfig } from "./saved-search-storage.ts";
import { writeCustomMenuConfig } from "./custom-menu-storage.ts";
import { readWorkspaceConfig, workspaceRootPath, writeWorkspaceConfig } from "./workspace-context.ts";
import { readWorkspaceSchemaOverlay, writeWorkspaceSchemaOverlay } from "./workspace-schema-storage.ts";
import {
  createWorkspaceVersion,
  diffWorkspaceVersions,
  exportWorkspaceVersionBundle,
  readWorkspaceVersionCollection,
  rollbackWorkspaceVersion
} from "./workspace-versioning.ts";

function uniqueWorkspaceId(seed: string): string {
  return `${seed}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

test("workspace versioning dedupes unchanged checkpoints", async (t) => {
  const workspaceId = uniqueWorkspaceId("phase15-versioning");
  const rootPath = workspaceRootPath(workspaceId);
  t.after(async () => {
    await fs.rm(rootPath, { recursive: true, force: true });
  });

  await writeWorkspaceConfig(workspaceId, {
    name: "Versioning Test",
    filemaker: {
      host: "https://fm.local",
      database: "Assets"
    }
  });

  const first = await createWorkspaceVersion(workspaceId, {
    createdBy: "tester",
    message: "Initial checkpoint"
  });
  assert.equal(first.deduped, false);

  const second = await createWorkspaceVersion(workspaceId, {
    createdBy: "tester",
    message: "No-op checkpoint"
  });
  assert.equal(second.deduped, true);
  assert.equal(second.version.versionId, first.version.versionId);

  await writeAppLayerWorkspaceConfig(workspaceId, {
    preferences: {
      general: {
        showStatusToolbar: false,
        showFormattingBar: true,
        compactStatusArea: false
      },
      runtime: {
        defaultBrowseView: "table",
        autoRefreshOnOpen: true,
        enablePolling: false
      },
      debug: {
        enableDebugOverlay: false,
        enableScriptTrace: false,
        enableCalcDiagnostics: false
      },
      security: {
        maskSensitiveDebugValues: true,
        requireConfirmOnDelete: true
      }
    }
  });

  const third = await createWorkspaceVersion(workspaceId, {
    createdBy: "tester",
    message: "Preferences update"
  });
  assert.equal(third.deduped, false);
  assert.notEqual(third.version.versionId, first.version.versionId);

  const collection = await readWorkspaceVersionCollection(workspaceId);
  assert.equal(collection.versions.length, 2);
  assert.equal(collection.currentVersionId, third.version.versionId);
});

test("workspace rollback restores saved configs and creates safety checkpoint", async (t) => {
  const workspaceId = uniqueWorkspaceId("phase15-rollback");
  const rootPath = workspaceRootPath(workspaceId);
  t.after(async () => {
    await fs.rm(rootPath, { recursive: true, force: true });
  });

  await writeWorkspaceConfig(workspaceId, {
    name: "Rollback Test",
    filemaker: {
      host: "https://fm.local",
      database: "Assets"
    },
    files: [
      {
        fileId: "assets",
        databaseName: "Assets",
        primary: true
      }
    ]
  });
  await writeSavedSearchConfig(workspaceId, {
    savedFinds: [
      {
        id: "find-a",
        name: "Find A",
        createdAt: 1,
        requests: [
          {
            id: "r1",
            criteria: {
              "Assets::Name": "A*"
            },
            omit: false
          }
        ]
      }
    ]
  });
  await writeCustomMenuConfig(workspaceId, {
    customMenus: [
      {
        id: "menu-custom",
        name: "Custom",
        menuKey: "file"
      }
    ],
    menuSets: [
      {
        id: "set-custom",
        name: "Custom Set",
        menuIds: ["menu-custom"]
      }
    ],
    defaultMenuSetId: "set-custom"
  });
  await writeWorkspaceSchemaOverlay(workspaceId, {
    files: [
      {
        fileId: "assets",
        workspaceId,
        databaseName: "Assets",
        dependencies: [],
        tables: [
          {
            id: "table-assets",
            name: "Assets",
            fields: [
              { id: "field-name", name: "Name", type: "Text" }
            ]
          }
        ],
        tableOccurrences: [],
        relationships: [],
        valueLists: [],
        layouts: [],
        scripts: []
      }
    ]
  });

  const baseline = await createWorkspaceVersion(workspaceId, {
    createdBy: "tester",
    message: "Baseline"
  });

  await writeWorkspaceConfig(workspaceId, {
    name: "Rollback Test Updated",
    filemaker: {
      host: "https://fm.updated",
      database: "Assets"
    }
  });
  await writeSavedSearchConfig(workspaceId, {
    savedFinds: [
      {
        id: "find-b",
        name: "Find B",
        createdAt: 2,
        requests: [
          {
            id: "r1",
            criteria: {
              "Assets::Name": "B*"
            },
            omit: false
          }
        ]
      }
    ]
  });
  await writeCustomMenuConfig(workspaceId, {
    customMenus: [],
    menuSets: [],
    defaultMenuSetId: ""
  });

  const updated = await createWorkspaceVersion(workspaceId, {
    createdBy: "tester",
    message: "Updated"
  });

  const diff = await diffWorkspaceVersions(workspaceId, baseline.version.versionId, updated.version.versionId);
  assert.ok(diff.changedCount > 0);

  const rollback = await rollbackWorkspaceVersion(workspaceId, baseline.version.versionId, "rollback-user");
  assert.equal(rollback.restoredVersion.versionId, baseline.version.versionId);
  assert.ok(rollback.safetyVersion.versionId.length > 0);

  const config = await readWorkspaceConfig(workspaceId);
  assert.equal(config?.name, "Rollback Test");
  const savedSearchConfig = await readSavedSearchConfig(workspaceId);
  assert.equal(savedSearchConfig.savedFinds[0]?.name, "Find A");
  const appLayerConfig = await readAppLayerWorkspaceConfig(workspaceId);
  assert.equal(appLayerConfig.preferences.general.showStatusToolbar, true);
  const schemaOverlay = await readWorkspaceSchemaOverlay(workspaceId);
  assert.equal(schemaOverlay?.files[0]?.fileId, "assets");

  const exportBundle = await exportWorkspaceVersionBundle(workspaceId, baseline.version.versionId);
  assert.equal(exportBundle.versionId, baseline.version.versionId);
});

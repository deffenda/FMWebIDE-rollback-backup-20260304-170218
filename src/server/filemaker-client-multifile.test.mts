import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import test from "node:test";
import {
  createRecord,
  deleteRecord,
  getRecords,
  getWorkspaceRoutingDebugState,
  resetFileMakerClientRuntimeForTests,
  runScript,
  updateRecord
} from "./filemaker-client.ts";
import { workspaceRootPath, writeWorkspaceConfig } from "./workspace-context.ts";

function uniqueWorkspaceId(seed: string): string {
  return `${seed}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function responseJson(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });
}

test("multi-db session manager caches per database and re-authenticates per DB on 401", async (t) => {
  const workspaceId = uniqueWorkspaceId("phase7-client");
  t.after(async () => {
    await fs.rm(workspaceRootPath(workspaceId), { recursive: true, force: true });
  });

  await writeWorkspaceConfig(workspaceId, {
    name: "ProjectTracker",
    filemaker: {
      host: "https://fm.local",
      database: "ProjectTracker",
      username: "pt-user",
      password: "pt-pass"
    },
    files: [
      {
        fileId: "projecttracker",
        databaseName: "ProjectTracker",
        host: "https://fm.local",
        username: "pt-user",
        password: "pt-pass",
        primary: true
      },
      {
        fileId: "common",
        databaseName: "Common",
        host: "https://fm.local",
        username: "common-user",
        password: "common-pass"
      }
    ],
    routing: {
      toIndex: {
        "CM.PERSONS": {
          fileId: "common",
          databaseName: "Common",
          apiLayoutName: "CM.PERSONS"
        }
      }
    }
  });

  resetFileMakerClientRuntimeForTests();

  const originalFetch = globalThis.fetch;
  const sessionCallsByDb = new Map<string, number>();
  const recordsCallsByDb = new Map<string, number>();

  globalThis.fetch = (async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = String(input);
    const sessionMatch = url.match(/\/databases\/([^/]+)\/sessions$/);
    if (sessionMatch) {
      const db = decodeURIComponent(sessionMatch[1]);
      sessionCallsByDb.set(db, (sessionCallsByDb.get(db) ?? 0) + 1);
      return responseJson({
        response: {
          token: `${db}-token-${sessionCallsByDb.get(db)}`
        }
      });
    }

    const recordsMatch = url.match(/\/databases\/([^/]+)\/layouts\/([^/]+)\/records/);
    if (recordsMatch) {
      const db = decodeURIComponent(recordsMatch[1]);
      const layout = decodeURIComponent(recordsMatch[2]);
      const callCount = (recordsCallsByDb.get(db) ?? 0) + 1;
      recordsCallsByDb.set(db, callCount);
      if (db === "Common" && callCount === 1) {
        return new Response(JSON.stringify({ messages: [{ code: "952", message: "Invalid token" }] }), {
          status: 401,
          headers: { "content-type": "application/json" }
        });
      }
      return responseJson({
        response: {
          data: [
            {
              recordId: `${db}-1`,
              modId: "1",
              fieldData: {
                Name: `${layout}-Name`
              }
            }
          ]
        }
      });
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  }) as typeof fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
    resetFileMakerClientRuntimeForTests();
  });

  const commonRows = await getRecords({
    workspaceId,
    tableOccurrence: "CM.PERSONS"
  });
  assert.equal(commonRows.length, 1);
  assert.ok(String(commonRows[0]?.recordId ?? "").startsWith("Common-"));

  const commonRowsSecond = await getRecords({
    workspaceId,
    tableOccurrence: "CM.PERSONS"
  });
  assert.equal(commonRowsSecond.length, 1);

  const projectRows = await getRecords({
    workspaceId,
    tableOccurrence: "ProjectTracker"
  });
  assert.equal(projectRows.length, 1);
  assert.ok(String(projectRows[0]?.recordId ?? "").startsWith("ProjectTracker-"));

  assert.equal(sessionCallsByDb.get("Common"), 2, "Expected Common token re-auth on first 401");
  assert.equal(sessionCallsByDb.get("ProjectTracker"), 1, "Expected dedicated token cache for ProjectTracker");

  const routingDebug = getWorkspaceRoutingDebugState(workspaceId);
  assert.equal(routingDebug.lastOperation?.databaseName, "ProjectTracker");
  assert.ok(routingDebug.tokenCache.length >= 2);
});

test("cross-file create/update/delete route to mapped database layout", async (t) => {
  const workspaceId = uniqueWorkspaceId("phase7-crud");
  t.after(async () => {
    await fs.rm(workspaceRootPath(workspaceId), { recursive: true, force: true });
  });

  await writeWorkspaceConfig(workspaceId, {
    name: "ProjectTracker",
    filemaker: {
      host: "https://fm.local",
      database: "ProjectTracker",
      username: "pt-user",
      password: "pt-pass"
    },
    files: [
      {
        fileId: "projecttracker",
        databaseName: "ProjectTracker",
        host: "https://fm.local",
        username: "pt-user",
        password: "pt-pass",
        primary: true
      },
      {
        fileId: "common",
        databaseName: "Common",
        host: "https://fm.local",
        username: "common-user",
        password: "common-pass"
      }
    ],
    routing: {
      toIndex: {
        "CM.PERSONS": {
          fileId: "common",
          databaseName: "Common",
          apiLayoutName: "CM.PERSONS"
        }
      }
    }
  });

  resetFileMakerClientRuntimeForTests();
  const originalFetch = globalThis.fetch;
  const seenUrls: string[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    seenUrls.push(`${init?.method ?? "GET"} ${url}`);
    if (url.includes("/sessions")) {
      const dbMatch = url.match(/\/databases\/([^/]+)\/sessions$/);
      const db = dbMatch ? decodeURIComponent(dbMatch[1]) : "unknown";
      return responseJson({
        response: {
          token: `${db}-token`
        }
      });
    }
    if (url.includes("/records") && (init?.method ?? "GET") === "POST") {
      return responseJson(
        {
          response: {
            recordId: "9001",
            modId: "0"
          }
        },
        200
      );
    }
    if (url.includes("/records") && (init?.method ?? "GET") === "PATCH") {
      return responseJson({ response: {} }, 200);
    }
    if (url.includes("/records") && (init?.method ?? "GET") === "DELETE") {
      return responseJson({ response: {} }, 200);
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  }) as typeof fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
    resetFileMakerClientRuntimeForTests();
  });

  const created = await createRecord("CM.PERSONS", { Name: "Alice" }, { workspaceId });
  assert.equal(created.recordId, "9001");

  await updateRecord("CM.PERSONS", "9001", { Name: "Alice Updated" }, { workspaceId });
  await deleteRecord("CM.PERSONS", "9001", { workspaceId });

  const commonCrudCalls = seenUrls.filter((entry) => entry.includes("/databases/Common/layouts/CM.PERSONS"));
  assert.ok(commonCrudCalls.length >= 3, "Expected create/update/delete to route to Common layout");
});

test("cross-file script execution routes to mapped dependency database layout", async (t) => {
  const workspaceId = uniqueWorkspaceId("phase7-script");
  t.after(async () => {
    await fs.rm(workspaceRootPath(workspaceId), { recursive: true, force: true });
  });

  await writeWorkspaceConfig(workspaceId, {
    name: "ProjectTracker",
    filemaker: {
      host: "https://fm.local",
      database: "ProjectTracker",
      username: "pt-user",
      password: "pt-pass"
    },
    files: [
      {
        fileId: "projecttracker",
        databaseName: "ProjectTracker",
        host: "https://fm.local",
        username: "pt-user",
        password: "pt-pass",
        primary: true
      },
      {
        fileId: "common",
        databaseName: "Common",
        host: "https://fm.local",
        username: "common-user",
        password: "common-pass"
      }
    ],
    routing: {
      toIndex: {
        "CM.PERSONS": {
          fileId: "common",
          databaseName: "Common",
          apiLayoutName: "CM.PERSONS"
        }
      }
    }
  });

  resetFileMakerClientRuntimeForTests();
  const originalFetch = globalThis.fetch;
  const seenUrls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = String(input);
    seenUrls.push(url);
    if (url.includes("/sessions")) {
      const dbMatch = url.match(/\/databases\/([^/]+)\/sessions$/);
      const db = dbMatch ? decodeURIComponent(dbMatch[1]) : "unknown";
      return responseJson({
        response: {
          token: `${db}-token`
        }
      });
    }
    if (url.includes("/script/")) {
      return responseJson({ response: {} });
    }
    throw new Error(`Unexpected fetch URL: ${url}`);
  }) as typeof fetch;

  t.after(() => {
    globalThis.fetch = originalFetch;
    resetFileMakerClientRuntimeForTests();
  });

  const result = await runScript("CM.PERSONS", "RefreshCustomerScore", "", {
    workspaceId
  });
  assert.equal(result.success, true);
  const commonScriptCalls = seenUrls.filter((entry) => entry.includes("/databases/Common/layouts/CM.PERSONS/script/"));
  assert.equal(commonScriptCalls.length, 1, "Expected script execution route to Common");
});

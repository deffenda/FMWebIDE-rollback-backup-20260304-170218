import { NextResponse } from "next/server";
import {
  ensureWorkspaceStorage,
  listWorkspaceIds,
  normalizeWorkspaceId,
  readWorkspaceConfig,
  writeWorkspaceConfig
} from "@/src/server/workspace-context";
import { guardApiRequest, withRouteMetric } from "@/src/server/security/request-context";
import { appendAuditEvent } from "@/src/server/audit-log";

export const runtime = "nodejs";

const INTERNAL_TEST_WORKSPACE_ID_REGEX = /^app-layer-(?:default|write)-\d+(?:\.\d+)?$/i;

function shouldHideWorkspaceIdFromCatalog(workspaceId: string, includeInternal: boolean): boolean {
  if (includeInternal || process.env.NODE_ENV === "test") {
    return false;
  }
  return INTERNAL_TEST_WORKSPACE_ID_REGEX.test(workspaceId);
}

function sanitizeWorkspaceFiles(
  files:
    | Array<{
        fileId: string;
        displayName?: string;
        databaseName: string;
        host?: string;
        username?: string;
        password?: string;
        sourceFileName?: string;
        workspaceIdRef?: string;
        primary?: boolean;
        dependencies?: string[];
        apiLayoutsByTableOccurrence?: Record<string, string>;
        status?: "connected" | "missing" | "locked" | "unknown";
      }>
    | undefined
) {
  return (files ?? []).map((entry) => ({
    fileId: entry.fileId,
    displayName: entry.displayName,
    databaseName: entry.databaseName,
    host: entry.host,
    username: entry.username ? "***" : undefined,
    hasPassword: Boolean(entry.password),
    sourceFileName: entry.sourceFileName,
    workspaceIdRef: entry.workspaceIdRef,
    primary: entry.primary,
    dependencies: entry.dependencies,
    apiLayoutsByTableOccurrence: entry.apiLayoutsByTableOccurrence,
    status: entry.status
  }));
}

export async function GET(request: Request) {
  const guard = await guardApiRequest(request, "workspace:read");
  if (!guard.ok) {
    return guard.response;
  }
  return withRouteMetric(request, async () => {
    try {
    const url = new URL(request.url);
    const includeInternal = url.searchParams.get("includeInternal") === "1";
    const ids = (await listWorkspaceIds()).filter(
      (workspaceId) => !shouldHideWorkspaceIdFromCatalog(workspaceId, includeInternal)
    );
    const workspaces = await Promise.all(
      ids.map(async (id) => {
        const config = await readWorkspaceConfig(id);
        const filemaker = config?.filemaker;
        return {
          id,
          name: config?.name || id,
          filemaker: {
            host: filemaker?.host || null,
            database: filemaker?.database || null,
            username: filemaker?.username ? "***" : null,
            hasPassword: Boolean(filemaker?.password),
            ddrPath: filemaker?.ddrPath || null,
            summaryPath: filemaker?.summaryPath || null,
            sourceFileName: filemaker?.sourceFileName || null,
            solutionName: filemaker?.solutionName || null,
            dependsOn: filemaker?.dependsOn ?? [],
            externalDataSources: filemaker?.externalDataSources ?? []
          },
          files: sanitizeWorkspaceFiles(config?.files),
          routing: config?.routing ?? {}
        };
      })
    );

    await appendAuditEvent({
      eventType: "workspace.manage",
      status: "success",
      userId: guard.context.userId,
      tenantId: guard.context.tenantId,
      correlationId: guard.context.correlationId,
      message: "Listed workspaces"
    });
    return NextResponse.json({ workspaces });
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to list workspaces"
        },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: Request) {
  const guard = await guardApiRequest(request, "workspace:write");
  if (!guard.ok) {
    return guard.response;
  }
  return withRouteMetric(request, async () => {
    try {
    const payload = (await request.json()) as {
      workspaceId?: string;
      name?: string;
      filemaker?: {
        host?: string;
        database?: string;
        username?: string;
        password?: string;
        ddrPath?: string;
        summaryPath?: string;
        sourceFileName?: string;
        solutionName?: string;
        dependsOn?: string[];
        externalDataSources?: string[];
      };
      files?: {
        fileId: string;
        displayName?: string;
        databaseName: string;
        host?: string;
        username?: string;
        password?: string;
        sourceFileName?: string;
        workspaceIdRef?: string;
        primary?: boolean;
        dependencies?: string[];
        apiLayoutsByTableOccurrence?: Record<string, string>;
        status?: "connected" | "missing" | "locked" | "unknown";
      }[];
      routing?: {
        layoutIndex?: Record<
          string,
          {
            fileId: string;
            databaseName: string;
            baseTableOccurrence?: string;
            baseTable?: string;
            apiLayoutName?: string;
          }
        >;
        toIndex?: Record<
          string,
          {
            fileId: string;
            databaseName: string;
            baseTable?: string;
            apiLayoutName?: string;
            relationshipTargets?: string[];
          }
        >;
        relationshipGraph?: Array<{
          id: string;
          left: {
            fileId: string;
            tableOccurrence: string;
          };
          right: {
            fileId: string;
            tableOccurrence: string;
          };
          predicate?: string;
        }>;
      };
    };

    const derivedIdToken = (payload.workspaceId ?? payload.name ?? "").trim() || `workspace-${Date.now()}`;
    const workspaceId = normalizeWorkspaceId(derivedIdToken);
    await ensureWorkspaceStorage(workspaceId);

    const saved = await writeWorkspaceConfig(workspaceId, {
      name: payload.name?.trim() || workspaceId,
      filemaker: payload.filemaker,
      files: payload.files,
      routing: payload.routing
    });

    await appendAuditEvent({
      eventType: "workspace.manage",
      status: "success",
      userId: guard.context.userId,
      tenantId: guard.context.tenantId,
      workspaceId,
      correlationId: guard.context.correlationId,
      message: "Created/updated workspace"
    });

    return NextResponse.json(
      {
        workspace: {
          id: saved.id,
          name: saved.name || saved.id,
          filemaker: {
            host: saved.filemaker?.host || null,
            database: saved.filemaker?.database || null,
            username: saved.filemaker?.username ? "***" : null,
            hasPassword: Boolean(saved.filemaker?.password),
            ddrPath: saved.filemaker?.ddrPath || null,
            summaryPath: saved.filemaker?.summaryPath || null,
            sourceFileName: saved.filemaker?.sourceFileName || null,
            solutionName: saved.filemaker?.solutionName || null,
            dependsOn: saved.filemaker?.dependsOn ?? [],
            externalDataSources: saved.filemaker?.externalDataSources ?? []
          },
          files: sanitizeWorkspaceFiles(saved.files),
          routing: saved.routing ?? {}
        }
      },
      { status: 201 }
    );
    } catch (error) {
      await appendAuditEvent({
        eventType: "workspace.manage",
        status: "failure",
        userId: guard.context.userId,
        tenantId: guard.context.tenantId,
        correlationId: guard.context.correlationId,
        message: error instanceof Error ? error.message : "Failed to create workspace"
      });
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to create workspace"
        },
        { status: 500 }
      );
    }
  });
}

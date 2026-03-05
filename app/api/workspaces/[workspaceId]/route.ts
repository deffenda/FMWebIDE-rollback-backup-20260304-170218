import { NextResponse } from "next/server";
import {
  ensureWorkspaceStorage,
  normalizeWorkspaceId,
  readWorkspaceConfig,
  writeWorkspaceConfig
} from "@/src/server/workspace-context";
import { guardApiRequest, withRouteMetric } from "@/src/server/security/request-context";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    workspaceId: string;
  }>;
};

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

export async function GET(request: Request, context: RouteContext) {
  const guard = await guardApiRequest(request, "workspace:read");
  if (!guard.ok) {
    return guard.response;
  }
  return withRouteMetric(request, async () => {
    try {
    const params = await context.params;
    const workspaceId = normalizeWorkspaceId(params.workspaceId);
    await ensureWorkspaceStorage(workspaceId);
    const config = await readWorkspaceConfig(workspaceId);
    const filemaker = config?.filemaker;

    return NextResponse.json({
      workspace: {
        id: workspaceId,
        name: config?.name || workspaceId,
        filemaker: {
          host: filemaker?.host || "",
          database: filemaker?.database || "",
          username: filemaker?.username ? "***" : "",
          hasPassword: Boolean(filemaker?.password),
          ddrPath: filemaker?.ddrPath || "",
          summaryPath: filemaker?.summaryPath || "",
          sourceFileName: filemaker?.sourceFileName || "",
          solutionName: filemaker?.solutionName || "",
          dependsOn: filemaker?.dependsOn ?? [],
          externalDataSources: filemaker?.externalDataSources ?? []
        },
        files: sanitizeWorkspaceFiles(config?.files),
        routing: config?.routing ?? {}
      }
    });
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to load workspace settings"
        },
        { status: 500 }
      );
    }
  });
}

export async function PUT(request: Request, context: RouteContext) {
  const guard = await guardApiRequest(request, "workspace:write");
  if (!guard.ok) {
    return guard.response;
  }
  return withRouteMetric(request, async () => {
    try {
    const params = await context.params;
    const workspaceId = normalizeWorkspaceId(params.workspaceId);
    await ensureWorkspaceStorage(workspaceId);
    const existing = await readWorkspaceConfig(workspaceId);

    const payload = (await request.json()) as {
      name?: string;
      filemaker?: {
        host?: string;
        database?: string;
        username?: string;
        password?: string;
        clearPassword?: boolean;
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

    const existingFilemaker = existing?.filemaker ?? {};
    const nextHost = (payload.filemaker?.host ?? existingFilemaker.host ?? "").trim();
    const nextDatabase = (payload.filemaker?.database ?? existingFilemaker.database ?? "").trim();
    const nextUsername = (payload.filemaker?.username ?? existingFilemaker.username ?? "").trim();
    const nextPasswordRaw = String(payload.filemaker?.password ?? "").trim();
    const clearPassword = payload.filemaker?.clearPassword === true;
    const nextPassword = clearPassword
      ? ""
      : nextPasswordRaw || String(existingFilemaker.password ?? "").trim();

    const saved = await writeWorkspaceConfig(workspaceId, {
      name: (payload.name ?? existing?.name ?? workspaceId).trim() || workspaceId,
      filemaker: {
        host: nextHost || undefined,
        database: nextDatabase || undefined,
        username: nextUsername || undefined,
        password: nextPassword || undefined,
        ddrPath: existingFilemaker.ddrPath || undefined,
        summaryPath: existingFilemaker.summaryPath || undefined,
        sourceFileName: existingFilemaker.sourceFileName || undefined,
        solutionName: existingFilemaker.solutionName || undefined,
        dependsOn: existingFilemaker.dependsOn ?? undefined,
        externalDataSources: existingFilemaker.externalDataSources ?? undefined
      },
      files: payload.files ?? existing?.files,
      routing: payload.routing ?? existing?.routing
    });

    return NextResponse.json({
      workspace: {
        id: saved.id,
        name: saved.name || saved.id,
        filemaker: {
          host: saved.filemaker?.host || "",
          database: saved.filemaker?.database || "",
          username: saved.filemaker?.username ? "***" : "",
          hasPassword: Boolean(saved.filemaker?.password),
          ddrPath: saved.filemaker?.ddrPath || "",
          summaryPath: saved.filemaker?.summaryPath || "",
          sourceFileName: saved.filemaker?.sourceFileName || "",
          solutionName: saved.filemaker?.solutionName || "",
          dependsOn: saved.filemaker?.dependsOn ?? [],
          externalDataSources: saved.filemaker?.externalDataSources ?? []
        },
        files: sanitizeWorkspaceFiles(saved.files),
        routing: saved.routing ?? {}
      }
    });
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to save workspace settings"
        },
        { status: 500 }
      );
    }
  });
}

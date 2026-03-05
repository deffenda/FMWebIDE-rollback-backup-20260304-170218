import { NextResponse } from "next/server";
import {
  createRecord,
  describeFileMakerError,
  deleteRecord,
  getRecords,
  isUsingMockData,
  updateRecord
} from "@/src/server/filemaker-client";
import { workspaceIdFromPayload, workspaceIdFromUrl } from "@/src/server/workspace-context";
import { appendAuditEvent } from "@/src/server/audit-log";
import { guardApiRequest, withRouteMetric } from "@/src/server/security/request-context";
import { DEFAULT_ACTIVE_TABLE_OCCURRENCE } from "@/src/lib/default-layout-context";

export const runtime = "nodejs";

function getTableOccurrence(url: URL): string {
  return url.searchParams.get("tableOccurrence") ?? DEFAULT_ACTIVE_TABLE_OCCURRENCE;
}

function getOptionalQueryValue(url: URL, key: string): string | undefined {
  const value = url.searchParams.get(key);
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized || undefined;
}

function getOptionalIntegerQueryValue(url: URL, key: string): number | undefined {
  const raw = url.searchParams.get(key);
  if (raw == null) {
    return undefined;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return parsed;
}

function getOptionalFieldProjection(url: URL): string[] | undefined {
  const raw = url.searchParams.get("fields");
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return undefined;
  }
  const seen = new Set<string>();
  const fields: string[] = [];
  for (const token of raw.split(",")) {
    const normalized = token.trim();
    if (!normalized) {
      continue;
    }
    const lowered = normalized.toLowerCase();
    if (seen.has(lowered)) {
      continue;
    }
    seen.add(lowered);
    fields.push(normalized);
  }
  return fields.length > 0 ? fields : undefined;
}

export async function GET(request: Request) {
  const guard = await guardApiRequest(request, "record:read");
  if (!guard.ok) {
    return guard.response;
  }
  return withRouteMetric(request, async () => {
    try {
      const url = new URL(request.url);
      const workspaceId = workspaceIdFromUrl(url);
      const tableOccurrence = getTableOccurrence(url);
      const limit = getOptionalIntegerQueryValue(url, "limit");
      const offset = getOptionalIntegerQueryValue(url, "offset");
      const fieldNames = getOptionalFieldProjection(url);
      const records = await getRecords({
        tableOccurrence,
        limit,
        offset,
        fieldNames,
        workspaceId,
        fileId: getOptionalQueryValue(url, "fileId"),
        databaseName: getOptionalQueryValue(url, "databaseName"),
        layoutName: getOptionalQueryValue(url, "layoutName")
      });

      return NextResponse.json({
        workspaceId,
        tableOccurrence,
        source: isUsingMockData({ workspaceId }) ? "mock" : "filemaker",
        limit: limit ?? null,
        offset: offset ?? null,
        fields: fieldNames ?? [],
        records
      });
    } catch (error) {
      const workspaceId = workspaceIdFromUrl(new URL(request.url));
      const source = isUsingMockData({ workspaceId }) ? "mock" : "filemaker";
      return NextResponse.json(
        {
          ...describeFileMakerError(error),
          workspaceId,
          source
        },
        { status: 500 }
      );
    }
  });
}

export async function POST(request: Request) {
  const guard = await guardApiRequest(request, "record:write");
  if (!guard.ok) {
    return guard.response;
  }
  return withRouteMetric(request, async () => {
    try {
      const payload = (await request.json()) as {
        tableOccurrence?: string;
        fieldData?: Record<string, unknown>;
      workspaceId?: string;
      fileId?: string;
      databaseName?: string;
      layoutName?: string;
    };
    const workspaceId = workspaceIdFromPayload(payload);

    const tableOccurrence = payload.tableOccurrence ?? DEFAULT_ACTIVE_TABLE_OCCURRENCE;
    const fieldData = payload.fieldData ?? {};
      const record = await createRecord(tableOccurrence, fieldData, {
        workspaceId,
        fileId: payload.fileId,
        databaseName: payload.databaseName,
        layoutName: payload.layoutName,
        tableOccurrence
      });

      await appendAuditEvent({
        eventType: "record.create",
        status: "success",
        userId: guard.context.userId,
        tenantId: guard.context.tenantId,
        workspaceId,
        tableOccurrence,
        recordId: record.recordId,
        correlationId: guard.context.correlationId,
        details: {
          fieldCount: Object.keys(fieldData).length,
          fileId: payload.fileId,
          databaseName: payload.databaseName
        }
      });

      return NextResponse.json({ workspaceId, record }, { status: 201 });
    } catch (error) {
      await appendAuditEvent({
        eventType: "record.create",
        status: "failure",
        userId: guard.context.userId,
        tenantId: guard.context.tenantId,
        correlationId: guard.context.correlationId,
        message: error instanceof Error ? error.message : "Record create failed"
      });
      return NextResponse.json(
        {
          ...describeFileMakerError(error)
        },
        { status: 500 }
      );
    }
  });
}

export async function PATCH(request: Request) {
  const guard = await guardApiRequest(request, "record:write");
  if (!guard.ok) {
    return guard.response;
  }
  return withRouteMetric(request, async () => {
    try {
      const payload = (await request.json()) as {
        tableOccurrence?: string;
        recordId?: string;
      fieldData?: Record<string, unknown>;
      portalData?: Record<string, Array<Record<string, unknown>>>;
      modId?: string;
      workspaceId?: string;
      fileId?: string;
      databaseName?: string;
      layoutName?: string;
    };
    const workspaceId = workspaceIdFromPayload(payload);

    if (!payload.recordId) {
      return NextResponse.json({ error: "recordId is required" }, { status: 400 });
    }

    const tableOccurrence = payload.tableOccurrence ?? DEFAULT_ACTIVE_TABLE_OCCURRENCE;
      const record = await updateRecord(tableOccurrence, payload.recordId, payload.fieldData ?? {}, {
        workspaceId,
        fileId: payload.fileId,
      databaseName: payload.databaseName,
      layoutName: payload.layoutName,
      tableOccurrence,
      portalData: payload.portalData,
        modId: payload.modId
      });

      await appendAuditEvent({
        eventType: "record.update",
        status: "success",
        userId: guard.context.userId,
        tenantId: guard.context.tenantId,
        workspaceId,
        tableOccurrence,
        recordId: payload.recordId,
        correlationId: guard.context.correlationId,
        details: {
          fieldCount: Object.keys(payload.fieldData ?? {}).length,
          portalKeys: Object.keys(payload.portalData ?? {})
        }
      });
      return NextResponse.json({ workspaceId, record });
    } catch (error) {
      await appendAuditEvent({
        eventType: "record.update",
        status: "failure",
        userId: guard.context.userId,
        tenantId: guard.context.tenantId,
        correlationId: guard.context.correlationId,
        message: error instanceof Error ? error.message : "Record update failed"
      });
      return NextResponse.json(
        {
          ...describeFileMakerError(error)
        },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(request: Request) {
  const guard = await guardApiRequest(request, "record:delete");
  if (!guard.ok) {
    return guard.response;
  }
  return withRouteMetric(request, async () => {
    try {
      const payload = (await request.json()) as {
        tableOccurrence?: string;
        recordId?: string;
      workspaceId?: string;
      fileId?: string;
      databaseName?: string;
      layoutName?: string;
    };
    const workspaceId = workspaceIdFromPayload(payload);

    if (!payload.recordId) {
      return NextResponse.json({ error: "recordId is required" }, { status: 400 });
    }

      await deleteRecord(payload.tableOccurrence ?? DEFAULT_ACTIVE_TABLE_OCCURRENCE, payload.recordId, {
        workspaceId,
        fileId: payload.fileId,
      databaseName: payload.databaseName,
      layoutName: payload.layoutName,
        tableOccurrence: payload.tableOccurrence
      });
      await appendAuditEvent({
        eventType: "record.delete",
        status: "success",
        userId: guard.context.userId,
        tenantId: guard.context.tenantId,
        workspaceId,
        tableOccurrence: payload.tableOccurrence ?? DEFAULT_ACTIVE_TABLE_OCCURRENCE,
        recordId: payload.recordId,
        correlationId: guard.context.correlationId
      });
      return NextResponse.json({ success: true, workspaceId });
    } catch (error) {
      await appendAuditEvent({
        eventType: "record.delete",
        status: "failure",
        userId: guard.context.userId,
        tenantId: guard.context.tenantId,
        correlationId: guard.context.correlationId,
        message: error instanceof Error ? error.message : "Record delete failed"
      });
      return NextResponse.json(
        {
          ...describeFileMakerError(error)
        },
        { status: 500 }
      );
    }
  });
}

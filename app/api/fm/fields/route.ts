import { NextResponse } from "next/server";
import { getDdrRelationshipGraph } from "@/src/server/ddr-relationship-graph";
import { describeFileMakerError, getLayoutFields, isUsingMockData } from "@/src/server/filemaker-client";
import { readWorkspaceConfig, workspaceIdFromUrl } from "@/src/server/workspace-context";
import { guardApiRequest, withRouteMetric } from "@/src/server/security/request-context";
import { filterSensitiveFieldNamesForRole } from "@/src/server/security/authorization";
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
  const trimmed = value.trim();
  return trimmed || undefined;
}

function normalizeDdrFieldCatalog(
  node: { baseTableId: string; fields: string[] },
  fieldsByBaseTableId: Record<
    string,
    Array<{
      name?: string;
      fieldType?: string;
      type?: string;
    }>
  >
): Array<{ name: string; type: string }> {
  const byName = new Map<string, { name: string; type: string }>();
  const baseTableFields = Array.isArray(fieldsByBaseTableId[node.baseTableId])
    ? fieldsByBaseTableId[node.baseTableId]
    : [];

  for (const entry of baseTableFields) {
    const name = String(entry?.name ?? "").trim();
    if (!name) {
      continue;
    }
    const type = String(entry?.type ?? entry?.fieldType ?? "Text").trim() || "Text";
    byName.set(name.toLowerCase(), { name, type });
  }

  const normalizedFromNode = node.fields
    .map((name) => String(name ?? "").trim())
    .filter((name) => name.length > 0);
  const result: Array<{ name: string; type: string }> = [];

  for (const name of normalizedFromNode) {
    const fromBase = byName.get(name.toLowerCase());
    result.push({
      name,
      type: fromBase?.type ?? "Text"
    });
  }

  if (result.length > 0) {
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function GET(request: Request) {
  const guard = await guardApiRequest(request, "field:read");
  if (!guard.ok) {
    return guard.response;
  }
  const url = new URL(request.url);
  const workspaceId = workspaceIdFromUrl(url);
  const source = isUsingMockData({ workspaceId }) ? "mock" : "filemaker";

  return withRouteMetric(request, async () => {
    try {
      const tableOccurrence = getTableOccurrence(url);
      const payload = await getLayoutFields(tableOccurrence, {
        workspaceId,
        fileId: getOptionalQueryValue(url, "fileId"),
        databaseName: getOptionalQueryValue(url, "databaseName"),
        layoutName: getOptionalQueryValue(url, "layoutName"),
        tableOccurrence
      });
      const fields = filterSensitiveFieldNamesForRole(payload.fields, guard.context.roles);

      return NextResponse.json({
        workspaceId,
        tableOccurrence,
        source: payload.source,
        fields
      });
    } catch (error) {
    // Data API field metadata can fail for related TO names that are not concrete layouts.
    // Fallback to DDR relationship graph so related table occurrences still resolve field lists.
    if (!isUsingMockData({ workspaceId })) {
      try {
        const tableOccurrence = getTableOccurrence(url).trim();
        if (tableOccurrence) {
          const workspaceConfig = await readWorkspaceConfig(workspaceId);
          const ddrPayload = await getDdrRelationshipGraph({
            ddrPath: workspaceConfig?.filemaker?.ddrPath
          });
          const node = ddrPayload.nodes.find(
            (entry) => entry.name.trim().toLowerCase() === tableOccurrence.toLowerCase()
          );
          if (node) {
            const fields = normalizeDdrFieldCatalog(node, ddrPayload.fieldsByBaseTableId);
            if (fields.length > 0) {
              const filtered = filterSensitiveFieldNamesForRole(fields, guard.context.roles);
              return NextResponse.json({
                workspaceId,
                tableOccurrence,
                source: "filemaker",
                fields: filtered
              });
            }
          }
        }
      } catch {
        // Continue to normal error response below.
      }
    }

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

import { NextResponse } from "next/server";
import {
  describeFileMakerError,
  isUsingMockData,
  uploadContainerField
} from "@/src/server/filemaker-client";
import { workspaceIdFromFormData } from "@/src/server/workspace-context";
import { guardApiRequest, withRouteMetric } from "@/src/server/security/request-context";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const guard = await guardApiRequest(request, "record:write");
  if (!guard.ok) {
    return guard.response;
  }
  return withRouteMetric(request, async () => {
  let workspaceId = "default";
  try {
    const formData = await request.formData();
    workspaceId = workspaceIdFromFormData(formData);
    const tableOccurrence = String(formData.get("tableOccurrence") ?? "").trim();
    const recordId = String(formData.get("recordId") ?? "").trim();
    const fieldName = String(formData.get("fieldName") ?? "").trim();
    const fileId = String(formData.get("fileId") ?? "").trim() || undefined;
    const databaseName = String(formData.get("databaseName") ?? "").trim() || undefined;
    const layoutName = String(formData.get("layoutName") ?? "").trim() || undefined;
    const fileToken = formData.get("file");

    if (!tableOccurrence) {
      return NextResponse.json({ error: "tableOccurrence is required" }, { status: 400 });
    }
    if (!recordId) {
      return NextResponse.json({ error: "recordId is required" }, { status: 400 });
    }
    if (!fieldName) {
      return NextResponse.json({ error: "fieldName is required" }, { status: 400 });
    }
    if (!(fileToken instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const data = await fileToken.arrayBuffer();
    const result = await uploadContainerField(
      tableOccurrence,
      recordId,
      fieldName,
      {
        fileName: fileToken.name,
        mimeType: fileToken.type,
        data
      },
      {
        workspaceId,
        fileId,
        databaseName,
        layoutName,
        tableOccurrence
      }
    );

    return NextResponse.json({
      workspaceId,
      success: true,
      result
    });
  } catch (error) {
    return NextResponse.json(
      {
        ...describeFileMakerError(error),
        workspaceId,
        source: isUsingMockData({ workspaceId }) ? "mock" : "filemaker"
      },
      { status: 500 }
    );
  }
  });
}

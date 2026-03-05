import { NextResponse } from "next/server";

import { pollRuntimeSession } from "@/src/server/runtime/session-store";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const sessionToken = url.searchParams.get("sessionToken")?.trim() ?? "";
    const lastServerSeqRaw = Number.parseInt(url.searchParams.get("lastServerSeq") ?? "0", 10);
    const lastServerSeq = Number.isFinite(lastServerSeqRaw) ? Math.max(0, lastServerSeqRaw) : 0;

    if (!sessionToken) {
      return NextResponse.json(
        {
          error: "sessionToken is required"
        },
        { status: 400 }
      );
    }

    const result = await pollRuntimeSession(sessionToken, lastServerSeq);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Runtime poll failed"
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";

import { openRuntimeSession } from "@/src/server/runtime/session-store";
import type { RuntimeOpenRequest } from "@/src/server/runtime/types";

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as RuntimeOpenRequest;
    const response = await openRuntimeSession(payload);
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to open runtime session"
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";

import { sendRuntimeEvent } from "@/src/server/runtime/session-store";
import type { RuntimeClientEvent } from "@/src/server/runtime/types";

type RuntimeEventRequest = {
  sessionToken: string;
  event: RuntimeClientEvent;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as Partial<RuntimeEventRequest>;
    const sessionToken = String(payload.sessionToken ?? "").trim();
    if (!sessionToken) {
      return NextResponse.json(
        {
          error: "sessionToken is required"
        },
        { status: 400 }
      );
    }

    const event = payload.event;
    if (!event || typeof event !== "object") {
      return NextResponse.json(
        {
          error: "event payload is required"
        },
        { status: 400 }
      );
    }
    const patchSet = await sendRuntimeEvent(sessionToken, event as RuntimeClientEvent);
    return NextResponse.json(patchSet);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process runtime event"
      },
      { status: 500 }
    );
  }
}

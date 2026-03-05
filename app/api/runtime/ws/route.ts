import {
  getRuntimePatchHistorySince,
  getRuntimeSessionSnapshot,
  subscribeRuntimeSession
} from "@/src/server/runtime/session-store";
import type { RuntimePatchSet } from "@/src/server/runtime/types";

const HEARTBEAT_MS = 15_000;

function encodeSseEvent(event: string, payload: unknown): string {
  const serialized = JSON.stringify(payload);
  return `event: ${event}\ndata: ${serialized}\n\n`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionToken = url.searchParams.get("sessionToken")?.trim() ?? "";
  const lastServerSeqRaw = Number.parseInt(url.searchParams.get("lastServerSeq") ?? "0", 10);
  const lastServerSeq = Number.isFinite(lastServerSeqRaw) ? Math.max(0, lastServerSeqRaw) : 0;
  const wantsSse = request.headers.get("accept")?.toLowerCase().includes("text/event-stream");
  const wantsWebSocket = request.headers.get("upgrade")?.toLowerCase() === "websocket";

  if (!sessionToken) {
    return new Response(
      JSON.stringify({
        error: "sessionToken is required"
      }),
      {
        status: 400,
        headers: {
          "content-type": "application/json"
        }
      }
    );
  }

  const snapshot = getRuntimeSessionSnapshot(sessionToken);
  if (!snapshot) {
    return new Response(
      JSON.stringify({
        error: "Runtime session not found"
      }),
      {
        status: 404,
        headers: {
          "content-type": "application/json"
        }
      }
    );
  }

  if (wantsWebSocket && !wantsSse) {
    return new Response(
      JSON.stringify({
        error: "WebSocket upgrade is unavailable in this server runtime. Use SSE on /api/runtime/ws or long-poll /api/runtime/poll."
      }),
      {
        status: 426,
        headers: {
          "content-type": "application/json"
        }
      }
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, payload: unknown) => {
        controller.enqueue(encoder.encode(encodeSseEvent(event, payload)));
      };

      send("ready", {
        sessionToken,
        serverSeq: snapshot.lastServerSeq
      });
      const initial = getRuntimePatchHistorySince(sessionToken, lastServerSeq);
      for (const patchSet of initial) {
        send("patch", patchSet);
      }

      const unsubscribe = subscribeRuntimeSession(sessionToken, (patchSet: RuntimePatchSet) => {
        send("patch", patchSet);
      });
      const heartbeat = setInterval(() => {
        send("heartbeat", {
          serverTime: Date.now()
        });
      }, HEARTBEAT_MS);

      const abort = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Ignore stream close errors from aborted connections.
        }
      };
      request.signal.addEventListener("abort", abort);
    }
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive"
    }
  });
}

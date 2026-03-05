"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { RenderSurface } from "@/components/fm/RenderSurface";
import type {
  RuntimeClientEvent,
  RuntimeOpenResponse,
  RuntimePatchSet,
  RuntimeRenderTreeNode,
  RuntimeSessionMode
} from "@/src/server/runtime/types";

type WebDirectRuntimeProps = {
  layoutId: string;
  workspaceId?: string;
  mode?: RuntimeSessionMode;
};

type RuntimeDialogState = {
  title: string;
  message: string;
  level: "info" | "warning" | "error";
} | null;

const ZOOM_OPTIONS = [50, 75, 100, 125, 150, 200] as const;

function cleanToken(value: unknown): string {
  return String(value ?? "").trim();
}

function withWorkspaceQuery(pathname: string, workspaceId: string): string {
  const separator = pathname.includes("?") ? "&" : "?";
  return `${pathname}${separator}workspace=${encodeURIComponent(workspaceId)}`;
}

function normalizeWorkspaceId(workspaceId?: string): string {
  const token = cleanToken(workspaceId);
  return token || "default";
}

function buildEvent(
  eventType: RuntimeClientEvent["eventType"],
  objectId: string,
  payload: Record<string, unknown>,
  clientSeq: number
): RuntimeClientEvent {
  return {
    objectId,
    eventType,
    payload,
    timestamp: Date.now(),
    clientSeq
  };
}

function updateNode(
  node: RuntimeRenderTreeNode,
  objectId: string,
  updater: (node: RuntimeRenderTreeNode) => RuntimeRenderTreeNode
): RuntimeRenderTreeNode {
  if (node.objectId === objectId) {
    return updater(node);
  }
  if (!node.children || node.children.length === 0) {
    return node;
  }
  const nextChildren = node.children.map((child) => updateNode(child, objectId, updater));
  if (nextChildren === node.children) {
    return node;
  }
  return {
    ...node,
    children: nextChildren
  };
}

function stringifyValue(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

export function WebDirectRuntime({ layoutId, workspaceId, mode = "browse" }: WebDirectRuntimeProps) {
  const normalizedWorkspaceId = useMemo(() => normalizeWorkspaceId(workspaceId), [workspaceId]);
  const searchParams = useSearchParams();
  const diagnosticsEnabled = useMemo(
    () =>
      String(searchParams?.get("diag") ?? "").trim() === "1" ||
      process.env.NEXT_PUBLIC_RUNTIME_GEOMETRY_DIAGNOSTICS === "1",
    [searchParams]
  );

  const [sessionToken, setSessionToken] = useState("");
  const [renderTree, setRenderTree] = useState<RuntimeRenderTreeNode | null>(null);
  const [recordDirty, setRecordDirty] = useState(false);
  const [dialog, setDialog] = useState<RuntimeDialogState>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [fieldErrorsByObjectId, setFieldErrorsByObjectId] = useState<Map<string, string>>(new Map());
  const [transport, setTransport] = useState<"opening" | "ws" | "sse" | "poll" | "idle">("idle");
  const [openError, setOpenError] = useState("");
  const [zoomPercent, setZoomPercent] = useState<number>(100);

  const clientSeqRef = useRef(0);
  const serverSeqRef = useRef(0);
  const activeTokenRef = useRef("");
  const stopRef = useRef(false);
  const focusTargetRef = useRef<string | null>(null);
  const inputDebounceRef = useRef<Map<string, number>>(new Map());
  const localValueBufferRef = useRef<Map<string, string>>(new Map());
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const viewportPublishFrameRef = useRef<number | null>(null);
  const lastViewportRef = useRef<{ widthPx: number; heightPx: number; zoom: number } | null>(null);

  const nextClientSeq = useCallback(() => {
    clientSeqRef.current += 1;
    return clientSeqRef.current;
  }, []);

  const applyPatchSet = useCallback((patchSet: RuntimePatchSet) => {
    if (!patchSet || patchSet.serverSeq <= serverSeqRef.current) {
      return;
    }
    serverSeqRef.current = patchSet.serverSeq;
    for (const operation of patchSet.operations) {
      if (operation.type === "replaceRenderTree") {
        setRenderTree(operation.renderTree);
        setFieldErrorsByObjectId(new Map());
        continue;
      }
      if (operation.type === "setRecordDirty") {
        setRecordDirty(operation.dirty);
        continue;
      }
      if (operation.type === "showDialog") {
        setDialog(operation.dialog);
        continue;
      }
      if (operation.type === "setError") {
        setStatusMessage(operation.message);
        if (operation.objectId) {
          setFieldErrorsByObjectId((previous) => {
            const next = new Map(previous);
            next.set(operation.objectId!, operation.message);
            return next;
          });
        }
        continue;
      }
      if (operation.type === "setStatusMessage") {
        setStatusMessage(operation.message);
        continue;
      }
      if (operation.type === "setFocus") {
        focusTargetRef.current = operation.objectId;
        continue;
      }
      if (operation.type === "updateFieldValue") {
        localValueBufferRef.current.set(operation.objectId, stringifyValue(operation.value));
        setFieldErrorsByObjectId((previous) => {
          if (!previous.has(operation.objectId)) {
            return previous;
          }
          const next = new Map(previous);
          next.delete(operation.objectId);
          return next;
        });
        setRenderTree((previous) => {
          if (!previous) {
            return previous;
          }
          return updateNode(previous, operation.objectId, (node) => ({
            ...node,
            value: operation.value
          }));
        });
        continue;
      }
      if (operation.type === "updateComputedStyle") {
        setRenderTree((previous) => {
          if (!previous) {
            return previous;
          }
          return updateNode(previous, operation.objectId, (node) => ({
            ...node,
            style: {
              ...(node.style ?? {}),
              ...operation.styleDelta
            }
          }));
        });
      }
    }
  }, []);

  const sendEvent = useCallback(
    async (eventType: RuntimeClientEvent["eventType"], objectId: string, payload: Record<string, unknown> = {}) => {
      const token = activeTokenRef.current;
      if (!token || stopRef.current) {
        return;
      }
      const event = buildEvent(eventType, objectId, payload, nextClientSeq());
      try {
        const response = await fetch("/api/runtime/event", {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            sessionToken: token,
            event
          })
        });
        if (!response.ok) {
          const body = await response.text();
          setStatusMessage(body || "Runtime event failed");
          return;
        }
        const patchSet = (await response.json()) as RuntimePatchSet;
        applyPatchSet(patchSet);
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "Runtime event failed");
      }
    },
    [applyPatchSet, nextClientSeq]
  );

  const publishViewport = useCallback(
    (widthPx: number, heightPx: number) => {
      const zoom = Math.max(0.5, Math.min(2, zoomPercent / 100));
      const nextViewport = {
        widthPx: Math.max(320, Math.round(widthPx)),
        heightPx: Math.max(240, Math.round(heightPx)),
        zoom
      };
      const previous = lastViewportRef.current;
      if (
        previous &&
        previous.widthPx === nextViewport.widthPx &&
        previous.heightPx === nextViewport.heightPx &&
        previous.zoom === nextViewport.zoom
      ) {
        return;
      }
      lastViewportRef.current = nextViewport;
      void sendEvent("viewport", `layout:${layoutId}`, nextViewport);
    },
    [layoutId, sendEvent, zoomPercent]
  );

  const pollLoop = useCallback(async () => {
    if (stopRef.current) {
      return;
    }
    const token = activeTokenRef.current;
    if (!token) {
      return;
    }
    setTransport("poll");
    while (!stopRef.current && activeTokenRef.current === token) {
      try {
        const response = await fetch(
          `/api/runtime/poll?sessionToken=${encodeURIComponent(token)}&lastServerSeq=${encodeURIComponent(String(serverSeqRef.current))}`,
          {
            cache: "no-store"
          }
        );
        if (!response.ok) {
          setStatusMessage(`Runtime poll failed (${response.status})`);
          await new Promise((resolve) => setTimeout(resolve, 800));
          continue;
        }
        const payload = (await response.json()) as {
          patchSets: RuntimePatchSet[];
          timeout: boolean;
        };
        for (const patchSet of payload.patchSets ?? []) {
          applyPatchSet(patchSet);
        }
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }
  }, [applyPatchSet]);

  const connectRealtime = useCallback(() => {
    const token = activeTokenRef.current;
    if (!token) {
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    setTransport("opening");
    let opened = false;
    let fallbackTimer: number | null = null;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/runtime/ws?sessionToken=${encodeURIComponent(token)}&lastServerSeq=${encodeURIComponent(String(serverSeqRef.current))}`;
    try {
      const ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        opened = true;
        setTransport("ws");
      };
      ws.onmessage = (message) => {
        try {
          const patchSet = JSON.parse(String(message.data ?? "")) as RuntimePatchSet;
          applyPatchSet(patchSet);
        } catch {
          // Ignore malformed patches and continue.
        }
      };
      const onClose = () => {
        if (stopRef.current || activeTokenRef.current !== token) {
          return;
        }
        if (!opened) {
          try {
            const sse = new EventSource(
              `/api/runtime/ws?sessionToken=${encodeURIComponent(token)}&lastServerSeq=${encodeURIComponent(String(serverSeqRef.current))}`
            );
            sse.addEventListener("patch", (event) => {
              const message = event as MessageEvent<string>;
              try {
                const patchSet = JSON.parse(message.data) as RuntimePatchSet;
                applyPatchSet(patchSet);
              } catch {
                // Ignore malformed patch events.
              }
            });
            sse.onerror = () => {
              sse.close();
              void pollLoop();
            };
            setTransport("sse");
            fallbackTimer = window.setTimeout(() => {
              if (!stopRef.current && activeTokenRef.current === token) {
                sse.close();
                void pollLoop();
              }
            }, 90_000);
          } catch {
            void pollLoop();
          }
          return;
        }
        void pollLoop();
      };
      ws.onerror = onClose;
      ws.onclose = onClose;
    } catch {
      void pollLoop();
    }
    return () => {
      if (fallbackTimer != null) {
        clearTimeout(fallbackTimer);
      }
    };
  }, [applyPatchSet, pollLoop]);

  useEffect(() => {
    stopRef.current = false;
    setOpenError("");
    setSessionToken("");
    setRenderTree(null);
    setStatusMessage("");
    setDialog(null);
    setFieldErrorsByObjectId(new Map());
    localValueBufferRef.current.clear();
    focusTargetRef.current = null;
    lastViewportRef.current = null;

    let disposed = false;
    const open = async () => {
      try {
        const initialViewport = {
          widthPx: Math.max(320, window.innerWidth - 48),
          heightPx: Math.max(240, window.innerHeight - 220),
          zoom: Math.max(0.5, Math.min(2, zoomPercent / 100))
        };
        const response = await fetch("/api/runtime/open", {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            layoutId,
            workspaceId: normalizedWorkspaceId,
            mode,
            viewport: initialViewport
          })
        });
        if (!response.ok) {
          const body = await response.text();
          throw new Error(body || `Failed to open runtime session (${response.status})`);
        }
        const payload = (await response.json()) as RuntimeOpenResponse;
        if (disposed) {
          return;
        }
        activeTokenRef.current = payload.sessionToken;
        setSessionToken(payload.sessionToken);
        serverSeqRef.current = payload.serverSeq;
        setRenderTree(payload.renderTree);
        setRecordDirty(payload.recordDirty);
        if (payload.viewport?.zoom) {
          setZoomPercent(Math.round(payload.viewport.zoom * 100));
        }
        setStatusMessage(`Runtime session opened for ${payload.layout.name}`);
        connectRealtime();
      } catch (error) {
        if (disposed) {
          return;
        }
        setOpenError(error instanceof Error ? error.message : "Failed to open runtime");
      }
    };
    void open();
    return () => {
      disposed = true;
      stopRef.current = true;
      activeTokenRef.current = "";
      for (const timeoutId of inputDebounceRef.current.values()) {
        clearTimeout(timeoutId);
      }
      inputDebounceRef.current.clear();
    };
  }, [connectRealtime, layoutId, mode, normalizedWorkspaceId]);

  useEffect(() => {
    const targetObjectId = focusTargetRef.current;
    if (!targetObjectId) {
      return;
    }
    const element = document.querySelector<HTMLElement>(`[data-objid="${CSS.escape(targetObjectId)}"]`);
    if (!element) {
      return;
    }
    element.focus();
    focusTargetRef.current = null;
  }, [renderTree]);

  useEffect(() => {
    if (!sessionToken || !surfaceRef.current) {
      return;
    }
    const container = surfaceRef.current;
    const publishFromElement = () => {
      const rect = container.getBoundingClientRect();
      publishViewport(rect.width, rect.height);
    };
    publishFromElement();
    const observer = new ResizeObserver((entries) => {
      const first = entries[0];
      if (!first) {
        return;
      }
      if (viewportPublishFrameRef.current != null) {
        cancelAnimationFrame(viewportPublishFrameRef.current);
      }
      viewportPublishFrameRef.current = requestAnimationFrame(() => {
        publishViewport(first.contentRect.width, first.contentRect.height);
      });
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      if (viewportPublishFrameRef.current != null) {
        cancelAnimationFrame(viewportPublishFrameRef.current);
      }
      viewportPublishFrameRef.current = null;
    };
  }, [publishViewport, sessionToken, zoomPercent]);

  const handleInput = useCallback(
    (objectId: string, nextValue: string) => {
      localValueBufferRef.current.set(objectId, nextValue);
      const existingTimer = inputDebounceRef.current.get(objectId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }
      const timeoutId = window.setTimeout(() => {
        void sendEvent("input", objectId, {
          value: nextValue
        });
        inputDebounceRef.current.delete(objectId);
      }, 120);
      inputDebounceRef.current.set(objectId, timeoutId);
    },
    [sendEvent]
  );

  const handleEvent = useCallback(
    (eventType: RuntimeClientEvent["eventType"], objectId: string, payload: Record<string, unknown> = {}) => {
      void sendEvent(eventType, objectId, payload);
    },
    [sendEvent]
  );

  const resolveBufferedValue = useCallback((objectId: string, nodeValue: unknown) => {
    const buffered = localValueBufferRef.current.get(objectId);
    if (buffered != null) {
      return buffered;
    }
    return stringifyValue(nodeValue);
  }, []);

  if (openError) {
    return (
      <section className="webdirect-runtime-shell">
        <p className="webdirect-runtime-error">{openError}</p>
      </section>
    );
  }

  return (
    <section className="webdirect-runtime-shell">
      <header className="webdirect-runtime-toolbar">
        <strong>Runtime</strong>
        <span>Layout: {layoutId}</span>
        <span>Session: {sessionToken ? `${sessionToken.slice(0, 8)}…` : "opening"}</span>
        <span>Transport: {transport}</span>
        <span>{recordDirty ? "Dirty" : "Clean"}</span>
        <label className="webdirect-runtime-zoom">
          Zoom
          <select
            value={zoomPercent}
            onChange={(event) => {
              const next = Number.parseInt(event.currentTarget.value, 10);
              if (!Number.isFinite(next)) {
                return;
              }
              setZoomPercent(next);
            }}
          >
            {ZOOM_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value}%
              </option>
            ))}
          </select>
        </label>
        {diagnosticsEnabled ? <span className="webdirect-runtime-diag-flag">diag</span> : null}
        <button
          type="button"
          onClick={() => {
            if (!sessionToken) {
              return;
            }
            void sendEvent("commit", renderTree?.objectId ?? `layout:${layoutId}`);
          }}
          disabled={!sessionToken}
        >
          Commit
        </button>
        <button
          type="button"
          onClick={() => {
            if (!renderTree) {
              return;
            }
            void sendEvent("keydown", renderTree.objectId, {
              key: "Escape"
            });
          }}
          disabled={!recordDirty}
        >
          Revert
        </button>
        <button
          type="button"
          onClick={() => {
            window.location.href = withWorkspaceQuery(`/layouts/${encodeURIComponent(layoutId)}/browse`, normalizedWorkspaceId);
          }}
        >
          Open Browse
        </button>
      </header>

      {statusMessage ? <p className="webdirect-runtime-status">{statusMessage}</p> : null}

      {dialog ? (
        <div className={`webdirect-runtime-dialog ${dialog.level}`} role="dialog" aria-modal="true">
          <h2>{dialog.title}</h2>
          <p>{dialog.message}</p>
          <button type="button" onClick={() => setDialog(null)}>
            Close
          </button>
        </div>
      ) : null}

      <div ref={surfaceRef} className="webdirect-runtime-canvas-wrap">
        {renderTree ? (
          <RenderSurface
            renderTree={renderTree}
            diagnosticsEnabled={diagnosticsEnabled}
            onEvent={handleEvent}
            onFieldInput={handleInput}
            resolveFieldValue={resolveBufferedValue}
            fieldErrorsByObjectId={fieldErrorsByObjectId}
          />
        ) : (
          <p className="webdirect-runtime-loading">Opening runtime session…</p>
        )}
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";

type HomeLauncherProps = {
  authError: string;
  defaultLayoutName: string;
  defaultWorkspaceId: string;
};

type WorkspaceCatalogEntry = {
  id: string;
  name: string;
};

type WorkspaceCatalogPayload = {
  workspaces?: Array<{
    id?: string;
    name?: string;
  }>;
};

type DatabaseSessionFileEntry = {
  fileId: string;
  displayName: string;
  databaseName: string;
  host: string;
  username: string;
  hasPassword: boolean;
  sourceFileName: string;
  status: "connected" | "missing" | "locked" | "unknown";
  primary: boolean;
};

type DatabaseSessionPayload = {
  activeFileId?: string;
  files?: DatabaseSessionFileEntry[];
  connection?: {
    ok: boolean;
    error?: string;
    layouts?: string[];
  };
  error?: string;
};

type LaunchMode = "layout" | "browse";
type PreflightState = "idle" | "checking" | "ok" | "failed";

function normalizeWorkspaceToken(value: string | null | undefined): string {
  const cleaned = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "default";
}

function withWorkspaceQuery(pathname: string, workspaceId: string): string {
  const separator = pathname.includes("?") ? "&" : "?";
  return `${pathname}${separator}workspace=${encodeURIComponent(workspaceId)}`;
}

function buildRuntimeHref(layoutRouteName: string, workspaceId: string, mode: LaunchMode): string {
  const route = mode === "layout" ? "edit" : "browse";
  return withWorkspaceQuery(`/layouts/${encodeURIComponent(layoutRouteName)}/${route}`, workspaceId);
}

export function HomeLauncher({ authError, defaultLayoutName, defaultWorkspaceId }: HomeLauncherProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialWorkspaceId = useMemo(
    () => normalizeWorkspaceToken(searchParams.get("workspace") || defaultWorkspaceId),
    [defaultWorkspaceId, searchParams]
  );

  const [workspaceCatalog, setWorkspaceCatalog] = useState<WorkspaceCatalogEntry[]>([
    {
      id: initialWorkspaceId,
      name: initialWorkspaceId
    }
  ]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(initialWorkspaceId);
  const [databaseFiles, setDatabaseFiles] = useState<DatabaseSessionFileEntry[]>([]);
  const [databaseLoading, setDatabaseLoading] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [preflightState, setPreflightState] = useState<PreflightState>("idle");
  const [preflightMessage, setPreflightMessage] = useState<string | null>(null);
  const [pendingOpenMode, setPendingOpenMode] = useState<LaunchMode | null>(null);

  const selectedFile = useMemo(
    () =>
      databaseFiles.find((entry) => entry.fileId === selectedFileId) ??
      databaseFiles.find((entry) => entry.primary) ??
      null,
    [databaseFiles, selectedFileId]
  );

  const fallbackLayoutHref = useMemo(
    () => buildRuntimeHref(defaultLayoutName, selectedWorkspaceId, "layout"),
    [defaultLayoutName, selectedWorkspaceId]
  );
  const fallbackBrowseHref = useMemo(
    () => buildRuntimeHref(defaultLayoutName, selectedWorkspaceId, "browse"),
    [defaultLayoutName, selectedWorkspaceId]
  );

  useEffect(() => {
    let cancelled = false;
    const loadWorkspaceCatalog = async () => {
      setWorkspaceLoading(true);
      try {
        const response = await fetch("/api/workspaces", { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as WorkspaceCatalogPayload;
        if (cancelled) {
          return;
        }
        if (!response.ok || !Array.isArray(payload.workspaces)) {
          setWorkspaceCatalog((previous) =>
            previous.length > 0
              ? previous
              : [
                  {
                    id: initialWorkspaceId,
                    name: initialWorkspaceId
                  }
                ]
          );
          return;
        }
        const entries = payload.workspaces
          .map((entry) => {
            const id = normalizeWorkspaceToken(entry.id);
            const name = String(entry.name ?? "").trim() || id;
            return {
              id,
              name
            };
          })
          .filter((entry, index, source) => source.findIndex((candidate) => candidate.id === entry.id) === index)
          .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }));
        const withCurrent =
          entries.find((entry) => entry.id === selectedWorkspaceId) != null
            ? entries
            : [...entries, { id: selectedWorkspaceId, name: selectedWorkspaceId }];
        setWorkspaceCatalog(withCurrent);
      } finally {
        if (!cancelled) {
          setWorkspaceLoading(false);
        }
      }
    };
    void loadWorkspaceCatalog();
    return () => {
      cancelled = true;
    };
  }, [initialWorkspaceId, selectedWorkspaceId]);

  useEffect(() => {
    let cancelled = false;
    const loadDatabaseSession = async () => {
      setDatabaseLoading(true);
      try {
        const response = await fetch(`/api/workspaces/${encodeURIComponent(selectedWorkspaceId)}/database-session`, {
          cache: "no-store"
        });
        const payload = (await response.json().catch(() => ({}))) as DatabaseSessionPayload;
        if (cancelled) {
          return;
        }
        if (!response.ok || !Array.isArray(payload.files)) {
          setDatabaseFiles([]);
          setSelectedFileId("");
          setPreflightState("failed");
          setPreflightMessage(payload.error || "Unable to load database list for this workspace.");
          return;
        }
        const files = payload.files;
        setDatabaseFiles(files);
        const activeFileId = String(payload.activeFileId ?? "").trim();
        const initial =
          files.find((entry) => entry.fileId === activeFileId) ??
          files.find((entry) => entry.primary) ??
          files[0] ??
          null;
        setSelectedFileId(initial?.fileId ?? "");
        setPreflightState("idle");
        setPreflightMessage(null);
        setPendingOpenMode(null);
      } finally {
        if (!cancelled) {
          setDatabaseLoading(false);
        }
      }
    };
    void loadDatabaseSession();
    return () => {
      cancelled = true;
    };
  }, [selectedWorkspaceId]);

  const resolveLayoutRouteName = useCallback(
    async (layoutName: string): Promise<string> => {
      const normalizedLayout = layoutName.trim();
      if (!normalizedLayout) {
        return defaultLayoutName;
      }
      try {
        const response = await fetch(
          `/api/layouts/by-fm-layout?name=${encodeURIComponent(normalizedLayout)}&workspace=${encodeURIComponent(
            selectedWorkspaceId
          )}`,
          { cache: "no-store" }
        );
        if (!response.ok) {
          return normalizedLayout;
        }
        const payload = (await response.json().catch(() => ({}))) as { layout?: { id?: string } };
        const routeName = String(payload.layout?.id ?? "").trim();
        return routeName || normalizedLayout;
      } catch {
        return normalizedLayout;
      }
    },
    [defaultLayoutName, selectedWorkspaceId]
  );

  const runDataApiPreflight = useCallback(async (): Promise<{ ok: boolean; layoutRouteName: string }> => {
    setPreflightState("checking");
    setPreflightMessage("Checking FileMaker Data API for the selected database...");
    const response = await fetch(`/api/workspaces/${encodeURIComponent(selectedWorkspaceId)}/database-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fileId: selectedFile?.fileId || undefined,
        activate: true,
        loadLayouts: true
      })
    });
    const payload = (await response.json().catch(() => ({}))) as DatabaseSessionPayload;
    if (!response.ok) {
      setPreflightState("failed");
      setPreflightMessage(payload.error || "Data API preflight request failed.");
      return { ok: false, layoutRouteName: defaultLayoutName };
    }
    const connectionOk = payload.connection?.ok !== false;
    if (!connectionOk) {
      setPreflightState("failed");
      setPreflightMessage(payload.connection?.error || "Data API connection failed for the selected database.");
      return { ok: false, layoutRouteName: defaultLayoutName };
    }

    const layouts = Array.isArray(payload.connection?.layouts) ? payload.connection?.layouts : [];
    const preferredLayout =
      layouts.find((entry) => entry.trim().toLowerCase() === defaultLayoutName.trim().toLowerCase()) ??
      layouts[0] ??
      defaultLayoutName;
    const layoutRouteName = await resolveLayoutRouteName(preferredLayout);
    setPreflightState("ok");
    setPreflightMessage(
      `Connected to ${selectedFile?.databaseName || "database"}${
        layouts.length > 0 ? ` (${layouts.length} layout${layouts.length === 1 ? "" : "s"} available)` : ""
      }.`
    );
    return { ok: true, layoutRouteName };
  }, [defaultLayoutName, resolveLayoutRouteName, selectedFile?.databaseName, selectedFile?.fileId, selectedWorkspaceId]);

  const openModeWithPreflight = useCallback(
    async (mode: LaunchMode) => {
      if (databaseLoading || workspaceLoading) {
        return;
      }
      const result = await runDataApiPreflight();
      if (!result.ok) {
        setPendingOpenMode(mode);
        return;
      }
      setPendingOpenMode(null);
      router.push(buildRuntimeHref(result.layoutRouteName, selectedWorkspaceId, mode));
    },
    [databaseLoading, router, runDataApiPreflight, selectedWorkspaceId, workspaceLoading]
  );

  const onLaunchClick = useCallback(
    (mode: LaunchMode) => async (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      await openModeWithPreflight(mode);
    },
    [openModeWithPreflight]
  );

  return (
    <main className="home-root">
      <section className="home-card">
        <p className="eyebrow">FileMaker Web IDE</p>
        <h1>Layout Mode + Browse Mode</h1>
        <p>
          Build layouts visually, persist layout JSON, and switch into runtime mode backed by
          FileMaker Data API endpoints.
        </p>
        {authError === "sso-required" ? (
          <p className="home-auth-error">
            Authentication required. This environment is configured for trusted-header SSO.
          </p>
        ) : null}
        <div className="home-launch-grid">
          <label>
            Solution Workspace
            <select
              value={selectedWorkspaceId}
              onChange={(event) => setSelectedWorkspaceId(normalizeWorkspaceToken(event.currentTarget.value))}
              disabled={workspaceLoading}
            >
              {workspaceCatalog.map((entry) => (
                <option key={`workspace-option-${entry.id}`} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Database File
            <select
              value={selectedFileId}
              onChange={(event) => setSelectedFileId(event.currentTarget.value)}
              disabled={databaseLoading || databaseFiles.length === 0}
            >
              {databaseFiles.length > 0 ? (
                databaseFiles.map((entry) => (
                  <option key={`database-option-${entry.fileId}`} value={entry.fileId}>
                    {entry.displayName} ({entry.databaseName}){entry.primary ? " • active" : ""}
                  </option>
                ))
              ) : (
                <option value="">(none)</option>
              )}
            </select>
          </label>
        </div>
        <div className="home-preflight-status">
          <span className={`badge status-${preflightState}`}>Data API: {preflightState}</span>
          <span className="home-preflight-meta">
            {selectedFile
              ? `${selectedFile.databaseName} • ${selectedFile.status}`
              : databaseLoading
                ? "Loading database files..."
                : "No database selected"}
          </span>
        </div>
        {preflightMessage ? <p className="home-auth-error">{preflightMessage}</p> : null}
        <div className="home-actions">
          <Link href={fallbackLayoutHref} className="btn primary" onClick={onLaunchClick("layout")}>
            Open Layout Mode
          </Link>
          <Link href={fallbackBrowseHref} className="btn" onClick={onLaunchClick("browse")}>
            Open Browse Mode
          </Link>
          <button
            type="button"
            className="btn"
            onClick={() => {
              void runDataApiPreflight();
            }}
            disabled={preflightState === "checking" || databaseLoading}
          >
            {preflightState === "checking" ? "Checking..." : "Check Data API"}
          </button>
          {pendingOpenMode ? (
            <button
              type="button"
              className="btn"
              onClick={() => {
                router.push(buildRuntimeHref(defaultLayoutName, selectedWorkspaceId, pendingOpenMode));
              }}
            >
              Open {pendingOpenMode === "layout" ? "Layout" : "Browse"} Anyway
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}


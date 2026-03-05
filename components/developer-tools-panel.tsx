"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type SchemaSnapshotSummary = {
  snapshotId: string;
  label?: string;
  workspaceId: string;
  createdAt: string;
  source: string;
  fileIds: string[];
  metadata: {
    warnings: string[];
  };
};

type MigrationPlanSummary = {
  id: string;
  createdAt: string;
  baselineSnapshotId: string;
  targetSnapshotId: string;
  summary: {
    totalSteps: number;
    safeSteps: number;
    warningSteps: number;
    dangerSteps: number;
  };
};

type RelationshipGraphPayload = {
  snapshotId: string;
  generatedAt: string;
  nodes: Array<{
    id: string;
    type: "file" | "tableOccurrence" | "layout";
    fileId: string;
    label: string;
    subtitle?: string;
  }>;
  edges: Array<{
    id: string;
    from: string;
    to: string;
    type: "relationship" | "layout-base";
    crossFile: boolean;
    label?: string;
  }>;
};

type DiffSummary = {
  summary: {
    totalChanges: number;
    breakingChanges: number;
    warnings: number;
    info: number;
    filesChanged: number;
  };
  probableRenames: Array<{
    from: string;
    to: string;
    confidence: number;
  }>;
};

type ImpactSummary = {
  summary: {
    total: number;
    blockers: number;
    warnings: number;
    info: number;
    layoutsAffected: number;
    scriptsAffected: number;
    valueListsAffected: number;
  };
  recommendations: string[];
};

type DeveloperToolsStatePayload = {
  snapshots: SchemaSnapshotSummary[];
  snapshotTags: Record<string, string>;
  migrationPlans: MigrationPlanSummary[];
};

type DeveloperUtilityTaskId = "copyCompacted" | "cloneNoRecords" | "removeAdminAccess";

type WorkspaceFileSummary = {
  fileId: string;
  displayName?: string;
  databaseName: string;
  sourceFileName?: string;
  primary?: boolean;
  status?: "connected" | "missing" | "locked" | "unknown";
};

type WorkspaceSettingsPayload = {
  workspace?: {
    name?: string;
    files?: WorkspaceFileSummary[];
  };
};

type DeveloperToolsPanelProps = {
  open: boolean;
  workspaceId: string;
  buildApiPath: (path: string) => string;
  onClose: () => void;
  onStatus?: (message: string) => void;
};

function cleanToken(value: unknown): string {
  return String(value ?? "").trim();
}

function buildTimestampToken(value: Date = new Date()): string {
  const year = String(value.getFullYear()).padStart(4, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hour = String(value.getHours()).padStart(2, "0");
  const minute = String(value.getMinutes()).padStart(2, "0");
  return `${year}${month}${day}-${hour}${minute}`;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`);
  }
  return payload;
}

export function DeveloperToolsPanel({ open, workspaceId, buildApiPath, onClose, onStatus }: DeveloperToolsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<SchemaSnapshotSummary[]>([]);
  const [snapshotTags, setSnapshotTags] = useState<Record<string, string>>({});
  const [migrationPlans, setMigrationPlans] = useState<MigrationPlanSummary[]>([]);
  const [baselineSnapshotId, setBaselineSnapshotId] = useState("");
  const [targetSnapshotId, setTargetSnapshotId] = useState("");
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [diffSummary, setDiffSummary] = useState<DiffSummary | null>(null);
  const [impactSummary, setImpactSummary] = useState<ImpactSummary | null>(null);
  const [graphPayload, setGraphPayload] = useState<RelationshipGraphPayload | null>(null);
  const [graphSearch, setGraphSearch] = useState("");
  const [graphCrossFileOnly, setGraphCrossFileOnly] = useState(false);
  const [graphFromNodeId, setGraphFromNodeId] = useState("");
  const [graphToNodeId, setGraphToNodeId] = useState("");
  const [graphPath, setGraphPath] = useState<string[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [allowDestructive, setAllowDestructive] = useState(false);
  const [autoRenameFixes, setAutoRenameFixes] = useState(false);
  const [crossFileAware, setCrossFileAware] = useState(true);
  const [reportOutput, setReportOutput] = useState("");
  const [utilityTask, setUtilityTask] = useState<DeveloperUtilityTaskId>("copyCompacted");
  const [utilityPackageName, setUtilityPackageName] = useState("");
  const [utilityFiles, setUtilityFiles] = useState<WorkspaceFileSummary[]>([]);
  const [utilitySelectedFileIds, setUtilitySelectedFileIds] = useState<string[]>([]);
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);

  const apiPath = useMemo(() => buildApiPath(`/api/workspaces/${encodeURIComponent(workspaceId)}/developer-tools`), [
    buildApiPath,
    workspaceId
  ]);

  const loadState = useCallback(async () => {
    if (!open) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const workspaceApiPath = buildApiPath(`/api/workspaces/${encodeURIComponent(workspaceId)}`);
      const [stateResponse, workspaceResponse] = await Promise.all([
        fetch(apiPath, { cache: "no-store" }),
        fetch(workspaceApiPath, { cache: "no-store" })
      ]);
      const payload = await parseResponse<DeveloperToolsStatePayload>(stateResponse);
      const workspacePayload = await parseResponse<WorkspaceSettingsPayload>(workspaceResponse);
      setSnapshots(payload.snapshots ?? []);
      setSnapshotTags(payload.snapshotTags ?? {});
      setMigrationPlans(payload.migrationPlans ?? []);
      const files = Array.isArray(workspacePayload.workspace?.files)
        ? workspacePayload.workspace.files
        : [];
      setUtilityFiles(files);
      setUtilitySelectedFileIds((previous) => {
        const availableIds = new Set(files.map((entry) => cleanToken(entry.fileId)));
        const retained = previous.filter((entry) => availableIds.has(cleanToken(entry)));
        if (retained.length > 0) {
          return retained;
        }
        const defaults = files.filter((entry) => Boolean(entry.primary)).map((entry) => cleanToken(entry.fileId));
        if (defaults.length > 0) {
          return defaults;
        }
        return files.slice(0, 1).map((entry) => cleanToken(entry.fileId));
      });
      setUtilityPackageName((previous) => previous || cleanToken(workspacePayload.workspace?.name) || workspaceId);
      if (!baselineSnapshotId && payload.snapshots?.[1]?.snapshotId) {
        setBaselineSnapshotId(payload.snapshots[1].snapshotId);
      }
      if (!targetSnapshotId && payload.snapshots?.[0]?.snapshotId) {
        setTargetSnapshotId(payload.snapshots[0].snapshotId);
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load developer tools state");
    } finally {
      setLoading(false);
    }
  }, [apiPath, baselineSnapshotId, buildApiPath, open, targetSnapshotId, workspaceId]);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  const runAction = useCallback(
    async (payload: Record<string, unknown>) => {
      setRunning(true);
      setError(null);
      try {
        const response = await fetch(apiPath, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });
        return await parseResponse<Record<string, unknown>>(response);
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Developer tools action failed");
        return null;
      } finally {
        setRunning(false);
      }
    },
    [apiPath]
  );

  const createSnapshot = useCallback(async () => {
    const payload = await runAction({
      action: "createSnapshot",
      label: cleanToken(snapshotLabel) || undefined
    });
    if (!payload) {
      return;
    }
    setSnapshotLabel("");
    onStatus?.("Created schema snapshot");
    await loadState();
  }, [loadState, onStatus, runAction, snapshotLabel]);

  const runDiff = useCallback(async () => {
    if (!baselineSnapshotId || !targetSnapshotId) {
      setError("Select baseline and target snapshots.");
      return;
    }
    const payload = await runAction({
      action: "diffSnapshots",
      baselineSnapshotId,
      targetSnapshotId
    });
    if (!payload) {
      return;
    }
    setDiffSummary((payload.diffResult as DiffSummary | undefined) ?? null);
    onStatus?.("Generated schema diff");
  }, [baselineSnapshotId, onStatus, runAction, targetSnapshotId]);

  const runImpact = useCallback(async () => {
    if (!baselineSnapshotId || !targetSnapshotId) {
      setError("Select baseline and target snapshots.");
      return;
    }
    const payload = await runAction({
      action: "impactAnalysis",
      baselineSnapshotId,
      targetSnapshotId
    });
    if (!payload) {
      return;
    }
    setImpactSummary((payload.impactReport as ImpactSummary | undefined) ?? null);
    onStatus?.("Generated impact analysis");
  }, [baselineSnapshotId, onStatus, runAction, targetSnapshotId]);

  const runGraph = useCallback(async () => {
    if (!targetSnapshotId) {
      setError("Select a target snapshot for graph exploration.");
      return;
    }
    const payload = await runAction({
      action: "relationshipGraph",
      snapshotId: targetSnapshotId,
      filter: {
        search: cleanToken(graphSearch) || undefined,
        crossFileOnly: graphCrossFileOnly
      },
      fromNodeId: cleanToken(graphFromNodeId) || undefined,
      toNodeId: cleanToken(graphToNodeId) || undefined
    });
    if (!payload) {
      return;
    }
    setGraphPayload((payload.graph as RelationshipGraphPayload | undefined) ?? null);
    setGraphPath(Array.isArray(payload.path) ? (payload.path as string[]) : []);
    onStatus?.("Loaded relationship graph");
  }, [graphCrossFileOnly, graphFromNodeId, graphSearch, graphToNodeId, onStatus, runAction, targetSnapshotId]);

  const generateMigration = useCallback(async () => {
    if (!baselineSnapshotId || !targetSnapshotId) {
      setError("Select baseline and target snapshots.");
      return;
    }
    const payload = await runAction({
      action: "generateMigration",
      baselineSnapshotId,
      targetSnapshotId,
      options: {
        allowDestructive,
        autoRenameFixes,
        crossFileAware
      }
    });
    if (!payload) {
      return;
    }
    const plan = payload.migrationPlan as MigrationPlanSummary | undefined;
    if (plan?.id) {
      setSelectedPlanId(plan.id);
    }
    onStatus?.("Generated migration plan");
    await loadState();
  }, [
    allowDestructive,
    autoRenameFixes,
    baselineSnapshotId,
    crossFileAware,
    loadState,
    onStatus,
    runAction,
    targetSnapshotId
  ]);

  const applyMigration = useCallback(async () => {
    if (!selectedPlanId) {
      setError("Select a migration plan first.");
      return;
    }
    const payload = await runAction({
      action: "applyMigration",
      planId: selectedPlanId
    });
    if (!payload) {
      return;
    }
    onStatus?.("Applied migration plan to workspace schema overlay");
    await loadState();
  }, [loadState, onStatus, runAction, selectedPlanId]);

  const exportReport = useCallback(
    async (reportKind: "diff" | "impact" | "migration", reportFormat: "json" | "markdown") => {
      if (!baselineSnapshotId || !targetSnapshotId) {
        setError("Select baseline and target snapshots.");
        return;
      }
      const payload = await runAction({
        action: "exportReport",
        reportKind,
        reportFormat,
        baselineSnapshotId,
        targetSnapshotId,
        options: {
          allowDestructive,
          autoRenameFixes,
          crossFileAware
        }
      });
      if (!payload) {
        return;
      }
      const report = payload.report;
      if (reportFormat === "markdown") {
        setReportOutput(String(report ?? ""));
      } else {
        setReportOutput(JSON.stringify(report, null, 2));
      }
      onStatus?.(`Exported ${reportKind} report (${reportFormat})`);
    },
    [
      allowDestructive,
      autoRenameFixes,
      baselineSnapshotId,
      crossFileAware,
      onStatus,
      runAction,
      targetSnapshotId
    ]
  );

  const copyReport = useCallback(async () => {
    if (!reportOutput.trim()) {
      return;
    }
    try {
      await navigator.clipboard.writeText(reportOutput);
      onStatus?.("Copied report output");
    } catch {
      setError("Clipboard write failed");
    }
  }, [onStatus, reportOutput]);

  const snapshotOptions = useMemo(() => {
    return snapshots.map((entry) => ({
      snapshotId: entry.snapshotId,
      label: snapshotTags[entry.snapshotId] || entry.label || `${entry.snapshotId} (${entry.source})`
    }));
  }, [snapshotTags, snapshots]);

  const selectedUtilityFiles = useMemo(() => {
    const selected = new Set(utilitySelectedFileIds.map((entry) => cleanToken(entry)));
    return utilityFiles.filter((entry) => selected.has(cleanToken(entry.fileId)));
  }, [utilityFiles, utilitySelectedFileIds]);

  const utilityActionLabel = useMemo(() => {
    if (utilityTask === "cloneNoRecords") {
      return "Create Clone";
    }
    if (utilityTask === "removeAdminAccess") {
      return "Remove";
    }
    return "Create";
  }, [utilityTask]);

  const toggleUtilityFileSelection = useCallback((fileId: string) => {
    const normalized = cleanToken(fileId);
    if (!normalized) {
      return;
    }
    setUtilitySelectedFileIds((previous) => {
      const exists = previous.some((entry) => cleanToken(entry) === normalized);
      if (exists) {
        const next = previous.filter((entry) => cleanToken(entry) !== normalized);
        return next.length > 0 ? next : [normalized];
      }
      return [...previous, normalized];
    });
  }, []);

  const runDeveloperUtility = useCallback(async () => {
    if (selectedUtilityFiles.length === 0) {
      setError("Select at least one solution file.");
      return;
    }
    if (utilityTask === "removeAdminAccess") {
      setError("Remove Admin Access is not supported in FMWeb IDE yet.");
      return;
    }

    const packageToken = cleanToken(utilityPackageName) || workspaceId;
    const timestamp = buildTimestampToken();
    const snapshotPayload = await runAction({
      action: "createSnapshot",
      label: `${utilityTask === "cloneNoRecords" ? "Clone" : "Copy"} · ${packageToken}`
    });
    if (!snapshotPayload) {
      return;
    }
    const snapshot = (snapshotPayload.snapshot ?? null) as SchemaSnapshotSummary | null;

    const bundle = {
      format: "fmweb-developer-utility",
      generatedAt: new Date().toISOString(),
      workspaceId,
      utility: utilityTask,
      packageName: packageToken,
      selectedFiles: selectedUtilityFiles.map((entry) => ({
        fileId: cleanToken(entry.fileId),
        displayName: cleanToken(entry.displayName) || cleanToken(entry.databaseName),
        databaseName: cleanToken(entry.databaseName),
        sourceFileName: cleanToken(entry.sourceFileName),
        status: cleanToken(entry.status) || "unknown"
      })),
      snapshotId: cleanToken(snapshot?.snapshotId),
      notes:
        utilityTask === "cloneNoRecords"
          ? "Schema-only clone package. Runtime record data is not included."
          : "Compacted workspace package export."
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${packageToken.replace(/[^a-z0-9_-]+/gi, "-") || "fmweb"}-${utilityTask}-${timestamp}.json`;
    anchor.click();
    URL.revokeObjectURL(url);

    onStatus?.(
      utilityTask === "cloneNoRecords"
        ? `Created clone package for ${selectedUtilityFiles.length} file(s)`
        : `Created compacted copy package for ${selectedUtilityFiles.length} file(s)`
    );
    await loadState();
  }, [loadState, onStatus, runAction, selectedUtilityFiles, utilityPackageName, utilityTask, workspaceId]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="button-setup-backdrop app-layer-capabilities-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="button-setup-modal developer-utilities-modal" role="dialog" aria-modal="true" aria-label="Developer Utilities">
        <h3>Developer Utilities</h3>
        <p>
          Create FileMaker-style utility packages from selected files. Use compacted copy or clone behavior for FMWeb
          solution assets.
        </p>

        <div className="developer-utilities-shell">
          <section className="developer-utilities-files">
            <h4>Solution Files</h4>
            <div className="developer-utilities-list">
              {utilityFiles.map((entry) => {
                const fileId = cleanToken(entry.fileId);
                const selected = utilitySelectedFileIds.some((value) => cleanToken(value) === fileId);
                return (
                  <label key={`developer-utilities-file-${fileId}`} className="developer-utilities-file-option">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleUtilityFileSelection(fileId)}
                    />
                    <span>
                      <strong>{cleanToken(entry.displayName) || cleanToken(entry.databaseName) || fileId}</strong>
                      <small>
                        {cleanToken(entry.sourceFileName) || cleanToken(entry.databaseName)}
                        {entry.primary ? " · Primary" : ""}
                        {entry.status ? ` · ${entry.status}` : ""}
                      </small>
                    </span>
                  </label>
                );
              })}
              {utilityFiles.length === 0 ? (
                <div className="developer-utilities-empty">No workspace files found.</div>
              ) : null}
            </div>
          </section>

          <section className="developer-utilities-options">
            <h4>Utilities</h4>
            <label className="developer-utilities-task">
              <input
                type="radio"
                name="developer-utility-task"
                checked={utilityTask === "copyCompacted"}
                onChange={() => setUtilityTask("copyCompacted")}
              />
              <span>
                <strong>Create Copy (compacted)</strong>
                <small>Create a utility package optimized for deployment and transfer.</small>
              </span>
            </label>
            <label className="developer-utilities-task">
              <input
                type="radio"
                name="developer-utility-task"
                checked={utilityTask === "cloneNoRecords"}
                onChange={() => setUtilityTask("cloneNoRecords")}
              />
              <span>
                <strong>Create Clone (no records)</strong>
                <small>Schema-only export package for development and migration testing.</small>
              </span>
            </label>
            <label className="developer-utilities-task disabled">
              <input
                type="radio"
                name="developer-utility-task"
                checked={utilityTask === "removeAdminAccess"}
                onChange={() => setUtilityTask("removeAdminAccess")}
              />
              <span>
                <strong>Remove Admin Access (not supported)</strong>
                <small>Disabled in FMWeb IDE for safety and governance.</small>
              </span>
            </label>
            <label>
              Package Name
              <input
                value={utilityPackageName}
                onChange={(event) => setUtilityPackageName(event.currentTarget.value)}
                placeholder={workspaceId}
              />
            </label>
            <div className="developer-utilities-meta">
              <div>
                Selected files: <strong>{selectedUtilityFiles.length}</strong>
              </div>
              <div>
                Workspace snapshots: <strong>{snapshots.length}</strong>
              </div>
              <div>
                Migration plans: <strong>{migrationPlans.length}</strong>
              </div>
            </div>
            <div className="button-setup-actions developer-utilities-actions">
              <button type="button" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => void runDeveloperUtility()}
                disabled={running || loading || selectedUtilityFiles.length === 0 || utilityTask === "removeAdminAccess"}
              >
                {running ? "Working..." : utilityActionLabel}
              </button>
            </div>
          </section>
        </div>

        <div className="developer-utilities-advanced-toggle">
          <button type="button" onClick={() => setShowAdvancedTools((previous) => !previous)}>
            {showAdvancedTools ? "Hide Advanced FMWeb Tools" : "Show Advanced FMWeb Tools"}
          </button>
          <button type="button" onClick={() => void loadState()} disabled={loading || running}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {showAdvancedTools ? (
          <div className="developer-utilities-advanced">
            <h4>Advanced FMWeb Tools</h4>
            <div className="app-layer-manage-center-toolbar">
              <label>
                Snapshot label
                <input
                  value={snapshotLabel}
                  onChange={(event) => setSnapshotLabel(event.currentTarget.value)}
                  placeholder="Optional snapshot tag"
                />
              </label>
              <button type="button" onClick={() => void createSnapshot()} disabled={loading || running}>
                Create Snapshot
              </button>
            </div>

            <div className="app-layer-manage-center-toolbar">
              <label>
                Baseline snapshot
                <select value={baselineSnapshotId} onChange={(event) => setBaselineSnapshotId(event.currentTarget.value)}>
                  <option value="">(select)</option>
                  {snapshotOptions.map((entry) => (
                    <option key={`snapshot-baseline-${entry.snapshotId}`} value={entry.snapshotId}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Target snapshot
                <select value={targetSnapshotId} onChange={(event) => setTargetSnapshotId(event.currentTarget.value)}>
                  <option value="">(select)</option>
                  {snapshotOptions.map((entry) => (
                    <option key={`snapshot-target-${entry.snapshotId}`} value={entry.snapshotId}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={() => void runDiff()} disabled={running}>
                Diff
              </button>
              <button type="button" onClick={() => void runImpact()} disabled={running}>
                Impact
              </button>
            </div>

            {diffSummary ? (
              <div className="app-layer-grid">
                <div className="app-layer-grid-row">
                  <span>Diff changes</span>
                  <span>{diffSummary.summary.totalChanges}</span>
                </div>
                <div className="app-layer-grid-row">
                  <span>Breaking</span>
                  <span>{diffSummary.summary.breakingChanges}</span>
                </div>
                <div className="app-layer-grid-row">
                  <span>Warnings</span>
                  <span>{diffSummary.summary.warnings}</span>
                </div>
                <div className="app-layer-grid-row">
                  <span>Probable renames</span>
                  <span>{diffSummary.probableRenames.length}</span>
                </div>
              </div>
            ) : null}

            {impactSummary ? (
              <div className="app-layer-grid">
                <div className="app-layer-grid-row">
                  <span>Impacts</span>
                  <span>{impactSummary.summary.total}</span>
                </div>
                <div className="app-layer-grid-row">
                  <span>Blockers</span>
                  <span>{impactSummary.summary.blockers}</span>
                </div>
                <div className="app-layer-grid-row">
                  <span>Layouts affected</span>
                  <span>{impactSummary.summary.layoutsAffected}</span>
                </div>
                <div className="app-layer-grid-row">
                  <span>Scripts affected</span>
                  <span>{impactSummary.summary.scriptsAffected}</span>
                </div>
              </div>
            ) : null}

            <h4>Relationship Graph Explorer</h4>
            <div className="app-layer-manage-center-toolbar">
              <label>
                Search
                <input value={graphSearch} onChange={(event) => setGraphSearch(event.currentTarget.value)} />
              </label>
              <label className="portal-setup-check">
                <input
                  type="checkbox"
                  checked={graphCrossFileOnly}
                  onChange={(event) => setGraphCrossFileOnly(event.currentTarget.checked)}
                />
                <span>Cross-file only</span>
              </label>
              <label>
                From node
                <input value={graphFromNodeId} onChange={(event) => setGraphFromNodeId(event.currentTarget.value)} />
              </label>
              <label>
                To node
                <input value={graphToNodeId} onChange={(event) => setGraphToNodeId(event.currentTarget.value)} />
              </label>
              <button type="button" onClick={() => void runGraph()} disabled={running}>
                Load Graph
              </button>
            </div>
            {graphPayload ? (
              <div className="app-layer-grid">
                <div className="app-layer-grid-row">
                  <span>Nodes</span>
                  <span>{graphPayload.nodes.length}</span>
                </div>
                <div className="app-layer-grid-row">
                  <span>Edges</span>
                  <span>{graphPayload.edges.length}</span>
                </div>
                <div className="app-layer-grid-row">
                  <span>Cross-file edges</span>
                  <span>{graphPayload.edges.filter((entry) => entry.crossFile).length}</span>
                </div>
                <div className="app-layer-grid-row">
                  <span>Path</span>
                  <span>{graphPath.length > 0 ? graphPath.join(" → ") : "(none)"}</span>
                </div>
              </div>
            ) : null}

            <h4>Migration Planner</h4>
            <div className="app-layer-manage-center-toolbar">
              <label className="portal-setup-check">
                <input
                  type="checkbox"
                  checked={allowDestructive}
                  onChange={(event) => setAllowDestructive(event.currentTarget.checked)}
                />
                <span>Allow destructive steps</span>
              </label>
              <label className="portal-setup-check">
                <input
                  type="checkbox"
                  checked={autoRenameFixes}
                  onChange={(event) => setAutoRenameFixes(event.currentTarget.checked)}
                />
                <span>Auto rename fixes</span>
              </label>
              <label className="portal-setup-check">
                <input
                  type="checkbox"
                  checked={crossFileAware}
                  onChange={(event) => setCrossFileAware(event.currentTarget.checked)}
                />
                <span>Cross-file aware</span>
              </label>
              <button type="button" onClick={() => void generateMigration()} disabled={running}>
                Generate Plan
              </button>
            </div>
            <div className="app-layer-manage-center-toolbar">
              <label>
                Migration plan
                <select value={selectedPlanId} onChange={(event) => setSelectedPlanId(event.currentTarget.value)}>
                  <option value="">(select)</option>
                  {migrationPlans.map((plan) => (
                    <option key={`migration-plan-${plan.id}`} value={plan.id}>
                      {plan.id} · {plan.summary.totalSteps} step(s)
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={() => void applyMigration()} disabled={running || !selectedPlanId}>
                Apply to Workspace
              </button>
            </div>

            <h4>Reports</h4>
            <div className="app-layer-manage-center-toolbar">
              <button type="button" onClick={() => void exportReport("diff", "markdown")} disabled={running}>
                Export Diff (MD)
              </button>
              <button type="button" onClick={() => void exportReport("impact", "markdown")} disabled={running}>
                Export Impact (MD)
              </button>
              <button type="button" onClick={() => void exportReport("migration", "markdown")} disabled={running}>
                Export Migration (MD)
              </button>
              <button type="button" onClick={() => void exportReport("diff", "json")} disabled={running}>
                Export Diff (JSON)
              </button>
              <button type="button" onClick={() => void copyReport()} disabled={!reportOutput.trim()}>
                Copy Report
              </button>
            </div>
            <textarea
              value={reportOutput}
              onChange={(event) => setReportOutput(event.currentTarget.value)}
              rows={10}
              style={{ width: "100%", resize: "vertical" }}
              placeholder="Report output appears here..."
            />
          </div>
        ) : null}

        {error ? <p className="inspector-meta" style={{ color: "#ef4444" }}>{error}</p> : null}
      </div>
    </div>
  );
}

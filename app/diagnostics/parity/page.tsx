import Link from "next/link";
import { readPhase1ParityDiagnostics } from "@/src/server/parity-diagnostics";

type Phase1ParityDiagnosticsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function toWorkspaceToken(value: string | string[] | undefined): string {
  const token = Array.isArray(value) ? value[0] : value;
  return String(token ?? "").trim() || "default";
}

export default async function Phase1ParityDiagnosticsPage({ searchParams }: Phase1ParityDiagnosticsPageProps) {
  const params = (await searchParams) ?? {};
  const workspaceId = toWorkspaceToken(params.workspace);
  const payload = await readPhase1ParityDiagnostics(workspaceId);
  const layoutObjects = payload.layout.objects.slice(0, 30);

  return (
    <main className="phase1-parity-diagnostics-page" data-testid="phase1-parity-diagnostics">
      <header className="phase1-parity-diagnostics-header">
        <h1>Phase 1 Parity Diagnostics</h1>
        <p>
          DDR/model baseline, parity matrix JSON status, and runtime layout geometry summary for workspace{" "}
          <strong>{payload.layout.workspaceId}</strong>.
        </p>
        <div className="phase1-parity-diagnostics-actions">
          <Link href="/">Home</Link>
          <a href="/api/admin/parity" target="_blank" rel="noreferrer">
            API JSON
          </a>
          <a href="/docs/audit/Parity_Matrix_FileMaker_vs_FMWebIDE.json" target="_blank" rel="noreferrer">
            Matrix JSON
          </a>
        </div>
      </header>

      {payload.warnings.length > 0 ? (
        <section className="phase1-parity-diagnostics-section">
          <h2>Warnings</h2>
          <ul>
            {payload.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="phase1-parity-diagnostics-section">
        <h2>Parity Matrix Summary</h2>
        <div className="phase1-parity-summary-grid">
          <article>
            <strong>Total</strong>
            <span>{payload.parityReport.summary.total}</span>
          </article>
          <article>
            <strong>Supported</strong>
            <span>{payload.parityReport.summary.supported}</span>
          </article>
          <article>
            <strong>Partial</strong>
            <span>{payload.parityReport.summary.partial}</span>
          </article>
          <article>
            <strong>Unsupported</strong>
            <span>{payload.parityReport.summary.unsupported}</span>
          </article>
          <article>
            <strong>Unknown</strong>
            <span>{payload.parityReport.summary.unknown}</span>
          </article>
        </div>
        <p className="phase1-parity-meta">
          Source fingerprint: <code>{payload.parityReport.sourceFingerprint}</code>
        </p>
      </section>

      <section className="phase1-parity-diagnostics-section">
        <h2>Layout Foundation</h2>
        <p>
          Layout <strong>{payload.layout.layoutName}</strong> ({payload.layout.layoutId}) in{" "}
          <strong>{payload.layout.source}</strong> source.
        </p>
        <div className="phase1-layout-summary-grid">
          <article>
            <strong>Canvas</strong>
            <span>
              {payload.layout.canvas.width} × {payload.layout.canvas.height}
            </span>
          </article>
          <article>
            <strong>Parts</strong>
            <span>{payload.layout.partCount}</span>
          </article>
          <article>
            <strong>Objects</strong>
            <span data-testid="phase1-layout-object-count">{payload.layout.objectCount}</span>
          </article>
          <article>
            <strong>Grouped Objects</strong>
            <span>{payload.layout.groupedObjectCount}</span>
          </article>
          <article>
            <strong>Base TO</strong>
            <span>{payload.layout.defaultTableOccurrence}</span>
          </article>
        </div>

        <div className="phase1-layout-canvas-scroll">
          <div
            className="phase1-layout-canvas"
            style={{
              width: `${Math.min(payload.layout.canvas.width, 1200)}px`,
              height: `${Math.min(payload.layout.canvas.height, 420)}px`
            }}
          >
            {layoutObjects.map((entry) => (
              <div
                key={entry.id}
                className="phase1-layout-object-box"
                data-testid="phase1-layout-object-row"
                style={{
                  left: `${Math.max(0, Math.round(entry.x))}px`,
                  top: `${Math.max(0, Math.round(entry.y))}px`,
                  width: `${Math.max(24, Math.round(entry.width))}px`,
                  height: `${Math.max(18, Math.round(entry.height))}px`,
                  zIndex: Math.max(1, Math.round(entry.z))
                }}
              >
                <span>
                  {entry.type} · {entry.id}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="phase1-layout-object-table-wrap">
          <table className="phase1-layout-object-table">
            <thead>
              <tr>
                <th>Object</th>
                <th>Type</th>
                <th>X</th>
                <th>Y</th>
                <th>W</th>
                <th>H</th>
                <th>Z</th>
                <th>Binding</th>
              </tr>
            </thead>
            <tbody>
              {layoutObjects.map((entry) => (
                <tr key={`row-${entry.id}`}>
                  <td>{entry.id}</td>
                  <td>{entry.type}</td>
                  <td>{entry.x}</td>
                  <td>{entry.y}</td>
                  <td>{entry.width}</td>
                  <td>{entry.height}</td>
                  <td>{entry.z}</td>
                  <td>{entry.fieldBinding ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="phase1-parity-diagnostics-section">
        <h2>Baseline Snapshot</h2>
        {payload.baseline ? (
          <pre>{JSON.stringify(payload.baseline, null, 2)}</pre>
        ) : (
          <p>No baseline cache found. Run <code>npm run audit</code> to refresh baseline artifacts.</p>
        )}
      </section>
    </main>
  );
}

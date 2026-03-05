import type { RepoBaseline } from "../models/types";

function markdownTable(rows: string[][]): string {
  if (rows.length === 0) {
    return "";
  }
  const header = rows[0];
  const divider = header.map(() => "---");
  const lines = [
    `| ${header.join(" | ")} |`,
    `| ${divider.join(" | ")} |`
  ];
  for (const row of rows.slice(1)) {
    lines.push(`| ${row.join(" | ")} |`);
  }
  return lines.join("\n");
}

export function generateBaselineReport(baseline: RepoBaseline, architectureMermaid: string): string {
  const featureInventory = markdownTable([
    ["Area", "Current State", "Primary Evidence"],
    [
      "Layout Mode",
      "Large visual design surface with inspector, object tools, portal setup, app-layer managers",
      "components/layout-mode.tsx; src/lib/layout-model.ts"
    ],
    [
      "Browse/Find/Preview",
      "Metadata-driven runtime with found sets, edit session, list/table/preview, portals",
      "components/browse-mode.tsx; src/lib/find-mode.ts; src/lib/edit-session/index.ts"
    ],
    [
      "DDR Ingestion",
      "Import script + workspace import route normalizing DDR into workspace artifacts",
      "scripts/import-ddr-layouts.mjs; app/api/workspaces/import/route.ts"
    ],
    [
      "Data API",
      "Server proxy with multi-file routing, retries, circuit handling, mock fallback",
      "src/server/filemaker-client.ts; src/server/workspace-multifile.ts"
    ],
    [
      "Scripting/Runtime Kernel",
      "Kernel + script engine + variables + transaction manager + triggers",
      "src/lib/runtime-kernel/*; src/lib/triggers/*"
    ],
    [
      "Security",
      "Middleware auth, request guards, csrf, authorization, audit logging",
      "middleware.ts; src/server/security/*; src/server/audit-log.ts"
    ],
    [
      "Testing",
      "Broad node test suites plus layout fidelity and perf scripts",
      "package.json scripts; scripts/layout-fidelity.mts; scripts/bench-perf.mts"
    ]
  ]);

  const moduleMap = markdownTable([
    ["Subsystem", "Modules"],
    ["Entrypoints", baseline.architecture.entrypoints.join("<br>")],
    ["Layout Mode modules", baseline.architecture.layoutModeModules.join("<br>")],
    ["Browse Mode modules", baseline.architecture.browseModeModules.join("<br>")],
    ["DDR modules", baseline.architecture.ddrModules.join("<br>")],
    ["Data API modules", baseline.architecture.dataApiModules.join("<br>")],
    ["Security modules", baseline.architecture.securityModules.join("<br>")],
    ["Plugin modules", baseline.architecture.pluginModules.join("<br>")]
  ]);

  const toolchainTable = markdownTable([
    ["Tooling", "Detected Value"],
    ["Package manager", baseline.toolchain.packageManager],
    ["Next.js", baseline.toolchain.nextVersion],
    ["React", baseline.toolchain.reactVersion],
    ["TypeScript", baseline.toolchain.typescriptVersion],
    ["TS strict", baseline.toolchain.hasStrictTypescript ? "true" : "false"],
    ["Linting", baseline.toolchain.linting.join(", ") || "not detected"],
    ["Test script count", String(baseline.toolchain.testScripts.length)]
  ]);

  const inventoryTable = markdownTable([
    ["Inventory", "Count"],
    ["API route handlers", String(baseline.inventory.apiRouteCount)],
    ["Components", String(baseline.inventory.componentCount)],
    ["Library modules", String(baseline.inventory.libModuleCount)],
    ["Server modules", String(baseline.inventory.serverModuleCount)]
  ]);

  const riskList = baseline.knownRisks.map((risk) => `- ${risk}`).join("\n");

  return [
    "# FMWeb IDE Baseline Report",
    "",
    `Generated: ${baseline.generatedAt}`,
    "",
    "## Toolchain Discovery",
    "",
    toolchainTable,
    "",
    "## Architecture Inventory",
    "",
    inventoryTable,
    "",
    "## Feature Inventory (Design + Runtime)",
    "",
    featureInventory,
    "",
    "## Module Map",
    "",
    moduleMap,
    "",
    "## Runtime/Data Flow Summary",
    "",
    `- State management: ${baseline.findings.stateManagement}`,
    `- Data access: ${baseline.findings.dataAccess}`,
    `- Storage: ${baseline.findings.storage}`,
    `- Rendering pipeline: ${baseline.findings.renderingPipeline}`,
    `- Security posture: ${baseline.findings.securityPosture}`,
    "",
    "## Architecture Diagram (Mermaid)",
    "",
    "```mermaid",
    architectureMermaid,
    "```",
    "",
    "## Known Gaps & Risks",
    "",
    riskList,
    "",
    "## FileMaker Parity Notes",
    "",
    "When behavior certainty is limited, this audit marks assumptions and recommends validation tests in the parity matrix and test plan."
  ].join("\n");
}

import path from "node:path";
import { existsSync, promises as fs } from "node:fs";
import type { RepoBaseline } from "../models/types";
import type { RepoIndex } from "./repo-index";

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function detectPackageManager(repoRoot: string): string {
  const lockFiles = [
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["package-lock.json", "npm"],
    ["bun.lockb", "bun"]
  ] as const;
  for (const [lockFile, manager] of lockFiles) {
    if (existsSync(path.join(repoRoot, lockFile))) {
      return manager;
    }
  }
  return "npm";
}

function listByPrefix(input: Record<string, string>, prefix: string): string[] {
  return Object.keys(input)
    .filter((entry) => entry.startsWith(prefix))
    .sort((a, b) => a.localeCompare(b));
}

function summarizeStateManagement(index: RepoIndex): string {
  const joined = index.files.map((file) => file.contentLower).join("\n");
  const hasRedux = joined.includes("redux") || joined.includes("@reduxjs");
  const hasZustand = joined.includes("zustand");
  const hasContext = joined.includes("createcontext(");
  const hasKernel = joined.includes("createRuntimeKernel".toLowerCase());
  const hasLocalState = joined.includes("usestate(");

  const parts: string[] = [];
  if (hasKernel) {
    parts.push("Hybrid: local React state plus dedicated runtime kernel modules for found sets/windows/scripts/context");
  }
  if (hasRedux) {
    parts.push("Redux usage detected");
  }
  if (hasZustand) {
    parts.push("Zustand usage detected");
  }
  if (hasContext) {
    parts.push("React context present in some surfaces");
  }
  if (hasLocalState) {
    parts.push("Large mode components rely heavily on local useState/useMemo/useEffect state");
  }
  return parts.join("; ") || "Primarily local React component state";
}

function summarizeDataAccess(index: RepoIndex): string {
  const hasFmClient = index.files.some((file) => file.relPath === "src/server/filemaker-client.ts");
  const hasFmRoutes = index.files.some((file) => file.relPath.startsWith("app/api/fm/"));
  const hasMultiFile = index.files.some((file) => file.relPath === "src/server/workspace-multifile.ts");
  const hasMock = index.files.some((file) => file.relPath === "src/server/mock-record-storage.ts");
  const parts = [
    hasFmClient ? "Server-side FileMaker Data API adapter" : "No FileMaker adapter detected",
    hasFmRoutes ? "API proxy routes under app/api/fm/*" : "No fm route handlers detected",
    hasMultiFile ? "Workspace multi-file routing and DB-aware target resolution" : "No explicit multi-file routing module",
    hasMock ? "Mock fallback storage for offline/dev execution" : "No mock fallback detected"
  ];
  return parts.join("; ");
}

function summarizeStorage(index: RepoIndex): string {
  const hasLayoutStorage = index.files.some((file) => file.relPath === "src/server/layout-storage.ts");
  const hasWorkspaceContext = index.files.some((file) => file.relPath === "src/server/workspace-context.ts");
  const hasSavedSearch = index.files.some((file) => file.relPath === "src/server/saved-search-storage.ts");
  const hasVersioning = index.files.some((file) => file.relPath === "src/server/workspace-versioning.ts");
  const hasAppLayer = index.files.some((file) => file.relPath === "src/server/app-layer-storage.ts");
  const parts = [
    hasLayoutStorage ? "Layout JSON persistence in workspace/data directories" : "Layout storage module missing",
    hasWorkspaceContext ? "Workspace-scoped config and metadata storage" : "Workspace context storage missing",
    hasSavedSearch ? "Saved find/found set persistence" : "Saved search storage missing",
    hasVersioning ? "Workspace versioning snapshots" : "Versioning storage missing",
    hasAppLayer ? "App-layer manager state storage" : "App-layer storage missing"
  ];
  return parts.join("; ");
}

function summarizeRendering(index: RepoIndex): string {
  const hasImporter = index.files.some((file) => file.relPath === "scripts/import-ddr-layouts.mjs");
  const hasModel = index.files.some((file) => file.relPath === "src/lib/layout-model.ts");
  const hasFidelity = index.files.some((file) => file.relPath.startsWith("src/lib/layout-fidelity/"));
  const hasLayoutMode = index.files.some((file) => file.relPath === "components/layout-mode.tsx");
  const hasBrowseMode = index.files.some((file) => file.relPath === "components/browse-mode.tsx");
  return [
    hasImporter ? "DDR importer script normalizes XML into workspace layout artifacts" : "No importer detected",
    hasModel ? "Shared layout model used by design and runtime surfaces" : "No shared layout model detected",
    hasFidelity ? "Anchor/style/interaction fidelity engines present" : "No fidelity engine modules detected",
    hasLayoutMode && hasBrowseMode
      ? "Layout Mode and Browse Mode render from common metadata model"
      : "Mode renderer parity path not fully detected"
  ].join("; ");
}

function summarizeSecurity(index: RepoIndex): string {
  const hasMiddleware = index.files.some((file) => file.relPath === "middleware.ts");
  const hasRequestContext = index.files.some((file) => file.relPath === "src/server/security/request-context.ts");
  const hasCsrf = index.files.some((file) => file.relPath === "src/server/security/csrf.ts");
  const hasSession = index.files.some((file) => file.relPath === "src/server/security/session-store.ts");
  const hasAudit = index.files.some((file) => file.relPath === "src/server/audit-log.ts");
  return [
    hasMiddleware ? "Next middleware enforces auth, security headers, and correlation ids" : "No middleware security layer detected",
    hasRequestContext ? "Per-route authz + CSRF guard utility" : "No route guard utility detected",
    hasCsrf ? "CSRF validation module" : "No CSRF module",
    hasSession ? "Session/JWT/trusted-header auth handling" : "No session module",
    hasAudit ? "Structured audit logging module" : "No audit logging module"
  ].join("; ");
}

function countByPrefix(index: RepoIndex, prefix: string): number {
  return index.files.filter((file) => file.relPath.startsWith(prefix)).length;
}

function collectKnownRisks(index: RepoIndex): string[] {
  const risks: string[] = [];
  const largeComponents = index.files
    .filter((file) => file.relPath === "components/layout-mode.tsx" || file.relPath === "components/browse-mode.tsx")
    .map((file) => ({ file: file.relPath, lines: file.lines.length }));
  for (const item of largeComponents) {
    if (item.lines > 5_000) {
      risks.push(`${item.file} is very large (${item.lines} LOC) and has high regression coupling risk.`);
    }
  }

  if (index.files.some((file) => file.relPath.includes("portal") && file.contentLower.includes("todo"))) {
    risks.push("Portal modules contain TODO markers that may indicate parity edge cases still pending.");
  }

  risks.push("Multi-file routing depends on workspace mapping completeness; missing API layout mappings can surface runtime save errors.");
  risks.push("Mode switching and route-state synchronization are high-risk for recursive update loops in large browse-mode component state.");
  risks.push("App-layer breadth is large; capability gating drift can happen unless matrix coverage is enforced in CI.");
  return risks;
}

export async function discoverRepoBaseline(repoRoot: string, index: RepoIndex, runFingerprint: string): Promise<RepoBaseline> {
  const packageJson = (await readJson<{ dependencies?: Record<string, string>; devDependencies?: Record<string, string>; scripts?: Record<string, string> }>(
    path.join(repoRoot, "package.json")
  )) ?? { dependencies: {}, devDependencies: {}, scripts: {} };

  const tsconfig = (await readJson<{ compilerOptions?: { strict?: boolean } }>(path.join(repoRoot, "tsconfig.json"))) ?? {
    compilerOptions: { strict: false }
  };

  const deps = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {})
  };

  const toolchain = {
    packageManager: detectPackageManager(repoRoot),
    nextVersion: deps.next ?? "unknown",
    reactVersion: deps.react ?? "unknown",
    typescriptVersion: deps.typescript ?? "unknown",
    hasStrictTypescript: Boolean(tsconfig.compilerOptions?.strict),
    linting: ["eslint", "eslint-config-next"].filter((entry) => Boolean(deps[entry])),
    testScripts: listByPrefix(packageJson.scripts ?? {}, "test")
  };

  const baseline: RepoBaseline = {
    generatedAt: `fingerprint:${runFingerprint}`,
    repoRoot,
    toolchain,
    architecture: {
      entrypoints: [
        "app/page.tsx",
        "app/layouts/[id]/edit/page.tsx",
        "app/layouts/[id]/browse/page.tsx",
        "components/layout-mode.tsx",
        "components/browse-mode.tsx"
      ],
      layoutModeModules: [
        "components/layout-mode.tsx",
        "src/lib/layout-model.ts",
        "src/lib/layout-arrange.ts",
        "src/lib/tab-order.ts"
      ],
      browseModeModules: [
        "components/browse-mode.tsx",
        "src/lib/edit-session/index.ts",
        "src/lib/find-mode.ts",
        "src/lib/list-table-runtime.ts",
        "src/lib/portal-runtime.ts"
      ],
      ddrModules: [
        "scripts/import-ddr-layouts.mjs",
        "app/api/workspaces/import/route.ts",
        "src/server/layout-storage.ts"
      ],
      dataApiModules: [
        "app/api/fm/records/route.ts",
        "app/api/fm/find/route.ts",
        "src/server/filemaker-client.ts",
        "src/server/workspace-multifile.ts"
      ],
      securityModules: [
        "middleware.ts",
        "src/server/security/request-context.ts",
        "src/server/security/csrf.ts",
        "src/server/security/session-store.ts",
        "src/server/security/authorization.ts"
      ],
      pluginModules: [
        "src/plugins/manager.ts",
        "src/plugins/registry.ts",
        "src/plugins/runtime.ts"
      ],
      testingModules: [
        "src/lib/*.test.mts",
        "src/server/*.test.mts",
        "scripts/layout-fidelity.mts",
        "scripts/bench-perf.mts"
      ]
    },
    inventory: {
      apiRouteCount: countByPrefix(index, "app/api/"),
      componentCount: countByPrefix(index, "components/"),
      libModuleCount: countByPrefix(index, "src/lib/"),
      serverModuleCount: countByPrefix(index, "src/server/")
    },
    findings: {
      stateManagement: summarizeStateManagement(index),
      dataAccess: summarizeDataAccess(index),
      storage: summarizeStorage(index),
      renderingPipeline: summarizeRendering(index),
      securityPosture: summarizeSecurity(index)
    },
    knownRisks: collectKnownRisks(index)
  };

  return baseline;
}

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { promises as fs } from "node:fs";

type RunnerArgs = {
  reportOnly: boolean;
  updateBaseline: boolean;
  skipTests: boolean;
};

type CommandResult = {
  id: string;
  label: string;
  mode: string;
  status: "tested" | "skipped" | "not-found" | "error";
  reason?: string;
};

type CommandSummary = {
  tested: number;
  skipped: number;
  notFound: number;
  error: number;
  discoveredEnabled: number;
  coverage: number;
};

type CommandResultsPayload = {
  generatedAt: string;
  summary: CommandSummary;
  results: CommandResult[];
};

type FlatUiTestResult = {
  testKey: string;
  title: string;
  file: string;
  project: string;
  status: string;
  expectedStatus: string;
  flaky: boolean;
  retries: number;
  scenarioId: string | null;
  errorMessage: string;
  errorClass: string;
  attachments: string[];
};

type ScenarioStatus = "passed" | "failed" | "skipped" | "not-run";

type ScenarioResult = {
  id: string;
  title: string;
  group: string;
  smoke: boolean;
  status: ScenarioStatus;
  tests: string[];
  invariants: string[];
};

type InvariantStatus = "passed" | "failed" | "skipped";

type InvariantResult = {
  id: string;
  description: string;
  status: InvariantStatus;
  tests: string[];
  scenarios: string[];
};

type FailureRecord = {
  signature: string;
  testKey: string;
  title: string;
  file: string;
  project: string;
  area: string;
  scenarioId: string | null;
  errorClass: string;
  errorMessage: string;
  attachments: string[];
  selectors: string[];
};

type FlakeRecord = {
  signature: string;
  testKey: string;
  title: string;
  reason: string;
  allowlisted: boolean;
  isNew: boolean;
};

type BaselinePayload = {
  generatedAt: string;
  environment: {
    node: string;
    ci: boolean;
    projects: string[];
  };
  metrics: {
    parityScore: number;
    commandCoverage: number;
    invariantPassRate: number;
    scenarioPassRate: number;
    crossBrowserPassRate: number;
  };
  commandSummary: CommandSummary;
  invariants: Array<{ id: string; status: InvariantStatus }>;
  scenarios: Array<{ id: string; status: ScenarioStatus; smoke: boolean }>;
  suites: Array<{ name: string; passed: number; failed: number; skipped: number }>;
  failures: Array<{ signature: string; testKey: string; errorClass: string }>;
  flakes: Array<{ signature: string; testKey: string; reason: string }>;
};

const REQUIRED_COMMAND_COVERAGE = 0.8;
const MAX_FLAKES = 2;
const AUDIT_DIR = path.join(process.cwd(), "docs", "audit");
const AUDIT_CACHE_DIR = path.join(AUDIT_DIR, ".cache");
const TEST_RESULTS_DIR = path.join(process.cwd(), "test-results", "ui-native-parity");

function parseArgs(argv: string[]): RunnerArgs {
  return {
    reportOnly: argv.includes("--report-only"),
    updateBaseline: argv.includes("--update-baseline"),
    skipTests: argv.includes("--skip-tests")
  };
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function writeText(filePath: string, content: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${content.endsWith("\n") ? content : `${content}\n`}`, "utf8");
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function readJsonSafe<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function hashSignature(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

function normalizeText(input: string): string {
  return input.replace(/\s+/g, " ").trim().toLowerCase();
}

function normalizeErrorClass(message: string): string {
  const normalized = normalizeText(message);
  if (!normalized) {
    return "no-error-message";
  }
  if (normalized.includes("timeout")) {
    return "timeout";
  }
  if (normalized.includes("selector") || normalized.includes("strict mode violation") || normalized.includes("not found")) {
    return "selector-not-found";
  }
  if (normalized.includes("expect(") || normalized.includes("tohave") || normalized.includes("tobe")) {
    return "assertion-failure";
  }
  if (normalized.includes("detached") || normalized.includes("closed")) {
    return "target-detached";
  }
  if (normalized.includes("network")) {
    return "network";
  }
  return "runtime-error";
}

function parseScenarioId(title: string): string | null {
  const match = title.match(/\[(SCN-\d{3})\]/);
  return match ? match[1] : null;
}

function matchesPattern(text: string, pattern: string): boolean {
  return normalizeText(text).includes(normalizeText(pattern));
}

function detectArea(title: string, scenarioGroup?: string): string {
  if (scenarioGroup) {
    if (scenarioGroup.includes("portal")) {
      return "portals";
    }
    if (scenarioGroup.includes("find")) {
      return "find-mode";
    }
    if (scenarioGroup.includes("layout")) {
      return "layout-mode";
    }
    if (scenarioGroup.includes("navigation")) {
      return "navigation-history";
    }
    if (scenarioGroup.includes("browse")) {
      return "browse-record-lifecycle";
    }
  }

  const lowered = normalizeText(title);
  if (lowered.includes("portal")) {
    return "portals";
  }
  if (lowered.includes("find")) {
    return "find-mode";
  }
  if (lowered.includes("layout")) {
    return "layout-mode";
  }
  if (lowered.includes("menu") || lowered.includes("command")) {
    return "menus-and-commands";
  }
  if (lowered.includes("commit") || lowered.includes("revert") || lowered.includes("dirty")) {
    return "commit-revert";
  }
  if (lowered.includes("preview")) {
    return "preview-mode";
  }
  if (lowered.includes("focus") || lowered.includes("keyboard")) {
    return "keyboard-focus";
  }
  return "runtime-general";
}

function extractSelectors(message: string): string[] {
  const selectors = new Set<string>();
  for (const match of message.matchAll(/(\.[a-z0-9_-]+(?:\s*[>+~]?\s*\.[a-z0-9_-]+)*)/gi)) {
    selectors.add(match[1]);
  }
  for (const match of message.matchAll(/button:has-text\(([^)]+)\)/gi)) {
    selectors.add(`button:has-text(${match[1]})`);
  }
  return [...selectors].slice(0, 4);
}

function summarizeSuites(flatResults: FlatUiTestResult[]): Array<{ name: string; passed: number; failed: number; skipped: number }> {
  const bySuite = new Map<string, { passed: number; failed: number; skipped: number }>();
  for (const result of flatResults) {
    const current = bySuite.get(result.file) ?? { passed: 0, failed: 0, skipped: 0 };
    if (result.status === "passed") {
      current.passed += 1;
    } else if (result.status === "skipped") {
      current.skipped += 1;
    } else {
      current.failed += 1;
    }
    bySuite.set(result.file, current);
  }

  return [...bySuite.entries()]
    .map(([name, counts]) => ({ name, ...counts }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function runUiTests(): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ["--experimental-strip-types", "scripts/run-ui-tests.mts"],
      {
        cwd: process.cwd(),
        stdio: "inherit",
        shell: false,
        env: {
          ...process.env,
          UI_SCENARIO_MODE: process.env.UI_SCENARIO_MODE ?? "smoke"
        }
      }
    );
    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });
}

async function loadCommandResults(): Promise<CommandResultsPayload> {
  const commandResultPath = path.join(TEST_RESULTS_DIR, "command-results.json");
  const existing = await readJsonSafe<CommandResultsPayload>(commandResultPath);
  if (existing?.summary && Array.isArray(existing.results)) {
    return existing;
  }

  const registryModulePath = pathToFileURL(path.join(process.cwd(), "tests", "ui", "native-parity", "commandRegistry.mts")).href;
  const registryModule = await import(registryModulePath);
  const fallbackResults: CommandResult[] = (registryModule.nativeCommandRegistry ?? []).map((entry: { id: string; label: string; modes: string[] }) => ({
    id: entry.id,
    label: entry.label,
    mode: entry.modes[0] ?? "browse",
    status: "skipped",
    reason: "UI test run did not execute command harness"
  }));

  const summary: CommandSummary = {
    tested: 0,
    skipped: fallbackResults.length,
    notFound: 0,
    error: 0,
    discoveredEnabled: 0,
    coverage: 0
  };

  return {
    generatedAt: new Date().toISOString(),
    summary,
    results: fallbackResults
  };
}

function flattenPlaywrightSuites(report: any): FlatUiTestResult[] {
  const flat: FlatUiTestResult[] = [];

  const walk = (suite: any, parents: string[], fileHint: string): void => {
    const nextParents = suite.title ? [...parents, suite.title] : parents;
    const suiteFile = typeof suite.file === "string" ? suite.file : fileHint;

    if (Array.isArray(suite.specs)) {
      for (const spec of suite.specs) {
        const titleParts = [...nextParents, spec.title].filter((value) => Boolean(value));
        const fullTitle = titleParts.join(" > ");
        const specFile = typeof spec.file === "string" ? spec.file : suiteFile || "unknown";
        const specTests = Array.isArray(spec.tests) ? spec.tests : [];

        for (const testEntry of specTests) {
          const results = Array.isArray(testEntry.results) ? testEntry.results : [];
          const finalResult = results.at(-1) ?? null;
          const finalStatus = String(testEntry.status ?? finalResult?.status ?? "unknown");
          const firstFail =
            results.find((entry: any) => ["failed", "timedOut", "interrupted"].includes(String(entry?.status))) ?? null;
          const errorMessage =
            String(firstFail?.error?.message ?? firstFail?.errors?.[0]?.message ?? finalResult?.error?.message ?? "");
          const project = String(testEntry.projectName ?? "chromium");
          const scenarioId = parseScenarioId(fullTitle);
          const flaky =
            String(testEntry.outcome ?? "") === "flaky" ||
            (finalStatus === "passed" &&
              results.some((entry: any) => ["failed", "timedOut", "interrupted"].includes(String(entry?.status))));
          const attachments = results
            .flatMap((entry: any) => (Array.isArray(entry?.attachments) ? entry.attachments : []))
            .map((attachment: any) => String(attachment?.path ?? ""))
            .filter((item: string) => item.length > 0);

          flat.push({
            testKey: `${project}::${specFile}::${fullTitle}`,
            title: fullTitle,
            file: specFile,
            project,
            status: finalStatus,
            expectedStatus: String(testEntry.expectedStatus ?? "passed"),
            flaky,
            retries: Math.max(0, results.length - 1),
            scenarioId,
            errorMessage,
            errorClass: normalizeErrorClass(errorMessage),
            attachments
          });
        }
      }
    }

    if (Array.isArray(suite.suites)) {
      for (const child of suite.suites) {
        walk(child, nextParents, suiteFile);
      }
    }
  };

  for (const suite of Array.isArray(report?.suites) ? report.suites : []) {
    walk(suite, [], "");
  }

  return flat;
}

async function loadFlatUiResults(): Promise<FlatUiTestResult[]> {
  const reportPath = path.join(TEST_RESULTS_DIR, "playwright-results.json");
  const report = await readJsonSafe<any>(reportPath);
  if (!report) {
    return [];
  }
  return flattenPlaywrightSuites(report);
}

async function loadScenarioCatalog(): Promise<Array<{ id: string; title: string; group: string; smoke: boolean; expectedInvariants: string[] }>> {
  const modulePath = pathToFileURL(path.join(process.cwd(), "tests", "ui", "native-parity", "scenarios", "index.mts")).href;
  const module = await import(modulePath);
  return (module.nativeParityScenarios ?? []).map((scenario: any) => ({
    id: String(scenario.id),
    title: String(scenario.title),
    group: String(scenario.group),
    smoke: Boolean(scenario.smoke),
    expectedInvariants: Array.isArray(scenario.expectedInvariants)
      ? scenario.expectedInvariants.map((item: unknown) => String(item))
      : []
  }));
}

async function loadInvariantMappings(): Promise<Array<{ invariantId: string; testTitlePatterns: string[]; scenarioIds: string[]; description: string }>> {
  const modulePath = pathToFileURL(path.join(process.cwd(), "tests", "ui", "native-parity", "invariantMap.ts")).href;
  const module = await import(modulePath);
  return (module.invariantMappings ?? []).map((entry: any) => ({
    invariantId: String(entry.invariantId),
    testTitlePatterns: Array.isArray(entry.testTitlePatterns) ? entry.testTitlePatterns.map((item: unknown) => String(item)) : [],
    scenarioIds: Array.isArray(entry.scenarioIds) ? entry.scenarioIds.map((item: unknown) => String(item)) : [],
    description: String(entry.description ?? "")
  }));
}

async function loadParityCoverageMap(): Promise<
  Array<{ parityTaxonomyId: string; testTitlePatterns: string[]; scenarioIds: string[]; invariants: string[] }>
> {
  const modulePath = pathToFileURL(path.join(process.cwd(), "tests", "ui", "native-parity", "parityMap.ts")).href;
  const module = await import(modulePath);
  return (module.parityCoverageMap ?? []).map((entry: any) => ({
    parityTaxonomyId: String(entry.parityTaxonomyId),
    testTitlePatterns: Array.isArray(entry.testTitlePatterns) ? entry.testTitlePatterns.map((item: unknown) => String(item)) : [],
    scenarioIds: Array.isArray(entry.scenarioIds) ? entry.scenarioIds.map((item: unknown) => String(item)) : [],
    invariants: Array.isArray(entry.invariants) ? entry.invariants.map((item: unknown) => String(item)) : []
  }));
}

function buildScenarioResults(
  scenarioCatalog: Array<{ id: string; title: string; group: string; smoke: boolean; expectedInvariants: string[] }>,
  flatResults: FlatUiTestResult[]
): { scenarios: ScenarioResult[]; scenarioPassRate: number; scenarioCounts: { passed: number; failed: number; skipped: number; notRun: number } } {
  const scenarios: ScenarioResult[] = scenarioCatalog.map((scenario) => {
    const relatedTests = flatResults.filter((entry) => entry.scenarioId === scenario.id);
    let status: ScenarioStatus = "not-run";
    if (relatedTests.length > 0) {
      if (relatedTests.some((entry) => ["failed", "timedOut", "interrupted"].includes(entry.status))) {
        status = "failed";
      } else if (relatedTests.some((entry) => entry.status === "passed")) {
        status = "passed";
      } else if (relatedTests.every((entry) => entry.status === "skipped")) {
        status = "skipped";
      }
    }

    return {
      id: scenario.id,
      title: scenario.title,
      group: scenario.group,
      smoke: scenario.smoke,
      status,
      tests: relatedTests.map((entry) => entry.title),
      invariants: scenario.expectedInvariants
    };
  });

  const counts = scenarios.reduce(
    (acc, scenario) => {
      if (scenario.status === "passed") {
        acc.passed += 1;
      } else if (scenario.status === "failed") {
        acc.failed += 1;
      } else if (scenario.status === "skipped") {
        acc.skipped += 1;
      } else {
        acc.notRun += 1;
      }
      return acc;
    },
    { passed: 0, failed: 0, skipped: 0, notRun: 0 }
  );

  const total = scenarios.length || 1;
  const scenarioPassRate = counts.passed / total;

  return {
    scenarios,
    scenarioPassRate,
    scenarioCounts: counts
  };
}

function buildInvariantResults(
  mappings: Array<{ invariantId: string; testTitlePatterns: string[]; scenarioIds: string[]; description: string }>,
  flatResults: FlatUiTestResult[],
  scenarioResults: ScenarioResult[]
): { invariants: InvariantResult[]; invariantPassRate: number; invariantCounts: { passed: number; failed: number; skipped: number } } {
  const scenarioStatusMap = new Map(scenarioResults.map((scenario) => [scenario.id, scenario.status]));

  const invariants: InvariantResult[] = mappings.map((mapping) => {
    const matchedTests = flatResults.filter((entry) =>
      mapping.testTitlePatterns.some((pattern) => matchesPattern(entry.title, pattern))
    );
    const scenarioStatuses = mapping.scenarioIds.map((scenarioId) => scenarioStatusMap.get(scenarioId) ?? "not-run");

    const hasFailedTest = matchedTests.some((entry) => ["failed", "timedOut", "interrupted"].includes(entry.status));
    const hasPassedTest = matchedTests.some((entry) => entry.status === "passed");
    const hasFailedScenario = scenarioStatuses.some((status) => status === "failed");
    const hasPassedScenario = scenarioStatuses.some((status) => status === "passed");

    let status: InvariantStatus = "skipped";
    if (hasFailedTest || hasFailedScenario) {
      status = "failed";
    } else if (hasPassedTest || hasPassedScenario) {
      status = "passed";
    }

    return {
      id: mapping.invariantId,
      description: mapping.description,
      status,
      tests: matchedTests.map((entry) => entry.title),
      scenarios: mapping.scenarioIds
    };
  });

  const counts = invariants.reduce(
    (acc, invariant) => {
      if (invariant.status === "passed") {
        acc.passed += 1;
      } else if (invariant.status === "failed") {
        acc.failed += 1;
      } else {
        acc.skipped += 1;
      }
      return acc;
    },
    { passed: 0, failed: 0, skipped: 0 }
  );

  const total = invariants.length || 1;
  const invariantPassRate = counts.passed / total;

  return {
    invariants,
    invariantPassRate,
    invariantCounts: counts
  };
}

function computeCrossBrowserPassRate(flatResults: FlatUiTestResult[]): {
  projects: string[];
  projectRates: Array<{ project: string; passRate: number; passed: number; total: number }>;
  crossBrowserPassRate: number;
  crossBrowserEnabled: boolean;
} {
  const byProject = new Map<string, { passed: number; total: number }>();
  for (const result of flatResults) {
    const current = byProject.get(result.project) ?? { passed: 0, total: 0 };
    current.total += 1;
    if (result.status === "passed") {
      current.passed += 1;
    }
    byProject.set(result.project, current);
  }

  const projectRates = [...byProject.entries()]
    .map(([project, counts]) => ({
      project,
      passed: counts.passed,
      total: counts.total,
      passRate: counts.total > 0 ? counts.passed / counts.total : 0
    }))
    .sort((a, b) => a.project.localeCompare(b.project));

  const crossBrowserEnabled = projectRates.length > 1;
  const crossBrowserPassRate =
    projectRates.length > 0 ? projectRates.reduce((sum, entry) => sum + entry.passRate, 0) / projectRates.length : 0;

  return {
    projects: projectRates.map((entry) => entry.project),
    projectRates,
    crossBrowserPassRate,
    crossBrowserEnabled
  };
}

function computeParityScore(input: {
  commandCoverage: number;
  invariantPassRate: number;
  scenarioPassRate: number;
  crossBrowserPassRate: number;
  crossBrowserEnabled: boolean;
}): { parityScore: number; components: { commandWeight: number; invariantWeight: number; scenarioWeight: number; crossBrowserWeight: number } } {
  const baseWeights = {
    command: 0.35,
    invariant: 0.35,
    scenario: 0.25,
    crossBrowser: 0.05
  };

  const weights = input.crossBrowserEnabled
    ? {
        commandWeight: baseWeights.command,
        invariantWeight: baseWeights.invariant,
        scenarioWeight: baseWeights.scenario,
        crossBrowserWeight: baseWeights.crossBrowser
      }
    : {
        commandWeight: baseWeights.command / 0.95,
        invariantWeight: baseWeights.invariant / 0.95,
        scenarioWeight: baseWeights.scenario / 0.95,
        crossBrowserWeight: 0
      };

  const score =
    input.commandCoverage * weights.commandWeight +
    input.invariantPassRate * weights.invariantWeight +
    input.scenarioPassRate * weights.scenarioWeight +
    input.crossBrowserPassRate * weights.crossBrowserWeight;

  return {
    parityScore: Number((score * 100).toFixed(2)),
    components: weights
  };
}

function buildFailures(
  flatResults: FlatUiTestResult[],
  scenarioGroupById: Map<string, string>
): { failures: FailureRecord[]; topFailingAreas: Array<{ area: string; count: number }> } {
  const failedTests = flatResults.filter((entry) => ["failed", "timedOut", "interrupted"].includes(entry.status));
  const failures: FailureRecord[] = failedTests.map((entry) => {
    const scenarioGroup = entry.scenarioId ? scenarioGroupById.get(entry.scenarioId) : undefined;
    const area = detectArea(entry.title, scenarioGroup);
    const selectors = extractSelectors(entry.errorMessage);
    const signature = hashSignature(
      [entry.file, entry.title, entry.project, entry.scenarioId ?? "", entry.errorClass, selectors.join(",")].join("|")
    );
    return {
      signature,
      testKey: entry.testKey,
      title: entry.title,
      file: entry.file,
      project: entry.project,
      area,
      scenarioId: entry.scenarioId,
      errorClass: entry.errorClass,
      errorMessage: entry.errorMessage,
      attachments: entry.attachments,
      selectors
    };
  });

  const areaCounts = new Map<string, number>();
  for (const failure of failures) {
    areaCounts.set(failure.area, (areaCounts.get(failure.area) ?? 0) + 1);
  }
  const topFailingAreas = [...areaCounts.entries()]
    .map(([area, count]) => ({ area, count }))
    .sort((a, b) => b.count - a.count || a.area.localeCompare(b.area))
    .slice(0, 10);

  return { failures, topFailingAreas };
}

function suspectedModulesForArea(area: string): string[] {
  if (area === "portals") {
    return ["components/browse-mode.tsx", "src/lib/portal-runtime.ts", "src/lib/portal-utils.ts"];
  }
  if (area === "find-mode") {
    return ["components/browse-mode.tsx", "src/lib/find-mode.ts", "src/lib/runtime-kernel/kernel.ts"];
  }
  if (area === "layout-mode") {
    return ["components/layout-mode.tsx", "components/layout-mode-shell.tsx", "src/lib/layout-model.ts"];
  }
  if (area === "menus-and-commands") {
    return ["components/layout-mode-shell.tsx", "src/lib/app-layer-menu.ts", "src/config/appLayerCapabilities.ts"];
  }
  if (area === "commit-revert") {
    return ["components/browse-mode.tsx", "src/lib/edit-session/index.ts", "src/lib/runtime-kernel/kernel.ts"];
  }
  if (area === "keyboard-focus") {
    return ["components/browse-mode.tsx", "src/lib/tab-order.ts", "src/lib/ui-native-test-hook.ts"];
  }
  return ["components/browse-mode.tsx", "components/layout-mode.tsx"];
}

function classifyNextAction(failure: FailureRecord): "bugfix" | "missing-feature" | "flaky-test" {
  if (failure.errorClass === "selector-not-found") {
    return "missing-feature";
  }
  if (failure.errorClass === "timeout" || failure.errorClass === "target-detached") {
    return "flaky-test";
  }
  return "bugfix";
}

function buildFailureTriageMarkdown(
  failures: FailureRecord[],
  topFailingAreas: Array<{ area: string; count: number }>
): string {
  const lines: string[] = [
    "# Parity UI Failure Triage",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Total failures: ${failures.length}`,
    ""
  ];

  if (failures.length === 0) {
    lines.push("No failures were observed in this run.");
    return lines.join("\n");
  }

  lines.push("## Top failing areas");
  lines.push("");
  for (const entry of topFailingAreas) {
    lines.push(`- ${entry.area}: ${entry.count}`);
  }
  lines.push("");

  const grouped = new Map<string, FailureRecord[]>();
  for (const failure of failures) {
    const list = grouped.get(failure.area) ?? [];
    list.push(failure);
    grouped.set(failure.area, list);
  }

  for (const [area, areaFailures] of [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`## Area: ${area}`);
    lines.push("");
    for (const failure of areaFailures) {
      lines.push(`- Signature: \`${failure.signature}\``);
      lines.push(`- Test: \`${failure.title}\``);
      lines.push(`- File: \`${failure.file}\``);
      lines.push(`- Project: \`${failure.project}\``);
      lines.push(`- Error class: \`${failure.errorClass}\``);
      lines.push(`- Likely root cause: ${classifyNextAction(failure)}`);
      lines.push(`- Recommended next action: ${classifyNextAction(failure) === "bugfix" ? "Bugfix in runtime/layout modules." : classifyingText(classifyNextAction(failure))}`);
      if (failure.attachments.length > 0) {
        lines.push("- Artifacts:");
        for (const attachment of failure.attachments) {
          lines.push(`  - \`${attachment}\``);
        }
      } else {
        lines.push("- Artifacts: none recorded");
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

function classifyingText(action: "bugfix" | "missing-feature" | "flaky-test"): string {
  if (action === "missing-feature") {
    return "Missing feature/selector parity; wire command or add capability.";
  }
  if (action === "flaky-test") {
    return "Stabilize wait conditions/selectors; investigate race condition.";
  }
  return "Bugfix in runtime/layout modules.";
}

function buildAutoBacklogMarkdown(
  failures: FailureRecord[],
  scenarioCatalog: Array<{ id: string; title: string; group: string; smoke: boolean; expectedInvariants: string[] }>
): string {
  const bySignature = new Map<string, FailureRecord[]>();
  for (const failure of failures) {
    const list = bySignature.get(failure.signature) ?? [];
    list.push(failure);
    bySignature.set(failure.signature, list);
  }

  const lines: string[] = [
    "# Parity UI Backlog (Auto)",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Unique failure signatures: ${bySignature.size}`,
    ""
  ];

  if (bySignature.size === 0) {
    lines.push("No parity backlog items were generated in this run.");
    return lines.join("\n");
  }

  const sortedSignatures = [...bySignature.keys()].sort((a, b) => a.localeCompare(b));
  let rank = 1;
  for (const signature of sortedSignatures) {
    const grouped = bySignature.get(signature) ?? [];
    const sample = grouped[0];
    const scenario = sample.scenarioId ? scenarioCatalog.find((entry) => entry.id === sample.scenarioId) : null;
    const actionClass = classifyNextAction(sample);
    const modules = suspectedModulesForArea(sample.area);
    const title = `[UI Parity] ${sample.area}: ${sample.errorClass}`;
    const reproSteps = scenario
      ? scenario.expectedInvariants.length > 0
        ? `Run scenario ${scenario.id} (${scenario.title}) and observe invariant failures: ${scenario.expectedInvariants.join(", ")}.`
        : `Run scenario ${scenario.id} (${scenario.title}) and reproduce failure.`
      : `Run failing test "${sample.title}" and reproduce error.`;

    lines.push(`## ${rank}. ${title}`);
    lines.push("");
    lines.push(`- Labels: parity, ui-tests, ${sample.area}`);
    lines.push(`- Failure signature: \`${signature}\``);
    lines.push(`- Repro steps: ${reproSteps}`);
    lines.push(
      `- Expected FileMaker-like behavior: ${sample.area === "portals" ? "Portal interactions commit reliably with preserved row context." : "UI command and mode behavior remains deterministic and native-like."}`
    );
    lines.push(`- Current behavior: ${sample.errorClass} — ${sample.errorMessage || "No detailed error available."}`);
    lines.push(`- Suspected modules: ${modules.map((modulePath) => `\`${modulePath}\``).join(", ")}`);
    lines.push(
      `- Acceptance criteria: Fix removes signature \`${signature}\` and all linked tests pass without retries in Chromium smoke run.`
    );
    lines.push(
      `- Suggested fix approach: ${
        actionClass === "bugfix"
          ? "Patch runtime behavior and selectors, then add deterministic waits/assertions."
          : actionClass === "missing-feature"
            ? "Implement missing command/menu wiring or capability gating, then update tests."
            : "Reduce flakiness through stable selectors and explicit readiness checks."
      }`
    );
    lines.push(`- Verifying tests: ${[...new Set(grouped.map((entry) => `\`${entry.title}\``))].join(", ")}`);
    if (grouped.some((entry) => entry.attachments.length > 0)) {
      lines.push("- Artifacts:");
      for (const attachment of [...new Set(grouped.flatMap((entry) => entry.attachments))]) {
        lines.push(`  - \`${attachment}\``);
      }
    }
    lines.push("");
    rank += 1;
  }

  return lines.join("\n");
}

async function writeLocalUiIssues(failures: FailureRecord[]): Promise<void> {
  const bySignature = new Map<string, FailureRecord[]>();
  for (const failure of failures) {
    const list = bySignature.get(failure.signature) ?? [];
    list.push(failure);
    bySignature.set(failure.signature, list);
  }

  const issuesDir = path.join(AUDIT_DIR, "issues-ui");
  await ensureDir(issuesDir);

  let index = 1;
  for (const signature of [...bySignature.keys()].sort((a, b) => a.localeCompare(b))) {
    const grouped = bySignature.get(signature) ?? [];
    const sample = grouped[0];
    const slug = `${String(index).padStart(4, "0")}-${sample.area}-${sample.errorClass}`.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    const issuePath = path.join(issuesDir, `${slug}.md`);
    const lines = [
      "---",
      "labels:",
      "  - parity",
      "  - ui-tests",
      `  - ${sample.area}`,
      "---",
      "",
      `# [UI Parity] ${sample.area}: ${sample.errorClass}`,
      "",
      `Failure signature: \`${signature}\``,
      "",
      "## Failing tests",
      "",
      ...[...new Set(grouped.map((entry) => `- ${entry.title}`))],
      "",
      "## Error",
      "",
      "```text",
      sample.errorMessage || "No error message recorded.",
      "```",
      ""
    ];
    await writeText(issuePath, lines.join("\n"));
    index += 1;
  }
}

function computeCoverageMapReport(
  taxonomyItems: Array<{ id: string; category: string; capability_name: string }>,
  mapping: Array<{ parityTaxonomyId: string; testTitlePatterns: string[]; scenarioIds: string[]; invariants: string[] }>,
  flatResults: FlatUiTestResult[],
  scenarioResults: ScenarioResult[],
  invariantResults: InvariantResult[]
): string {
  const mapById = new Map(mapping.map((entry) => [entry.parityTaxonomyId, entry]));
  const scenarioStatusById = new Map(scenarioResults.map((scenario) => [scenario.id, scenario.status]));
  const invariantStatusById = new Map(invariantResults.map((invariant) => [invariant.id, invariant.status]));

  const rows: Array<{
    id: string;
    category: string;
    capability: string;
    status: "Covered" | "Partial" | "Uncovered";
    tests: number;
    scenarios: number;
    invariants: number;
  }> = [];

  for (const taxonomy of taxonomyItems) {
    const entry = mapById.get(taxonomy.id);
    if (!entry) {
      rows.push({
        id: taxonomy.id,
        category: taxonomy.category,
        capability: taxonomy.capability_name,
        status: "Uncovered",
        tests: 0,
        scenarios: 0,
        invariants: 0
      });
      continue;
    }

    const matchedTests = flatResults.filter((result) =>
      entry.testTitlePatterns.some((pattern) => matchesPattern(result.title, pattern))
    );
    const hasPassedTests = matchedTests.some((result) => result.status === "passed");
    const hasFailedTests = matchedTests.some((result) => ["failed", "timedOut", "interrupted"].includes(result.status));

    const scenarioStatuses = entry.scenarioIds.map((scenarioId) => scenarioStatusById.get(scenarioId) ?? "not-run");
    const hasPassedScenario = scenarioStatuses.some((status) => status === "passed");
    const hasFailedScenario = scenarioStatuses.some((status) => status === "failed");

    const invariantStatuses = entry.invariants.map((invariantId) => invariantStatusById.get(invariantId) ?? "skipped");
    const allInvariantsPassed = invariantStatuses.length > 0 ? invariantStatuses.every((status) => status === "passed") : true;

    let coverageStatus: "Covered" | "Partial" | "Uncovered" = "Partial";
    if ((hasPassedTests || hasPassedScenario) && !hasFailedTests && !hasFailedScenario && allInvariantsPassed) {
      coverageStatus = "Covered";
    } else if (matchedTests.length === 0 && entry.scenarioIds.length === 0 && entry.invariants.length === 0) {
      coverageStatus = "Uncovered";
    }

    rows.push({
      id: taxonomy.id,
      category: taxonomy.category,
      capability: taxonomy.capability_name,
      status: coverageStatus,
      tests: matchedTests.length,
      scenarios: entry.scenarioIds.length,
      invariants: entry.invariants.length
    });
  }

  const counts = rows.reduce(
    (acc, row) => {
      acc[row.status] += 1;
      return acc;
    },
    { Covered: 0, Partial: 0, Uncovered: 0 }
  );

  const uncoveredTop20 = rows.filter((row) => row.status === "Uncovered").slice(0, 20);

  const lines: string[] = [
    "# Parity UI Coverage Map",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `- Covered: ${counts.Covered}`,
    `- Partial: ${counts.Partial}`,
    `- Uncovered: ${counts.Uncovered}`,
    "",
    "| Taxonomy ID | Category | Coverage | Tests | Scenarios | Invariants | Capability |",
    "| --- | --- | --- | ---: | ---: | ---: | --- |"
  ];

  for (const row of rows) {
    lines.push(
      `| ${row.id} | ${row.category} | ${row.status} | ${row.tests} | ${row.scenarios} | ${row.invariants} | ${row.capability} |`
    );
  }

  lines.push("");
  lines.push("## Top 20 uncovered parity items");
  lines.push("");
  if (uncoveredTop20.length === 0) {
    lines.push("No uncovered taxonomy items in current mapping.");
  } else {
    for (const item of uncoveredTop20) {
      lines.push(`- ${item.id} (${item.category}): ${item.capability}`);
    }
  }

  return lines.join("\n");
}

function buildFlakeRecords(
  flatResults: FlatUiTestResult[],
  failures: FailureRecord[],
  baseline: BaselinePayload | null,
  allowlist: Set<string>
): { flakes: FlakeRecord[]; newFlakes: FlakeRecord[] } {
  const baselineErrorByTest = new Map((baseline?.failures ?? []).map((entry) => [entry.testKey, entry.errorClass]));
  const baselineFlakeSignatures = new Set((baseline?.flakes ?? []).map((entry) => entry.signature));
  const flakesBySignature = new Map<string, FlakeRecord>();

  for (const testResult of flatResults) {
    if (testResult.flaky) {
      const signature = hashSignature(`${testResult.testKey}|retry-pass`);
      flakesBySignature.set(signature, {
        signature,
        testKey: testResult.testKey,
        title: testResult.title,
        reason: "test passed on retry after initial failure",
        allowlisted: allowlist.has(signature),
        isNew: !baselineFlakeSignatures.has(signature)
      });
    }
  }

  for (const failure of failures) {
    const previousErrorClass = baselineErrorByTest.get(failure.testKey);
    if (previousErrorClass && previousErrorClass !== failure.errorClass) {
      const signature = hashSignature(`${failure.testKey}|error-class-changed|${previousErrorClass}|${failure.errorClass}`);
      flakesBySignature.set(signature, {
        signature,
        testKey: failure.testKey,
        title: failure.title,
        reason: `failure class changed (${previousErrorClass} -> ${failure.errorClass})`,
        allowlisted: allowlist.has(signature),
        isNew: !baselineFlakeSignatures.has(signature)
      });
    }
  }

  const flakes = [...flakesBySignature.values()].sort((a, b) => a.signature.localeCompare(b.signature));
  const newFlakes = flakes.filter((flake) => flake.isNew && !flake.allowlisted);
  return { flakes, newFlakes };
}

function buildFlakeReport(flakes: FlakeRecord[]): string {
  const lines: string[] = [
    "# Parity UI Flakes",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `- Flake budget: ${MAX_FLAKES}`,
    `- Observed flaky tests: ${flakes.length}`,
    ""
  ];

  if (flakes.length === 0) {
    lines.push("No flakes detected.");
    return lines.join("\n");
  }

  lines.push("| Signature | Test | Reason | Allowlisted | New |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const flake of flakes) {
    lines.push(`| ${flake.signature} | ${flake.title} | ${flake.reason} | ${flake.allowlisted ? "yes" : "no"} | ${flake.isNew ? "yes" : "no"} |`);
  }
  return lines.join("\n");
}

function buildScorecardMarkdown(input: {
  commandPayload: CommandResultsPayload;
  invariants: InvariantResult[];
  invariantPassRate: number;
  invariantCounts: { passed: number; failed: number; skipped: number };
  scenarios: ScenarioResult[];
  scenarioPassRate: number;
  scenarioCounts: { passed: number; failed: number; skipped: number; notRun: number };
  crossBrowserPassRate: number;
  projectRates: Array<{ project: string; passRate: number; passed: number; total: number }>;
  crossBrowserEnabled: boolean;
  parityScore: number;
  scoreWeights: { commandWeight: number; invariantWeight: number; scenarioWeight: number; crossBrowserWeight: number };
  topFailingAreas: Array<{ area: string; count: number }>;
  trend: {
    baselineFound: boolean;
    scoreDelta: number;
    commandDelta: number;
    invariantDelta: number;
    scenarioDelta: number;
  };
}): string {
  const commandCoveragePct = (input.commandPayload.summary.coverage * 100).toFixed(2);
  const invariantPassPct = (input.invariantPassRate * 100).toFixed(2);
  const scenarioPassPct = (input.scenarioPassRate * 100).toFixed(2);
  const crossPassPct = (input.crossBrowserPassRate * 100).toFixed(2);

  const lines: string[] = [
    "# Parity UI Scorecard",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Overall",
    "",
    `- Parity score: **${input.parityScore.toFixed(2)} / 100**`,
    `- Command coverage: **${commandCoveragePct}%**`,
    `- Invariant pass rate: **${invariantPassPct}%**`,
    `- Scenario pass rate: **${scenarioPassPct}%**`,
    `- Cross-browser pass rate: **${crossPassPct}%** (${input.crossBrowserEnabled ? "enabled" : "single-browser mode"})`,
    "",
    "### Score formula",
    "",
    `- command coverage weight: ${(input.scoreWeights.commandWeight * 100).toFixed(2)}%`,
    `- invariant pass rate weight: ${(input.scoreWeights.invariantWeight * 100).toFixed(2)}%`,
    `- scenario pass rate weight: ${(input.scoreWeights.scenarioWeight * 100).toFixed(2)}%`,
    `- cross-browser weight: ${(input.scoreWeights.crossBrowserWeight * 100).toFixed(2)}%`,
    "",
    "## Coverage breakdown",
    "",
    `- Commands tested/skipped/not-found/error: ${input.commandPayload.summary.tested}/${input.commandPayload.summary.skipped}/${input.commandPayload.summary.notFound}/${input.commandPayload.summary.error}`,
    `- Invariants passed/failed/skipped: ${input.invariantCounts.passed}/${input.invariantCounts.failed}/${input.invariantCounts.skipped}`,
    `- Scenarios passed/failed/skipped/not-run: ${input.scenarioCounts.passed}/${input.scenarioCounts.failed}/${input.scenarioCounts.skipped}/${input.scenarioCounts.notRun}`,
    ""
  ];

  lines.push("## Cross-browser breakdown");
  lines.push("");
  if (input.projectRates.length === 0) {
    lines.push("No project-level UI results were available.");
  } else {
    for (const project of input.projectRates) {
      lines.push(`- ${project.project}: ${(project.passRate * 100).toFixed(2)}% (${project.passed}/${project.total})`);
    }
  }
  lines.push("");

  lines.push("## Top failing areas");
  lines.push("");
  if (input.topFailingAreas.length === 0) {
    lines.push("No failing areas for this run.");
  } else {
    for (const area of input.topFailingAreas) {
      lines.push(`- ${area.area}: ${area.count}`);
    }
  }
  lines.push("");

  lines.push("## Trend vs baseline");
  lines.push("");
  if (!input.trend.baselineFound) {
    lines.push("Baseline not found; current run established baseline candidate.");
  } else {
    lines.push(`- Parity score delta: ${input.trend.scoreDelta >= 0 ? "+" : ""}${input.trend.scoreDelta.toFixed(2)}`);
    lines.push(`- Command coverage delta: ${input.trend.commandDelta >= 0 ? "+" : ""}${(input.trend.commandDelta * 100).toFixed(2)}%`);
    lines.push(`- Invariant pass delta: ${input.trend.invariantDelta >= 0 ? "+" : ""}${(input.trend.invariantDelta * 100).toFixed(2)}%`);
    lines.push(`- Scenario pass delta: ${input.trend.scenarioDelta >= 0 ? "+" : ""}${(input.trend.scenarioDelta * 100).toFixed(2)}%`);
  }
  lines.push("");

  return lines.join("\n");
}

function toBaselinePayload(input: {
  projects: string[];
  parityScore: number;
  commandSummary: CommandSummary;
  commandCoverage: number;
  invariantPassRate: number;
  scenarioPassRate: number;
  crossBrowserPassRate: number;
  invariants: InvariantResult[];
  scenarios: ScenarioResult[];
  suites: Array<{ name: string; passed: number; failed: number; skipped: number }>;
  failures: FailureRecord[];
  flakes: FlakeRecord[];
}): BaselinePayload {
  return {
    generatedAt: new Date().toISOString(),
    environment: {
      node: process.version,
      ci: process.env.CI === "true",
      projects: input.projects
    },
    metrics: {
      parityScore: input.parityScore,
      commandCoverage: input.commandCoverage,
      invariantPassRate: input.invariantPassRate,
      scenarioPassRate: input.scenarioPassRate,
      crossBrowserPassRate: input.crossBrowserPassRate
    },
    commandSummary: input.commandSummary,
    invariants: input.invariants.map((entry) => ({ id: entry.id, status: entry.status })),
    scenarios: input.scenarios.map((entry) => ({ id: entry.id, status: entry.status, smoke: entry.smoke })),
    suites: input.suites,
    failures: input.failures.map((entry) => ({ signature: entry.signature, testKey: entry.testKey, errorClass: entry.errorClass })),
    flakes: input.flakes.map((entry) => ({ signature: entry.signature, testKey: entry.testKey, reason: entry.reason }))
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  await ensureDir(AUDIT_DIR);
  await ensureDir(AUDIT_CACHE_DIR);
  await ensureDir(TEST_RESULTS_DIR);

  if (!args.skipTests) {
    const uiExitCode = await runUiTests();
    if (uiExitCode !== 0) {
      console.warn(`UI test process exited with code ${uiExitCode}; continuing to generate parity artifacts.`);
    }
  }

  const [commandPayload, flatResults, scenarioCatalog, invariantMappings, parityMapEntries] = await Promise.all([
    loadCommandResults(),
    loadFlatUiResults(),
    loadScenarioCatalog(),
    loadInvariantMappings(),
    loadParityCoverageMap()
  ]);

  const scenarioGroupById = new Map(scenarioCatalog.map((entry) => [entry.id, entry.group]));
  const { scenarios, scenarioPassRate, scenarioCounts } = buildScenarioResults(scenarioCatalog, flatResults);
  const { invariants, invariantPassRate, invariantCounts } = buildInvariantResults(invariantMappings, flatResults, scenarios);
  const { projects, projectRates, crossBrowserPassRate, crossBrowserEnabled } = computeCrossBrowserPassRate(flatResults);
  const { failures, topFailingAreas } = buildFailures(flatResults, scenarioGroupById);
  const suites = summarizeSuites(flatResults);

  const score = computeParityScore({
    commandCoverage: commandPayload.summary.coverage,
    invariantPassRate,
    scenarioPassRate,
    crossBrowserPassRate,
    crossBrowserEnabled
  });

  const baselinePath = path.join(AUDIT_DIR, "Parity_UI_Baseline.json");
  const baseline = await readJsonSafe<BaselinePayload>(baselinePath);

  const allowlistPath = path.join(process.cwd(), "tests", "ui", "native-parity", "flakeAllowlist.json");
  const allowlistData = (await readJsonSafe<{ allowedFlakeSignatures?: string[] }>(allowlistPath)) ?? {};
  const allowlist = new Set((allowlistData.allowedFlakeSignatures ?? []).map((item) => String(item)));
  const { flakes, newFlakes } = buildFlakeRecords(flatResults, failures, baseline, allowlist);
  const uiExecutionDetected = flatResults.length > 0;
  const commandExecutionDetected =
    commandPayload.summary.tested + commandPayload.summary.error + commandPayload.summary.notFound > 0;
  const gatesEnabled = !args.reportOnly && (uiExecutionDetected || commandExecutionDetected);

  const trend = {
    baselineFound: Boolean(baseline),
    scoreDelta: baseline ? score.parityScore - baseline.metrics.parityScore : 0,
    commandDelta: baseline ? commandPayload.summary.coverage - baseline.metrics.commandCoverage : 0,
    invariantDelta: baseline ? invariantPassRate - baseline.metrics.invariantPassRate : 0,
    scenarioDelta: baseline ? scenarioPassRate - baseline.metrics.scenarioPassRate : 0
  };

  const scorecard = buildScorecardMarkdown({
    commandPayload,
    invariants,
    invariantPassRate,
    invariantCounts,
    scenarios,
    scenarioPassRate,
    scenarioCounts,
    crossBrowserPassRate,
    projectRates,
    crossBrowserEnabled,
    parityScore: score.parityScore,
    scoreWeights: score.components,
    topFailingAreas,
    trend
  });

  const triage = buildFailureTriageMarkdown(failures, topFailingAreas);
  const autoBacklog = buildAutoBacklogMarkdown(failures, scenarioCatalog);
  const flakeReport = buildFlakeReport(flakes);

  const parityStatusPath = path.join(AUDIT_CACHE_DIR, "parity-status.json");
  const taxonomyItems =
    ((await readJsonSafe<Array<{ id: string; category: string; capability_name: string }>>(parityStatusPath)) ?? []).map((entry) => ({
      id: String(entry.id),
      category: String(entry.category),
      capability_name: String(entry.capability_name)
    }));

  const coverageMapMarkdown = computeCoverageMapReport(taxonomyItems, parityMapEntries, flatResults, scenarios, invariants);

  await writeText(path.join(AUDIT_DIR, "Parity_UI_Scorecard.md"), scorecard);
  await writeText(path.join(AUDIT_DIR, "Parity_UI_Failure_Triage.md"), triage);
  await writeText(path.join(AUDIT_DIR, "Parity_UI_Backlog_Auto.md"), autoBacklog);
  await writeText(path.join(AUDIT_DIR, "Parity_UI_Coverage_Map.md"), coverageMapMarkdown);
  await writeText(path.join(AUDIT_DIR, "Parity_UI_Flakes.md"), flakeReport);
  await writeLocalUiIssues(failures);

  const baselinePayload = toBaselinePayload({
    projects,
    parityScore: score.parityScore,
    commandSummary: commandPayload.summary,
    commandCoverage: commandPayload.summary.coverage,
    invariantPassRate,
    scenarioPassRate,
    crossBrowserPassRate,
    invariants,
    scenarios,
    suites,
    failures,
    flakes
  });

  await writeJson(path.join(AUDIT_CACHE_DIR, "Parity_UI_Latest.json"), baselinePayload);

  if (args.updateBaseline) {
    if (process.env.ALLOW_PARITY_BASELINE_UPDATE !== "true") {
      throw new Error("Baseline update blocked. Set ALLOW_PARITY_BASELINE_UPDATE=true to update Parity_UI_Baseline.json.");
    }
    await writeJson(baselinePath, baselinePayload);
  } else if (!baseline) {
    await writeJson(baselinePath, baselinePayload);
  }

  const regressionErrors: string[] = [];
  if (gatesEnabled && baseline) {
    if (score.parityScore < baseline.metrics.parityScore) {
      regressionErrors.push(
        `Parity score regressed: ${score.parityScore.toFixed(2)} < baseline ${baseline.metrics.parityScore.toFixed(2)}`
      );
    }
    if (commandPayload.summary.coverage < baseline.metrics.commandCoverage) {
      regressionErrors.push(
        `Command coverage regressed: ${(commandPayload.summary.coverage * 100).toFixed(2)}% < baseline ${(
          baseline.metrics.commandCoverage * 100
        ).toFixed(2)}%`
      );
    }
    if (invariantPassRate < baseline.metrics.invariantPassRate) {
      regressionErrors.push(
        `Invariant pass rate regressed: ${(invariantPassRate * 100).toFixed(2)}% < baseline ${(
          baseline.metrics.invariantPassRate * 100
        ).toFixed(2)}%`
      );
    }
    if (scenarioPassRate < baseline.metrics.scenarioPassRate) {
      regressionErrors.push(
        `Scenario pass rate regressed: ${(scenarioPassRate * 100).toFixed(2)}% < baseline ${(
          baseline.metrics.scenarioPassRate * 100
        ).toFixed(2)}%`
      );
    }
  }

  if (gatesEnabled && commandPayload.summary.coverage < REQUIRED_COMMAND_COVERAGE) {
    regressionErrors.push(
      `Command coverage below threshold: ${(commandPayload.summary.coverage * 100).toFixed(2)}% < ${(
        REQUIRED_COMMAND_COVERAGE * 100
      ).toFixed(2)}%`
    );
  }

  if (gatesEnabled && flakes.length > MAX_FLAKES) {
    regressionErrors.push(`Flake budget exceeded: ${flakes.length} > ${MAX_FLAKES}`);
  }
  if (gatesEnabled && newFlakes.length > 0) {
    regressionErrors.push(`New flaky tests detected (${newFlakes.length}) not in allowlist.`);
  }

  console.log(
    `UI parity score ${score.parityScore.toFixed(2)} | command ${(commandPayload.summary.coverage * 100).toFixed(2)}% | invariant ${(
      invariantPassRate * 100
    ).toFixed(2)}% | scenario ${(scenarioPassRate * 100).toFixed(2)}% | flakes ${flakes.length}`
  );

  if (!gatesEnabled && !args.reportOnly) {
    console.warn("Parity gates were skipped because UI execution data was not available in this run.");
  }

  if (regressionErrors.length > 0) {
    for (const message of regressionErrors) {
      console.error(`Gate: ${message}`);
    }
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

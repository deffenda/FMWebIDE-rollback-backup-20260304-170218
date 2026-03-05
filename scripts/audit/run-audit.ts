import path from "node:path";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { discoverRepoBaseline } from "./extractors/repo-discovery.ts";
import { buildRepoIndex } from "./extractors/repo-index.ts";
import { getParityTaxonomy } from "./models/parity-taxonomy.ts";
import { writeJson, writeText, ensureDir } from "./utils/fs-utils.ts";
import { generateArchitectureMermaid } from "./generators/architecture-mermaid.ts";
import { generateBaselineReport } from "./generators/baseline-report.ts";
import { generateParityStatuses } from "./generators/parity-status.ts";
import { generateParityMatrixRows, renderParityMatrixCsv } from "./generators/parity-matrix.ts";
import { generateBacklog, renderBacklogMarkdown } from "./generators/backlog.ts";
import { generateTopWins, renderTopWinsMarkdown } from "./generators/top-wins.ts";
import { renderTestPlanMarkdown } from "./generators/test-plan.ts";
import { generateIssues } from "./generators/issues.ts";
import {
  createParityMatrixReport,
  PARITY_MATRIX_REPORT_SCHEMA
} from "../../src/lib/parity-matrix-report.ts";

const REQUIRED_FILES = [
  "docs/audit/FMWebIDE_Baseline_Report.md",
  "docs/audit/Parity_Matrix_FileMaker_vs_FMWebIDE.csv",
  "docs/audit/Parity_Matrix_FileMaker_vs_FMWebIDE.json",
  "docs/audit/Parity_Matrix_FileMaker_vs_FMWebIDE.schema.json",
  "docs/audit/Backlog_Parity_Improvements.md",
  "docs/audit/Top_20_Parity_Wins_This_Week.md",
  "docs/audit/Test_Plan_Parity.md",
  "docs/audit/mermaid/Architecture.mmd",
  "docs/audit/.cache/baseline.json",
  "docs/audit/.cache/parity-status.json"
] as const;

const SYNTHETIC_DDR_FIXTURE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<FMPReport>
  <Layout id="synthetic-layout-1" name="Synthetic Layout">
    <Object type="Field" id="field-1">
      <Bounds top="20" left="20" bottom="44" right="220" />
      <FieldReference name="Synthetic::Name" />
    </Object>
    <Object type="Text" id="text-1">
      <Bounds top="52" left="20" bottom="74" right="220" />
      <TextObj><Data>Synthetic Fixture</Data></TextObj>
    </Object>
  </Layout>
</FMPReport>
`;

function parseArgs(argv: string[]): { ci: boolean } {
  return {
    ci: argv.includes("--ci")
  };
}

function computeRunFingerprint(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

function isLikelyDdrXml(fileName: string, contentSample: string): boolean {
  const name = fileName.toLowerCase();
  if (name.includes("_fmp12.xml") || name.includes("fmpreport") || name === "summary.xml") {
    return true;
  }
  const xml = contentSample.toLowerCase();
  if (xml.includes("<fmpreport")) {
    return true;
  }
  if (xml.includes("<database_design_report")) {
    return true;
  }
  return false;
}

async function readFileSample(filePath: string, maxBytes = 8192): Promise<string> {
  const handle = await fs.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(maxBytes);
    const { bytesRead } = await handle.read(buffer, 0, maxBytes, 0);
    return buffer.toString("utf8", 0, bytesRead);
  } finally {
    await handle.close();
  }
}

async function findDdrFixtures(repoRoot: string): Promise<string[]> {
  const candidates: string[] = [];
  const roots = [
    path.join(repoRoot, "tests", "fixtures", "ddr"),
    path.join(repoRoot, "data"),
    path.join(repoRoot, "docs")
  ];

  for (const root of roots) {
    try {
      const stat = await fs.stat(root);
      if (!stat.isDirectory()) {
        continue;
      }
    } catch {
      continue;
    }

    async function visit(current: string): Promise<void> {
      const entries = await fs.readdir(current, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === "node_modules" || entry.name === ".next") {
          continue;
        }
        const fullPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          await visit(fullPath);
          continue;
        }
        if (!entry.isFile()) {
          continue;
        }
        if (!entry.name.toLowerCase().endsWith(".xml")) {
          continue;
        }
        if (fullPath.includes(`${path.sep}data${path.sep}filemaker-themes${path.sep}`)) {
          continue;
        }

        let contentSample = "";
        try {
          contentSample = await readFileSample(fullPath, 8192);
        } catch {
          continue;
        }
        if (!isLikelyDdrXml(entry.name, contentSample)) {
          continue;
        }
        const rel = path.relative(repoRoot, fullPath).replace(/\\/g, "/");
        if (!candidates.includes(rel)) {
          candidates.push(rel);
        }
      }
    }

    await visit(root);
  }

  candidates.sort((a, b) => a.localeCompare(b));
  return candidates;
}

async function ensureSyntheticFixture(repoRoot: string): Promise<string> {
  const fixturePath = path.join(repoRoot, "tests", "fixtures", "ddr", "synthetic-minimal-ddr.xml");
  await ensureDir(path.dirname(fixturePath));
  await fs.writeFile(fixturePath, SYNTHETIC_DDR_FIXTURE_XML, "utf8");

  const readmePath = path.join(repoRoot, "tests", "fixtures", "ddr", "README.md");
  const readme = [
    "# DDR Fixtures",
    "",
    "This folder contains audit/parity fixtures.",
    "",
    "- `synthetic-minimal-ddr.xml` is a **synthetic** fixture generated by the audit pipeline when no real DDR fixtures are available in-repo.",
    "- Replace/add real DDR fixtures for stronger parity validation as needed."
  ].join("\n");
  await fs.writeFile(readmePath, `${readme}\n`, "utf8");

  return path.relative(repoRoot, fixturePath).replace(/\\/g, "/");
}

async function validateOutputs(repoRoot: string, backlogCount: number): Promise<void> {
  for (const relPath of REQUIRED_FILES) {
    const absPath = path.join(repoRoot, relPath);
    try {
      const stat = await fs.stat(absPath);
      if (!stat.isFile()) {
        throw new Error(`Missing required artifact: ${relPath}`);
      }
      if (stat.size <= 0) {
        throw new Error(`Artifact is empty: ${relPath}`);
      }
    } catch (error) {
      throw new Error(`Missing required artifact: ${relPath}. ${(error as Error).message}`);
    }
  }

  if (backlogCount < 75) {
    throw new Error(`Backlog must include at least 75 improvements; found ${backlogCount}`);
  }
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = process.cwd();

  const auditRoot = path.join(repoRoot, "docs", "audit");
  const auditCache = path.join(auditRoot, ".cache");
  const mermaidDir = path.join(auditRoot, "mermaid");

  await ensureDir(auditRoot);
  await ensureDir(auditCache);
  await ensureDir(mermaidDir);

  const repoIndex = await buildRepoIndex(repoRoot);
  const fingerprintInput = repoIndex.files.map((file) => `${file.relPath}\n${file.content}`).join("\n---\n");
  const runFingerprint = computeRunFingerprint(fingerprintInput);

  const baseline = await discoverRepoBaseline(repoRoot, repoIndex, runFingerprint);
  await writeJson(path.join(auditCache, "baseline.json"), baseline);

  const architectureMermaid = generateArchitectureMermaid(baseline);
  await writeText(path.join(mermaidDir, "Architecture.mmd"), architectureMermaid);

  const baselineReport = generateBaselineReport(baseline, architectureMermaid);
  await writeText(path.join(auditRoot, "FMWebIDE_Baseline_Report.md"), baselineReport);

  const taxonomy = getParityTaxonomy();
  const parityStatuses = generateParityStatuses(repoIndex, taxonomy);
  await writeJson(path.join(auditCache, "parity-status.json"), parityStatuses);

  const matrixRows = generateParityMatrixRows(parityStatuses);
  const parityCsv = renderParityMatrixCsv(matrixRows);
  await writeText(path.join(auditRoot, "Parity_Matrix_FileMaker_vs_FMWebIDE.csv"), parityCsv);
  const parityJsonReport = createParityMatrixReport(parityStatuses, {
    generatedAt: `fingerprint:${runFingerprint}`,
    sourceFingerprint: runFingerprint
  });
  await writeJson(path.join(auditRoot, "Parity_Matrix_FileMaker_vs_FMWebIDE.json"), parityJsonReport);
  await writeJson(
    path.join(auditRoot, "Parity_Matrix_FileMaker_vs_FMWebIDE.schema.json"),
    PARITY_MATRIX_REPORT_SCHEMA
  );

  const backlog = generateBacklog(parityStatuses);
  const backlogMarkdown = renderBacklogMarkdown(backlog);
  await writeText(path.join(auditRoot, "Backlog_Parity_Improvements.md"), backlogMarkdown);

  const topWins = generateTopWins(backlog, 20);
  const topWinsMarkdown = renderTopWinsMarkdown(topWins);
  await writeText(path.join(auditRoot, "Top_20_Parity_Wins_This_Week.md"), topWinsMarkdown);

  let fixtures = await findDdrFixtures(repoRoot);
  let hasSyntheticFixture = false;
  if (fixtures.length === 0) {
    const synthetic = await ensureSyntheticFixture(repoRoot);
    fixtures = [synthetic];
    hasSyntheticFixture = true;
  } else if (!fixtures.some((entry) => entry.includes("synthetic-minimal-ddr.xml"))) {
    const synthetic = await ensureSyntheticFixture(repoRoot);
    fixtures.push(synthetic);
    fixtures.sort((a, b) => a.localeCompare(b));
    hasSyntheticFixture = true;
  }

  const testPlanMarkdown = renderTestPlanMarkdown({
    ddrFixtures: fixtures,
    hasSyntheticFixture
  });
  await writeText(path.join(auditRoot, "Test_Plan_Parity.md"), testPlanMarkdown);

  const issueResult = await generateIssues(backlog.slice(0, 50), {
    repoRoot,
    forceLocal: false
  });

  const summary = {
    generatedAt: `fingerprint:${runFingerprint}`,
    runFingerprint,
    taxonomyCount: taxonomy.length,
    parityStatusCounts: parityStatuses.reduce(
      (acc, item) => {
        acc[item.status] = (acc[item.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
    backlogCount: backlog.length,
    topWinsCount: topWins.length,
    issueMode: issueResult.mode,
    issueCount: issueResult.created.length,
    requiredLabels: issueResult.labels,
    fixtureCount: fixtures.length
  };

  await writeJson(path.join(auditRoot, "audit-manifest.json"), summary);

  if (args.ci) {
    await validateOutputs(repoRoot, backlog.length);
  }

  const headline = `Audit generated: ${backlog.length} backlog items, ${topWins.length} top wins, ${issueResult.created.length} issues (${issueResult.mode}).`;
  console.log(headline);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

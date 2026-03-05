import path from "node:path";
import { promises as fs } from "node:fs";
import type { BacklogItem } from "../models/types";
import { ensureDir, writeText } from "../utils/fs-utils.ts";

const REQUIRED_LABELS = [
  "parity",
  "layout-engine",
  "design-mode",
  "runtime",
  "scripting",
  "portals",
  "security",
  "performance",
  "dx"
] as const;

function labelsForTheme(theme: string): string[] {
  const labels = new Set<string>(["parity"]);
  switch (theme) {
    case "Layout Rendering Fidelity":
      labels.add("layout-engine");
      labels.add("runtime");
      break;
    case "Design Mode UX":
      labels.add("design-mode");
      labels.add("dx");
      break;
    case "Portals":
      labels.add("portals");
      labels.add("runtime");
      break;
    case "Scripting & Events":
      labels.add("scripting");
      labels.add("runtime");
      break;
    case "Schema/DDR tooling":
      labels.add("dx");
      break;
    case "Developer Experience":
      labels.add("dx");
      break;
    case "Performance":
      labels.add("performance");
      labels.add("runtime");
      break;
    case "Security/Compliance":
      labels.add("security");
      break;
    default:
      labels.add("runtime");
      break;
  }
  return [...labels];
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function issueBody(item: BacklogItem): string {
  return [
    `## FileMaker Behavior Goal`,
    item.description_filemaker_terms,
    "",
    "## User Story",
    item.user_story,
    "",
    "## Acceptance Criteria",
    ...item.acceptance_criteria.map((entry) => `- ${entry}`),
    "",
    "## Suggested Technical Approach",
    item.suggested_technical_approach,
    "",
    "## Test Strategy",
    `- ${item.test_strategy}`,
    "",
    "## Scoring",
    `- user_impact: ${item.user_impact}`,
    `- parity_importance: ${item.parity_importance}`,
    `- complexity_score: ${item.complexity_score}`,
    `- risk: ${item.risk}`,
    `- leverage: ${item.leverage}`,
    `- composite_score: ${item.composite_score}`,
    "",
    "## Dependencies",
    ...(item.dependencies.length ? item.dependencies.map((entry) => `- ${entry}`) : ["- None"])
  ].join("\n");
}

async function writeLocalIssues(issueDir: string, topItems: BacklogItem[]): Promise<string[]> {
  await ensureDir(issueDir);
  const existing = await fs.readdir(issueDir, { withFileTypes: true });
  await Promise.all(
    existing
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
      .map((entry) => fs.unlink(path.join(issueDir, entry.name)))
  );

  const created: string[] = [];
  for (let index = 0; index < topItems.length; index += 1) {
    const item = topItems[index];
    const rank = String(index + 1).padStart(4, "0");
    const fileName = `${rank}-${slugify(item.title)}.md`;
    const filePath = path.join(issueDir, fileName);
    const labels = labelsForTheme(item.theme);
    const frontMatter = [
      "---",
      `title: \"${item.improvement_id}: ${item.title.replace(/\"/g, "'")}\"`,
      `labels: [${labels.map((entry) => `\"${entry}\"`).join(", ")}]`,
      `theme: \"${item.theme}\"`,
      `source_capability_id: \"${item.source_capability_id}\"`,
      `composite_score: ${item.composite_score}`,
      "---",
      ""
    ].join("\n");

    await writeText(filePath, `${frontMatter}${issueBody(item)}`);
    created.push(filePath);
  }
  return created;
}

async function createGitHubIssue(
  ownerRepo: string,
  token: string,
  item: BacklogItem,
  labels: string[]
): Promise<void> {
  const response = await fetch(`https://api.github.com/repos/${ownerRepo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
      "User-Agent": "fmweb-ide-audit"
    },
    body: JSON.stringify({
      title: `${item.improvement_id}: ${item.title}`,
      body: issueBody(item),
      labels
    })
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`GitHub issue create failed (${response.status}): ${payload.slice(0, 400)}`);
  }
}

export async function generateIssues(
  topItems: BacklogItem[],
  options: {
    repoRoot: string;
    forceLocal?: boolean;
  }
): Promise<{ mode: "github" | "local"; created: string[]; labels: string[] }> {
  const issueDir = path.join(options.repoRoot, "docs", "audit", "issues");
  const labels = [...REQUIRED_LABELS];

  if (options.forceLocal) {
    const created = await writeLocalIssues(issueDir, topItems);
    return {
      mode: "local",
      created,
      labels
    };
  }

  const token = (process.env.GITHUB_TOKEN ?? "").trim();
  const ownerRepo = (process.env.GITHUB_REPOSITORY ?? "").trim();
  const allowGitHub = String(process.env.AUDIT_CREATE_GITHUB_ISSUES ?? "").trim() === "1";

  if (!token || !ownerRepo || !allowGitHub) {
    const created = await writeLocalIssues(issueDir, topItems);
    return {
      mode: "local",
      created,
      labels
    };
  }

  try {
    for (const item of topItems) {
      await createGitHubIssue(ownerRepo, token, item, labelsForTheme(item.theme));
    }
    return {
      mode: "github",
      created: topItems.map((item) => `${ownerRepo}#${item.improvement_id}`),
      labels
    };
  } catch {
    const created = await writeLocalIssues(issueDir, topItems);
    return {
      mode: "local",
      created,
      labels
    };
  }
}

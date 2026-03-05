import type { BacklogItem, ParityStatusItem } from "../models/types";

function mapTheme(item: ParityStatusItem): string {
  if (item.category === "Layout Mode") {
    if (item.subcategory === "Portals") {
      return "Portals";
    }
    if (["Layout Parts", "Objects", "Inspector"].includes(item.subcategory)) {
      return "Layout Rendering Fidelity";
    }
    return "Design Mode UX";
  }
  if (item.category === "Browse Mode") {
    if (item.subcategory === "Find" || item.subcategory === "Views" || item.subcategory === "Controls") {
      return "Product Polish";
    }
    return "Design Mode UX";
  }
  if (item.category === "Scripting & Events") {
    return "Scripting & Events";
  }
  if (item.category === "Data & Relational") {
    if (item.subcategory === "Portals") {
      return "Portals";
    }
    if (item.subcategory === "Import") {
      return "Schema/DDR tooling";
    }
    return "Layout Rendering Fidelity";
  }
  if (item.category === "Security") {
    return "Security/Compliance";
  }
  if (item.category === "Performance") {
    return "Performance";
  }
  return "Developer Experience";
}

function complexityBand(status: ParityStatusItem["status"], uncertainty: ParityStatusItem["uncertainty_level"]): BacklogItem["complexity"] {
  if (status === "Implemented") {
    return "S";
  }
  if (status === "Partial") {
    return uncertainty === "high" ? "L" : "M";
  }
  if (status === "Unknown") {
    return "L";
  }
  return "XL";
}

function complexityScore(band: BacklogItem["complexity"]): number {
  switch (band) {
    case "S":
      return 2;
    case "M":
      return 3;
    case "L":
      return 4;
    case "XL":
      return 5;
  }
}

function baseImpact(item: ParityStatusItem): number {
  if (item.category === "Layout Mode" || item.category === "Browse Mode") {
    return 5;
  }
  if (item.category === "Data & Relational" || item.category === "Scripting & Events") {
    return 4;
  }
  if (item.category === "Security" || item.category === "Performance") {
    return 4;
  }
  return 3;
}

function parityImportance(item: ParityStatusItem): number {
  if (item.status === "Missing") {
    return 5;
  }
  if (item.status === "Unknown") {
    return 4;
  }
  if (item.status === "Partial") {
    return 4;
  }
  return 3;
}

function riskScore(item: ParityStatusItem): number {
  let score = 2;
  if (item.status === "Missing" || item.status === "Unknown") {
    score = 4;
  } else if (item.status === "Partial") {
    score = 3;
  }
  if (item.uncertainty_level === "high") {
    score = Math.min(5, score + 1);
  }
  return score;
}

function leverageScore(item: ParityStatusItem): number {
  const sub = item.subcategory.toLowerCase();
  if (sub.includes("portal") || sub.includes("layout") || sub.includes("auth") || sub.includes("import") || sub.includes("tooling")) {
    return 5;
  }
  if (sub.includes("find") || sub.includes("triggers") || sub.includes("views")) {
    return 4;
  }
  return 3;
}

function buildTitle(item: ParityStatusItem): string {
  return `${item.capability_name} parity hardening`;
}

function buildDescription(item: ParityStatusItem): string {
  return `${item.expected_filemaker_behavior} This improvement is framed in FileMaker terms and grounded in FMWeb IDE module evidence.`;
}

function buildApproach(item: ParityStatusItem): string {
  const evidencePaths = [...new Set(item.evidence.map((entry) => entry.file))].slice(0, 3);
  if (evidencePaths.length > 0) {
    return `Refine existing implementation in ${evidencePaths.join(", ")}, then close parity gaps with deterministic behavior tests.`;
  }
  const hintPaths = item.id.startsWith("LM") ? ["components/layout-mode.tsx"] : item.id.startsWith("BM") ? ["components/browse-mode.tsx"] : ["src/lib"];
  return `Introduce additive implementation path starting in ${hintPaths.join(", ")} and connect to current runtime/data modules.`;
}

function buildDependencies(item: ParityStatusItem): string[] {
  const fromEvidence = item.evidence.map((entry) => entry.file);
  const unique = [...new Set(fromEvidence)];
  return unique.slice(0, 4);
}

export function generateBacklog(statuses: ParityStatusItem[]): BacklogItem[] {
  const items = statuses.map((statusItem) => {
    const complexity = complexityBand(statusItem.status, statusItem.uncertainty_level);
    const cScore = complexityScore(complexity);
    const userImpact = baseImpact(statusItem);
    const parity = parityImportance(statusItem);
    const risk = riskScore(statusItem);
    const leverage = leverageScore(statusItem);
    const composite = Number((
      userImpact * 0.3 +
      parity * 0.3 +
      (6 - cScore) * 0.15 +
      (6 - risk) * 0.1 +
      leverage * 0.15
    ).toFixed(2));

    const backlogItem: BacklogItem = {
      improvement_id: `IMP-${statusItem.id}`,
      source_capability_id: statusItem.id,
      theme: mapTheme(statusItem),
      title: buildTitle(statusItem),
      description_filemaker_terms: buildDescription(statusItem),
      user_story: `As a FileMaker developer, I need ${statusItem.capability_name.toLowerCase()} so FMWeb IDE behaves like native FileMaker for this workflow.`,
      acceptance_criteria: [
        statusItem.expected_filemaker_behavior,
        "Behavior is deterministic across repeated runs.",
        "Regression tests cover success and failure paths."
      ],
      suggested_technical_approach: buildApproach(statusItem),
      test_strategy: statusItem.suggested_validation_test,
      complexity,
      dependencies: buildDependencies(statusItem),
      user_impact: userImpact,
      parity_importance: parity,
      complexity_score: cScore,
      risk,
      leverage,
      composite_score: composite
    };

    return backlogItem;
  });

  items.sort((a, b) => b.composite_score - a.composite_score || a.improvement_id.localeCompare(b.improvement_id));
  return items;
}

function renderItem(item: BacklogItem, rank: number, bucket: string): string {
  return [
    `### ${rank}. ${item.improvement_id} — ${item.title} (${bucket})`,
    `- Theme: ${item.theme}`,
    `- Description (FileMaker terms): ${item.description_filemaker_terms}`,
    `- User Story: ${item.user_story}`,
    "- Acceptance Criteria:",
    ...item.acceptance_criteria.map((entry) => `  - ${entry}`),
    `- Suggested Technical Approach: ${item.suggested_technical_approach}`,
    `- Test Strategy: ${item.test_strategy}`,
    `- Complexity: ${item.complexity}`,
    `- Dependencies: ${item.dependencies.length ? item.dependencies.join(", ") : "None"}`,
    `- Scoring: impact=${item.user_impact}, parity=${item.parity_importance}, complexity=${item.complexity_score}, risk=${item.risk}, leverage=${item.leverage}, composite=${item.composite_score}`,
    ""
  ].join("\n");
}

export function renderBacklogMarkdown(backlog: BacklogItem[]): string {
  const now = backlog.slice(0, 20);
  const next = backlog.slice(20, 50);
  const later = backlog.slice(50);

  const lines = [
    "# Backlog Parity Improvements",
    "",
    `Total discrete improvements generated: **${backlog.length}**`,
    "",
    "## Scoring Formula",
    "",
    "Composite score = 0.30*user_impact + 0.30*parity_importance + 0.15*(6-complexity_score) + 0.10*(6-risk) + 0.15*leverage",
    "",
    "## Buckets",
    "",
    `- Now: ${now.length}`,
    `- Next: ${next.length}`,
    `- Later: ${later.length}`,
    ""
  ];

  const themes = [
    "Layout Rendering Fidelity",
    "Design Mode UX",
    "Portals",
    "Scripting & Events",
    "Schema/DDR tooling",
    "Developer Experience",
    "Performance",
    "Security/Compliance",
    "Product Polish"
  ];

  const bucketOf = (index: number): string => {
    if (index < 20) {
      return "Now";
    }
    if (index < 50) {
      return "Next";
    }
    return "Later";
  };

  for (const theme of themes) {
    const themed = backlog
      .map((item, index) => ({ item, index }))
      .filter((entry) => entry.item.theme === theme);

    if (themed.length === 0) {
      continue;
    }

    lines.push(`## Theme: ${theme}`);
    lines.push("");
    for (const entry of themed) {
      lines.push(renderItem(entry.item, entry.index + 1, bucketOf(entry.index)));
    }
  }

  return lines.join("\n");
}

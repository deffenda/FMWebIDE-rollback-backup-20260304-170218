import type { BacklogItem } from "../models/types";

export function generateTopWins(backlog: BacklogItem[], count = 20): BacklogItem[] {
  return backlog.slice(0, count);
}

export function renderTopWinsMarkdown(topWins: BacklogItem[]): string {
  const lines = [
    "# Top 20 Parity Wins This Week",
    "",
    "High-value parity wins selected by composite score, weighted for FileMaker developer impact and implementation leverage.",
    ""
  ];

  topWins.forEach((item, index) => {
    lines.push(`## ${index + 1}. ${item.improvement_id} — ${item.title}`);
    lines.push(`- Why it matters to FileMaker devs: ${item.description_filemaker_terms}`);
    lines.push(`- How to implement in FMWeb IDE: ${item.suggested_technical_approach}`);
    lines.push(`- Test plan: ${item.test_strategy}`);
    lines.push(`- Complexity: ${item.complexity}`);
    lines.push(`- Composite score: ${item.composite_score}`);
    lines.push("");
  });

  return lines.join("\n");
}

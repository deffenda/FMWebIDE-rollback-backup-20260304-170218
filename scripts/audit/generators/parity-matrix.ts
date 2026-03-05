import type { ComplexityBand, ParityStatusItem, RiskBand } from "../models/types";
import { csvEscape } from "../utils/fs-utils.ts";

type MatrixRow = {
  id: string;
  category: string;
  fileMakerBehavior: string;
  status: string;
  gapDescription: string;
  complexity: ComplexityBand;
  risk: RiskBand;
  suggestedApproach: string;
  acceptanceCriteria: string;
  testStrategy: string;
  evidence: string;
};

function complexityForStatus(status: string): ComplexityBand {
  if (status === "Implemented") {
    return "S";
  }
  if (status === "Partial") {
    return "M";
  }
  if (status === "Unknown") {
    return "L";
  }
  return "L";
}

function riskForStatus(status: string): RiskBand {
  if (status === "Implemented") {
    return "Low";
  }
  if (status === "Partial") {
    return "Med";
  }
  if (status === "Unknown") {
    return "High";
  }
  return "High";
}

function gapDescription(item: ParityStatusItem): string {
  if (item.status === "Implemented") {
    return "Capability evidence is strong; recommend hardening/regression coverage to prevent drift.";
  }
  if (item.status === "Partial") {
    return "Capability appears present but implementation depth or consistency likely diverges from FileMaker parity target.";
  }
  if (item.status === "Unknown") {
    return "Evidence is too weak/ambiguous; requires targeted validation experiment before implementation claim.";
  }
  return "No direct implementation evidence detected in scanned modules.";
}

function suggestedApproach(item: ParityStatusItem): string {
  if (item.evidence.length > 0) {
    const fileHints = item.evidence.slice(0, 2).map((entry) => entry.file).join(", ");
    return `Extend existing implementation paths in ${fileHints} and align behavior with expected FileMaker semantics.`;
  }
  return "Create a focused module and route integration path aligned with existing runtime and workspace architecture.";
}

function acceptanceCriteria(item: ParityStatusItem): string {
  return item.expected_filemaker_behavior;
}

function evidenceString(item: ParityStatusItem): string {
  if (item.evidence.length === 0) {
    return "No direct evidence hit";
  }
  return item.evidence
    .map((entry) => `${entry.file}:${entry.line}`)
    .join("; ");
}

export function generateParityMatrixRows(statuses: ParityStatusItem[]): MatrixRow[] {
  return statuses.map((item) => ({
    id: item.id,
    category: `${item.category} / ${item.subcategory}`,
    fileMakerBehavior: item.expected_filemaker_behavior,
    status: item.status,
    gapDescription: gapDescription(item),
    complexity: complexityForStatus(item.status),
    risk: riskForStatus(item.status),
    suggestedApproach: suggestedApproach(item),
    acceptanceCriteria: acceptanceCriteria(item),
    testStrategy: item.suggested_validation_test,
    evidence: evidenceString(item)
  }));
}

export function renderParityMatrixCsv(rows: MatrixRow[]): string {
  const headers = [
    "ID",
    "Category",
    "FileMaker Behavior",
    "FMWeb Status",
    "Gap Description",
    "Complexity",
    "Risk",
    "Suggested Approach",
    "Acceptance Criteria",
    "Test Strategy",
    "Evidence"
  ];
  const lines = [headers.join(",")];

  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.category,
        row.fileMakerBehavior,
        row.status,
        row.gapDescription,
        row.complexity,
        row.risk,
        row.suggestedApproach,
        row.acceptanceCriteria,
        row.testStrategy,
        row.evidence
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  return lines.join("\n");
}

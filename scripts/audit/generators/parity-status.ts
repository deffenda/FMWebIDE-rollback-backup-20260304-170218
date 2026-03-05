import type { ParityStatus, ParityStatusItem, ParityTaxonomyItem } from "../models/types";
import { findEvidence, type RepoIndex } from "../extractors/repo-index.ts";

function determineStatus(item: ParityTaxonomyItem, evidenceCount: number): ParityStatus {
  if (evidenceCount >= 4) {
    return "Implemented";
  }
  if (evidenceCount >= 2) {
    return "Partial";
  }
  if (evidenceCount === 1) {
    return item.uncertainty_level === "high" ? "Unknown" : "Partial";
  }
  return item.uncertainty_level === "high" ? "Unknown" : "Missing";
}

export function generateParityStatuses(index: RepoIndex, taxonomy: ParityTaxonomyItem[]): ParityStatusItem[] {
  const statuses: ParityStatusItem[] = taxonomy.map((item) => {
    const evidence = findEvidence(index, {
      keywords: item.keywords,
      pathHints: item.pathHints,
      maxHits: 6
    });

    return {
      id: item.id,
      category: item.category,
      subcategory: item.subcategory,
      capability_name: item.capability_name,
      expected_filemaker_behavior: item.expected_filemaker_behavior,
      typical_user_value: item.typical_user_value,
      suggested_validation_test: item.suggested_validation_test,
      uncertainty_level: item.uncertainty_level,
      status: determineStatus(item, evidence.length),
      evidence
    };
  });

  statuses.sort((a, b) => a.id.localeCompare(b.id));
  return statuses;
}

import { evaluateFMCalcBoolean } from "./fmcalc/index.ts";
import type { FMRecord, LayoutDefinition } from "./layout-model";

export type RecordCommitRequestPolicyResult = {
  allowed: boolean;
  reasons: string[];
};

function isCommitRequestRuleEffect(effect: string): boolean {
  const token = effect.trim().toLowerCase();
  return token.includes("recordcommitrequest") || token.includes("commitrequest");
}

function isDenyEffect(effect: string): boolean {
  const token = effect.trim().toLowerCase();
  if (!token) {
    return true;
  }
  return token.includes("deny") || token.includes("block") || token.includes("veto");
}

export function evaluateRecordCommitRequestPolicy(
  layout: LayoutDefinition | null,
  record: FMRecord | null
): RecordCommitRequestPolicyResult {
  if (!layout || !record || !Array.isArray(layout.rules) || layout.rules.length === 0) {
    return {
      allowed: true,
      reasons: []
    };
  }

  const reasons: string[] = [];
  for (const rule of layout.rules) {
    const effect = String(rule.effect ?? "").trim();
    if (!effect || !isCommitRequestRuleEffect(effect)) {
      continue;
    }
    const condition = String(rule.condition ?? "").trim();
    if (!condition) {
      continue;
    }
    const result = evaluateFMCalcBoolean(condition, {
      currentRecord: record as Record<string, unknown>,
      currentTableOccurrence: layout.defaultTableOccurrence
    });
    if (!result.ok) {
      reasons.push(`Rule "${rule.id}" could not be evaluated (${result.error})`);
      continue;
    }
    if (result.value && isDenyEffect(effect)) {
      reasons.push(`Rule "${rule.id}" vetoed commit`);
    }
  }

  return {
    allowed: reasons.length === 0,
    reasons
  };
}

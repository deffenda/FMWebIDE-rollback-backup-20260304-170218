import { browseRecordLifecycleScenarios } from "./browse-record-lifecycle.scenarios.mts";
import { findModeQueryScenarios } from "./find-mode-query.scenarios.mts";
import { portalRelatedDataScenarios } from "./portal-related-data.scenarios.mts";
import { layoutModeSafeEditScenarios } from "./layout-mode-safe-edits.scenarios.mts";
import { navigationHistoryScenarios } from "./navigation-history.scenarios.mts";
import type { NativeParityScenario } from "./types.mts";

export const nativeParityScenarios: NativeParityScenario[] = [
  ...browseRecordLifecycleScenarios,
  ...findModeQueryScenarios,
  ...portalRelatedDataScenarios,
  ...layoutModeSafeEditScenarios,
  ...navigationHistoryScenarios
].sort((a, b) => a.id.localeCompare(b.id));

export function selectScenarioRunSet(mode: "smoke" | "full"): NativeParityScenario[] {
  if (mode === "full") {
    return nativeParityScenarios;
  }
  return nativeParityScenarios.filter((scenario) => scenario.smoke);
}

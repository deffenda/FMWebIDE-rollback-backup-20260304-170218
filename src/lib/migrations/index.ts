export { generateMigrationPlan } from "./generate.ts";
export { applyMigrationToSnapshot } from "./apply.ts";
export type {
  MigrationApplyResult,
  MigrationGenerationOptions,
  MigrationPlan,
  MigrationRisk,
  MigrationStep,
  MigrationStepType
} from "./types.ts";

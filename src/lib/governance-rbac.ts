import type { AppLayerCapabilityKey } from "../config/appLayerCapabilities.ts";

export type GovernanceRole = "admin" | "developer" | "power-user" | "runtime-user";

export type GovernanceAction =
  | "version.read"
  | "version.create"
  | "version.rollback"
  | "promotion.read"
  | "promotion.promote"
  | "promotion.rollback"
  | "migration.apply"
  | "admin.console.read"
  | "app-layer.manage";

const rolePermissionMap: Record<GovernanceRole, ReadonlySet<GovernanceAction>> = {
  admin: new Set<GovernanceAction>([
    "version.read",
    "version.create",
    "version.rollback",
    "promotion.read",
    "promotion.promote",
    "promotion.rollback",
    "migration.apply",
    "admin.console.read",
    "app-layer.manage"
  ]),
  developer: new Set<GovernanceAction>([
    "version.read",
    "version.create",
    "version.rollback",
    "promotion.read",
    "migration.apply",
    "app-layer.manage"
  ]),
  "power-user": new Set<GovernanceAction>(["version.read", "promotion.read", "promotion.promote", "app-layer.manage"]),
  "runtime-user": new Set<GovernanceAction>(["version.read"])
};

const runtimeUserDeniedCapabilities = new Set<AppLayerCapabilityKey>([
  "manageDatabase",
  "manageSecurity",
  "manageValueLists",
  "manageLayouts",
  "manageScripts",
  "manageExternalDataSources",
  "manageContainers",
  "manageCustomFunctions",
  "manageCustomMenus",
  "manageThemes",
  "fileOptions",
  "pluginManager",
  "scriptDebugger",
  "workspaceVersioning",
  "publishPromote",
  "adminConsole"
]);

const powerUserDeniedCapabilities = new Set<AppLayerCapabilityKey>([
  "manageDatabase",
  "manageSecurity",
  "manageExternalDataSources",
  "manageCustomFunctions",
  "adminConsole"
]);

function cleanRoleToken(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizeGovernanceRole(value: unknown): GovernanceRole {
  const token = cleanRoleToken(value);
  if (token === "admin") {
    return "admin";
  }
  if (token === "developer" || token === "dev") {
    return "developer";
  }
  if (token === "power-user" || token === "poweruser" || token === "release-manager") {
    return "power-user";
  }
  return "runtime-user";
}

export function resolveGovernanceRoleFromClaims(roles: string[] | undefined): GovernanceRole {
  if (!roles || roles.length === 0) {
    return "runtime-user";
  }
  const normalized = new Set(roles.map((entry) => cleanRoleToken(entry)));
  if (normalized.has("admin")) {
    return "admin";
  }
  if (normalized.has("developer") || normalized.has("dev")) {
    return "developer";
  }
  if (normalized.has("power-user") || normalized.has("poweruser") || normalized.has("release-manager")) {
    return "power-user";
  }
  if (normalized.has("readonly") || normalized.has("runtime-user")) {
    return "runtime-user";
  }
  return "runtime-user";
}

export function canGovernanceRolePerform(role: GovernanceRole, action: GovernanceAction): boolean {
  return rolePermissionMap[role].has(action);
}

export function canGovernanceRoleUseCapability(
  role: GovernanceRole,
  capabilityKey: AppLayerCapabilityKey
): boolean {
  if (role === "admin" || role === "developer") {
    return true;
  }
  if (role === "power-user") {
    return !powerUserDeniedCapabilities.has(capabilityKey);
  }
  return !runtimeUserDeniedCapabilities.has(capabilityKey);
}

export function listGovernanceRoleActions(role: GovernanceRole): GovernanceAction[] {
  return [...rolePermissionMap[role]].sort((left, right) => left.localeCompare(right));
}

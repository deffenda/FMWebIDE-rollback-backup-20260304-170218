export type ApiAction =
  | "layout:read"
  | "layout:write"
  | "field:read"
  | "script:read"
  | "script:execute"
  | "record:read"
  | "record:write"
  | "record:delete"
  | "workspace:read"
  | "workspace:write"
  | "workspace:import"
  | "workspace:delete"
  | "admin:metrics"
  | "admin:audit";

const rolePermissions: Record<string, Set<ApiAction>> = {
  admin: new Set<ApiAction>([
    "layout:read",
    "layout:write",
    "field:read",
    "script:read",
    "script:execute",
    "record:read",
    "record:write",
    "record:delete",
    "workspace:read",
    "workspace:write",
    "workspace:import",
    "workspace:delete",
    "admin:metrics",
    "admin:audit"
  ]),
  developer: new Set<ApiAction>([
    "layout:read",
    "layout:write",
    "field:read",
    "script:read",
    "script:execute",
    "record:read",
    "record:write",
    "record:delete",
    "workspace:read",
    "workspace:write",
    "workspace:import"
  ]),
  "script-runner": new Set<ApiAction>(["script:read", "script:execute", "layout:read", "record:read", "field:read"]),
  readonly: new Set<ApiAction>(["layout:read", "field:read", "script:read", "record:read", "workspace:read"]),
  auditor: new Set<ApiAction>(["layout:read", "field:read", "workspace:read", "admin:audit", "admin:metrics"])
};

export function normalizeRoles(raw: string[] | undefined): string[] {
  if (!raw) {
    return [];
  }
  return raw.map((entry) => entry.trim().toLowerCase()).filter((entry) => entry.length > 0);
}

export function canPerformAction(rolesRaw: string[] | undefined, action: ApiAction): boolean {
  const roles = normalizeRoles(rolesRaw);
  if (roles.length === 0) {
    return false;
  }
  for (const role of roles) {
    const permissions = rolePermissions[role];
    if (permissions?.has(action)) {
      return true;
    }
  }
  return false;
}

export function inferActionFromRoute(pathname: string, method: string): ApiAction | null {
  const upperMethod = method.trim().toUpperCase();
  const path = pathname.trim();
  if (path.startsWith("/api/layouts")) {
    return upperMethod === "GET" ? "layout:read" : "layout:write";
  }
  if (path.startsWith("/api/fm/layouts")) {
    return "layout:read";
  }
  if (path.startsWith("/api/fm/fields")) {
    return "field:read";
  }
  if (path.startsWith("/api/fm/scripts")) {
    return upperMethod === "GET" ? "script:read" : "script:execute";
  }
  if (path.startsWith("/api/fm/records")) {
    if (upperMethod === "GET") {
      return "record:read";
    }
    if (upperMethod === "DELETE") {
      return "record:delete";
    }
    return "record:write";
  }
  if (path.startsWith("/api/fm/find")) {
    return "record:read";
  }
  if (path.startsWith("/api/workspaces/import")) {
    return "workspace:import";
  }
  if (path.startsWith("/api/workspaces/solution")) {
    return "workspace:delete";
  }
  if (path.startsWith("/api/workspaces")) {
    return upperMethod === "GET" ? "workspace:read" : "workspace:write";
  }
  if (path.startsWith("/api/admin/metrics")) {
    return "admin:metrics";
  }
  if (path.startsWith("/api/admin/audit")) {
    return "admin:audit";
  }
  return null;
}

export function filterSensitiveFieldNamesForRole(
  fields: Array<{ name: string; type: string }>,
  rolesRaw: string[] | undefined
): Array<{ name: string; type: string }> {
  const roles = normalizeRoles(rolesRaw);
  if (roles.includes("admin") || roles.includes("developer")) {
    return fields;
  }
  const blockedTokens = ["password", "passwd", "secret", "token", "ssn", "socialsecurity", "creditcard"];
  return fields.filter((entry) => {
    const name = entry.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
    return blockedTokens.every((token) => !name.includes(token));
  });
}

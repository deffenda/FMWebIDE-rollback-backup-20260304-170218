export type SecurityRoleWorkspaceEntry = {
  id: string;
  name: string;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  notes?: string;
};

export const AUTH_PROFILE_PRIVILEGE_SET_PREFIX = "Privilege Set:";

function cleanText(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function normalizeSlugToken(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return slug || "privilege-set";
}

function roleIdSet(entries: SecurityRoleWorkspaceEntry[]): Set<string> {
  return new Set(entries.map((entry) => cleanText(entry.id)).filter((entry) => entry.length > 0));
}

export function nextSecurityRoleName(entries: SecurityRoleWorkspaceEntry[]): string {
  const used = new Set(entries.map((entry) => cleanText(entry.name).toLowerCase()).filter((entry) => entry.length > 0));
  const base = "New Privilege Set";
  if (!used.has(base.toLowerCase())) {
    return base;
  }
  for (let index = 2; index <= 500; index += 1) {
    const candidate = `${base} ${index}`;
    if (!used.has(candidate.toLowerCase())) {
      return candidate;
    }
  }
  return `${base} ${Date.now()}`;
}

function nextSecurityRoleId(entries: SecurityRoleWorkspaceEntry[], preferredName: string): string {
  const used = roleIdSet(entries);
  const base = normalizeSlugToken(preferredName);
  if (!used.has(base)) {
    return base;
  }
  for (let index = 2; index <= 500; index += 1) {
    const candidate = `${base}-${index}`;
    if (!used.has(candidate)) {
      return candidate;
    }
  }
  return `${base}-${Date.now()}`;
}

export function createSecurityRoleEntry(
  entries: SecurityRoleWorkspaceEntry[],
  options?: Partial<SecurityRoleWorkspaceEntry>
): SecurityRoleWorkspaceEntry {
  const preferredName = cleanText(options?.name) || nextSecurityRoleName(entries);
  return {
    id: cleanText(options?.id) || nextSecurityRoleId(entries, preferredName),
    name: preferredName,
    canView: options?.canView !== false,
    canEdit: options?.canEdit !== false,
    canDelete: options?.canDelete !== false,
    notes: cleanText(options?.notes) || undefined
  };
}

export function duplicateSecurityRoleEntry(
  entries: SecurityRoleWorkspaceEntry[],
  source: SecurityRoleWorkspaceEntry
): SecurityRoleWorkspaceEntry {
  const sourceName = cleanText(source.name) || "Privilege Set";
  const preferredName = `${sourceName} Copy`;
  const usedNames = new Set(entries.map((entry) => cleanText(entry.name).toLowerCase()).filter(Boolean));
  let nextName = preferredName;
  if (usedNames.has(preferredName.toLowerCase())) {
    for (let index = 2; index <= 500; index += 1) {
      const candidate = `${preferredName} ${index}`;
      if (!usedNames.has(candidate.toLowerCase())) {
        nextName = candidate;
        break;
      }
    }
  }
  return createSecurityRoleEntry(entries, {
    name: nextName,
    canView: source.canView,
    canEdit: source.canEdit,
    canDelete: source.canDelete,
    notes: source.notes
  });
}

export function readPrivilegeSetIdFromAuthProfileNotes(notes: string | null | undefined): string {
  const text = String(notes ?? "");
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  for (const line of lines) {
    if (line.toLowerCase().startsWith(AUTH_PROFILE_PRIVILEGE_SET_PREFIX.toLowerCase())) {
      return cleanText(line.slice(AUTH_PROFILE_PRIVILEGE_SET_PREFIX.length));
    }
  }
  return "";
}

export function writePrivilegeSetIdToAuthProfileNotes(
  notes: string | null | undefined,
  privilegeSetId: string
): string | undefined {
  const normalizedPrivilegeSet = cleanText(privilegeSetId);
  const lines = String(notes ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.toLowerCase().startsWith(AUTH_PROFILE_PRIVILEGE_SET_PREFIX.toLowerCase()));
  if (normalizedPrivilegeSet) {
    lines.unshift(`${AUTH_PROFILE_PRIVILEGE_SET_PREFIX} ${normalizedPrivilegeSet}`);
  }
  return lines.length > 0 ? lines.join("\n") : undefined;
}

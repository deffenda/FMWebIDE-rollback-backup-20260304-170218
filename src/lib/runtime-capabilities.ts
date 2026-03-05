export type CapabilityRole = "fullAccess" | "readOnly" | "restricted" | "noAccess";

export type RuntimeCapabilityField = {
  visible: boolean;
  editable: boolean;
};

export type RuntimeCapabilitiesPayload = {
  workspaceId: string;
  source: "mock" | "filemaker";
  role: CapabilityRole | string;
  layout: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
  fields: Record<string, RuntimeCapabilityField>;
  portal: {
    canDeleteRelated: boolean;
  };
  error?: string;
};

type RuntimeCapabilitySource = RuntimeCapabilitiesPayload["source"];

export function normalizeCapabilityRole(raw: string | null | undefined): CapabilityRole {
  const token = String(raw ?? "").trim().toLowerCase();
  if (token === "readonly" || token === "read-only" || token === "read_only") {
    return "readOnly";
  }
  if (token === "restricted") {
    return "restricted";
  }
  if (token === "noaccess" || token === "no-access" || token === "none") {
    return "noAccess";
  }
  return "fullAccess";
}

function roleFieldCapabilities(role: CapabilityRole, fieldName: string): RuntimeCapabilityField {
  const lowered = fieldName.toLowerCase();
  if (role === "noAccess") {
    return {
      visible: false,
      editable: false
    };
  }
  if (role === "readOnly") {
    return {
      visible: true,
      editable: false
    };
  }
  if (role === "restricted") {
    if (lowered.includes("primarykey") || lowered.includes("createdby") || lowered.includes("modifiedby")) {
      return {
        visible: false,
        editable: false
      };
    }
    if (lowered.includes("timestamp") || lowered.includes("total")) {
      return {
        visible: true,
        editable: false
      };
    }
  }
  return {
    visible: true,
    editable: true
  };
}

function indexFieldCapability(
  map: Record<string, RuntimeCapabilityField>,
  fieldName: string,
  capability: RuntimeCapabilityField
): void {
  map[fieldName] = capability;
  map[fieldName.toLowerCase()] = capability;
  if (fieldName.includes("::")) {
    const unqualified = fieldName.split("::").pop()?.trim();
    if (unqualified) {
      map[unqualified] = capability;
      map[unqualified.toLowerCase()] = capability;
    }
  }
}

export function buildRuntimeCapabilitiesFromFields(options: {
  workspaceId: string;
  source: "mock" | "filemaker";
  role: CapabilityRole;
  fieldNames: string[];
  error?: string;
}): RuntimeCapabilitiesPayload {
  const { workspaceId, source, role, fieldNames, error } = options;
  const fields: Record<string, RuntimeCapabilityField> = {};
  for (const rawFieldName of fieldNames) {
    const fieldName = String(rawFieldName ?? "").trim();
    if (!fieldName) {
      continue;
    }
    indexFieldCapability(fields, fieldName, roleFieldCapabilities(role, fieldName));
  }

  const canView = role !== "noAccess";
  const canEdit = role === "fullAccess" || role === "restricted";
  const canDelete = role === "fullAccess";

  return {
    workspaceId,
    source,
    role,
    layout: {
      canView,
      canEdit,
      canDelete
    },
    fields,
    portal: {
      canDeleteRelated: canDelete
    },
    ...(error ? { error } : {})
  };
}

export function createPermissiveRuntimeCapabilities(options: {
  workspaceId: string;
  source?: RuntimeCapabilitySource;
  error?: string;
}): RuntimeCapabilitiesPayload {
  const payload = buildRuntimeCapabilitiesFromFields({
    workspaceId: String(options.workspaceId ?? "").trim() || "default",
    source: options.source === "filemaker" ? "filemaker" : "mock",
    role: "fullAccess",
    fieldNames: []
  });
  const error = String(options.error ?? "").trim();
  if (!error) {
    return payload;
  }
  return {
    ...payload,
    error
  };
}

export function normalizeRuntimeCapabilitiesPayload(
  payload: Partial<RuntimeCapabilitiesPayload> | null | undefined,
  options: {
    workspaceId: string;
    fallbackSource?: RuntimeCapabilitySource;
  }
): RuntimeCapabilitiesPayload {
  const fallbackWorkspaceId = String(options.workspaceId ?? "").trim() || "default";
  const fallbackSource = options.fallbackSource === "filemaker" ? "filemaker" : "mock";
  if (!payload || typeof payload !== "object") {
    return createPermissiveRuntimeCapabilities({
      workspaceId: fallbackWorkspaceId,
      source: fallbackSource
    });
  }

  const source = payload.source === "filemaker" ? "filemaker" : "mock";
  const role = normalizeCapabilityRole(String(payload.role ?? ""));
  const roleDefaults = buildRuntimeCapabilitiesFromFields({
    workspaceId: fallbackWorkspaceId,
    source,
    role,
    fieldNames: []
  });

  const fields: Record<string, RuntimeCapabilityField> = {};
  const fieldEntries = payload.fields && typeof payload.fields === "object" ? Object.entries(payload.fields) : [];
  for (const [rawFieldName, rawFieldCapability] of fieldEntries) {
    const fieldName = String(rawFieldName ?? "").trim();
    if (!fieldName) {
      continue;
    }
    const capabilityCandidate =
      rawFieldCapability && typeof rawFieldCapability === "object"
        ? (rawFieldCapability as Partial<RuntimeCapabilityField>)
        : {};
    const capability: RuntimeCapabilityField = {
      visible: capabilityCandidate.visible !== false,
      editable: capabilityCandidate.editable !== false
    };
    indexFieldCapability(fields, fieldName, capability);
  }

  const error = typeof payload.error === "string" ? payload.error.trim() : "";
  return {
    workspaceId: fallbackWorkspaceId,
    source,
    role,
    layout: {
      canView: payload.layout?.canView ?? roleDefaults.layout.canView,
      canEdit: payload.layout?.canEdit ?? roleDefaults.layout.canEdit,
      canDelete: payload.layout?.canDelete ?? roleDefaults.layout.canDelete
    },
    fields,
    portal: {
      canDeleteRelated: payload.portal?.canDeleteRelated ?? roleDefaults.portal.canDeleteRelated
    },
    ...(error ? { error } : {})
  };
}

export function resolveRuntimeCapabilityField(
  capabilities: RuntimeCapabilitiesPayload,
  fieldName: string
): RuntimeCapabilityField {
  if (!fieldName.trim()) {
    return {
      visible: true,
      editable: true
    };
  }
  const fields = capabilities.fields ?? {};
  const normalized = fieldName.trim();
  const unqualified = normalized.includes("::") ? normalized.split("::").pop()?.trim() ?? normalized : normalized;
  return (
    fields[normalized] ??
    fields[normalized.toLowerCase()] ??
    fields[unqualified] ??
    fields[unqualified.toLowerCase()] ?? {
      visible: true,
      editable: true
    }
  );
}

export function canViewRuntimeField(capabilities: RuntimeCapabilitiesPayload, fieldName: string): boolean {
  if (capabilities.layout.canView === false) {
    return false;
  }
  return resolveRuntimeCapabilityField(capabilities, fieldName).visible !== false;
}

export function canEditRuntimeField(capabilities: RuntimeCapabilitiesPayload, fieldName: string): boolean {
  if (capabilities.layout.canEdit === false) {
    return false;
  }
  return resolveRuntimeCapabilityField(capabilities, fieldName).editable !== false;
}

export function canDeleteRuntimePortalRows(capabilities: RuntimeCapabilitiesPayload): boolean {
  return capabilities.layout.canDelete !== false && capabilities.portal.canDeleteRelated !== false;
}

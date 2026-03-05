import type { FMRecord } from "@/src/lib/layout-model";

export type PortalRowOperationType = "create" | "update" | "delete";

export type PortalRowOperation = {
  id: string;
  type: PortalRowOperationType;
  tableOccurrence: string;
  rowRecordId?: string;
  fieldData?: Record<string, unknown>;
  componentId?: string;
};

export type EditRecordState = {
  snapshot: FMRecord;
  dirtyFields: Record<string, unknown>;
  portalOperations: PortalRowOperation[];
};

export type EditSessionState = {
  active: boolean;
  records: Record<string, EditRecordState>;
  startedAt: number | null;
};

export function createEmptyEditSession(): EditSessionState {
  return {
    active: false,
    records: {},
    startedAt: null
  };
}

function normalizeRecordId(recordId: string | undefined): string {
  return String(recordId ?? "").trim();
}

function cloneRecord(record: FMRecord): FMRecord {
  return { ...record };
}

function ensureRecordState(
  state: EditSessionState,
  recordId: string,
  snapshot: FMRecord
): EditRecordState {
  const existing = state.records[recordId];
  if (existing) {
    return existing;
  }
  return {
    snapshot: cloneRecord(snapshot),
    dirtyFields: {},
    portalOperations: []
  };
}

export function beginEdit(
  state: EditSessionState,
  params: {
    recordId?: string;
    snapshot: FMRecord;
    now?: number;
  }
): EditSessionState {
  const recordId = normalizeRecordId(params.recordId ?? String(params.snapshot.recordId ?? ""));
  if (!recordId) {
    return state;
  }
  if (state.records[recordId]) {
    if (state.active) {
      return state;
    }
    return {
      ...state,
      active: true,
      startedAt: params.now ?? Date.now()
    };
  }
  return {
    active: true,
    startedAt: state.startedAt ?? params.now ?? Date.now(),
    records: {
      ...state.records,
      [recordId]: ensureRecordState(state, recordId, params.snapshot)
    }
  };
}

export function stageFieldChange(
  state: EditSessionState,
  params: {
    recordId?: string;
    field: string;
    value: unknown;
    snapshot: FMRecord;
  }
): EditSessionState {
  const recordId = normalizeRecordId(params.recordId ?? String(params.snapshot.recordId ?? ""));
  const field = params.field.trim();
  if (!recordId || !field) {
    return state;
  }
  const baseState = beginEdit(state, {
    recordId,
    snapshot: params.snapshot
  });
  const recordState = ensureRecordState(baseState, recordId, params.snapshot);
  const originalValue = recordState.snapshot[field];
  const nextDirtyFields = { ...recordState.dirtyFields };

  if (Object.is(originalValue, params.value)) {
    delete nextDirtyFields[field];
  } else {
    nextDirtyFields[field] = params.value;
  }

  const nextRecordState: EditRecordState = {
    ...recordState,
    dirtyFields: nextDirtyFields
  };

  return {
    ...baseState,
    records: {
      ...baseState.records,
      [recordId]: nextRecordState
    }
  };
}

export function stagePortalOperation(
  state: EditSessionState,
  params: {
    recordId?: string;
    snapshot: FMRecord;
    operation: PortalRowOperation;
  }
): EditSessionState {
  const recordId = normalizeRecordId(params.recordId ?? String(params.snapshot.recordId ?? ""));
  if (!recordId) {
    return state;
  }
  const baseState = beginEdit(state, {
    recordId,
    snapshot: params.snapshot
  });
  const recordState = ensureRecordState(baseState, recordId, params.snapshot);
  const nextPortalOperations = [...recordState.portalOperations, params.operation];
  return {
    ...baseState,
    records: {
      ...baseState.records,
      [recordId]: {
        ...recordState,
        portalOperations: nextPortalOperations
      }
    }
  };
}

export function revertField(
  state: EditSessionState,
  params: {
    recordId?: string;
    field: string;
  }
): EditSessionState {
  const recordId = normalizeRecordId(params.recordId);
  const field = params.field.trim();
  if (!recordId || !field) {
    return state;
  }
  const recordState = state.records[recordId];
  if (!recordState || !recordState.dirtyFields[field]) {
    return state;
  }
  const nextDirtyFields = { ...recordState.dirtyFields };
  delete nextDirtyFields[field];
  return {
    ...state,
    records: {
      ...state.records,
      [recordId]: {
        ...recordState,
        dirtyFields: nextDirtyFields
      }
    }
  };
}

export function revertPortalRow(
  state: EditSessionState,
  params: {
    recordId?: string;
    operationId: string;
  }
): EditSessionState {
  const recordId = normalizeRecordId(params.recordId);
  if (!recordId) {
    return state;
  }
  const recordState = state.records[recordId];
  if (!recordState) {
    return state;
  }
  const nextPortalOperations = recordState.portalOperations.filter(
    (operation) => operation.id !== params.operationId
  );
  if (nextPortalOperations.length === recordState.portalOperations.length) {
    return state;
  }
  return {
    ...state,
    records: {
      ...state.records,
      [recordId]: {
        ...recordState,
        portalOperations: nextPortalOperations
      }
    }
  };
}

export function revertRecord(
  state: EditSessionState,
  params: {
    recordId?: string;
  }
): {
  state: EditSessionState;
  snapshot: FMRecord | null;
} {
  const recordId = normalizeRecordId(params.recordId);
  if (!recordId) {
    return { state, snapshot: null };
  }
  const recordState = state.records[recordId];
  if (!recordState) {
    return { state, snapshot: null };
  }
  const nextRecords = { ...state.records };
  delete nextRecords[recordId];
  return {
    state: {
      ...state,
      records: nextRecords,
      active: Object.keys(nextRecords).length > 0
    },
    snapshot: cloneRecord(recordState.snapshot)
  };
}

export function commitRecord(
  state: EditSessionState,
  params: {
    recordId?: string;
  }
): EditSessionState {
  const recordId = normalizeRecordId(params.recordId);
  if (!recordId) {
    return state;
  }
  const nextRecords = { ...state.records };
  delete nextRecords[recordId];
  return {
    ...state,
    records: nextRecords,
    active: Object.keys(nextRecords).length > 0
  };
}

export function revertAll(): EditSessionState {
  return createEmptyEditSession();
}

export function isDirty(state: EditSessionState): boolean {
  return Object.values(state.records).some(
    (recordState) =>
      Object.keys(recordState.dirtyFields).length > 0 || recordState.portalOperations.length > 0
  );
}

export function getDirtyRecordIds(state: EditSessionState): string[] {
  return Object.keys(state.records).filter((recordId) => {
    const recordState = state.records[recordId];
    if (!recordState) {
      return false;
    }
    return Object.keys(recordState.dirtyFields).length > 0 || recordState.portalOperations.length > 0;
  });
}

export function getDirtyFieldData(
  state: EditSessionState,
  recordId?: string
): Record<string, unknown> {
  const normalizedRecordId = normalizeRecordId(recordId);
  if (!normalizedRecordId) {
    return {};
  }
  const recordState = state.records[normalizedRecordId];
  if (!recordState) {
    return {};
  }
  return { ...recordState.dirtyFields };
}

export function getPortalOperations(
  state: EditSessionState,
  recordId?: string
): PortalRowOperation[] {
  const normalizedRecordId = normalizeRecordId(recordId);
  if (!normalizedRecordId) {
    return [];
  }
  return [...(state.records[normalizedRecordId]?.portalOperations ?? [])];
}

export function applyStagedRecordToRecord(
  record: FMRecord,
  state: EditSessionState
): FMRecord {
  const recordId = normalizeRecordId(String(record.recordId ?? ""));
  if (!recordId) {
    return record;
  }
  const dirtyFields = state.records[recordId]?.dirtyFields;
  if (!dirtyFields || Object.keys(dirtyFields).length === 0) {
    return record;
  }
  return {
    ...record,
    ...dirtyFields
  };
}

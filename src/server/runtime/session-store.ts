import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";

import { DEFAULT_ACTIVE_LAYOUT_NAME } from "../../lib/default-layout-context.ts";
import type { LayoutComponent, LayoutDefinition } from "../../lib/layout-model.ts";
import { createRecord, deleteRecord, getRecords, runScript, updateRecord } from "../filemaker-client.ts";
import { buildDeterministicObjectMap } from "./object-ids.ts";
import { asFMRecord, buildRenderTree, buildTabOrderObjectIds } from "./render-tree.ts";
import { createGeometryBaselineCache } from "../../fm/layout/geometry/index.ts";
import type { FieldValidationResult } from "../../fm/objects/FieldAdapter.ts";
import type {
  RuntimeClientEvent,
  RuntimeObjectBinding,
  RuntimeOpenRequest,
  RuntimeOpenResponse,
  RuntimePatchOperation,
  RuntimePatchSet,
  RuntimeRenderTreeNode,
  RuntimeSession
} from "./types.ts";

const SESSION_TTL_MS = 30 * 60_000;
const PATCH_HISTORY_LIMIT = 400;
const POLL_TIMEOUT_MS = 25_000;
const BACKGROUND_MOD_CHECK_MS = 4_000;

type RuntimeSessionDependencies = Partial<{
  loadLayoutByRouteToken: (routeToken: string, workspaceId?: string) => Promise<LayoutDefinition>;
  getRecords: typeof getRecords;
  createRecord: typeof createRecord;
  updateRecord: typeof updateRecord;
  deleteRecord: typeof deleteRecord;
  runScript: typeof runScript;
}>;

type RuntimeSessionResolvedDependencies = {
  loadLayoutByRouteToken: (routeToken: string, workspaceId?: string) => Promise<LayoutDefinition>;
  getRecords: typeof getRecords;
  createRecord: typeof createRecord;
  updateRecord: typeof updateRecord;
  deleteRecord: typeof deleteRecord;
  runScript: typeof runScript;
};

type RuntimeSessionRecord = {
  session: RuntimeSession;
  emitter: EventEmitter;
  modCheckTimer: NodeJS.Timeout | null;
  dependencies: RuntimeSessionResolvedDependencies;
};

const sessionStore = new Map<string, RuntimeSessionRecord>();
let layoutStorageModulePromise: Promise<{
  loadLayoutByRouteToken: (routeToken: string, workspaceId?: string) => Promise<LayoutDefinition>;
}> | null = null;

function now(): number {
  return Date.now();
}

function cleanToken(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeViewport(
  layout: LayoutDefinition,
  viewport: Partial<{
    widthPx: number;
    heightPx: number;
    zoom: number;
  }> | null | undefined
): {
  widthPx: number;
  heightPx: number;
  zoom: number;
} {
  const widthPx = Number.isFinite(Number(viewport?.widthPx))
    ? Math.max(320, Number(viewport?.widthPx))
    : Math.max(320, layout.canvas.width);
  const heightPx = Number.isFinite(Number(viewport?.heightPx))
    ? Math.max(240, Number(viewport?.heightPx))
    : Math.max(240, layout.canvas.height);
  const zoomRaw = Number(viewport?.zoom);
  const zoom = Number.isFinite(zoomRaw) ? Math.max(0.5, Math.min(2, zoomRaw)) : 1;
  return {
    widthPx,
    heightPx,
    zoom
  };
}

function sessionWorkspaceId(request: RuntimeOpenRequest): string {
  const requested = cleanToken(request.workspaceId);
  return requested || "default";
}

function resolveDependencies(overrides?: RuntimeSessionDependencies): RuntimeSessionResolvedDependencies {
  return {
    loadLayoutByRouteToken: async (routeToken: string, workspaceId?: string) => {
      if (!layoutStorageModulePromise) {
        layoutStorageModulePromise = import("../layout-storage.ts").then((module) => ({
          loadLayoutByRouteToken: module.loadLayoutByRouteToken
        }));
      }
      const loaded = await layoutStorageModulePromise;
      return loaded.loadLayoutByRouteToken(routeToken, workspaceId);
    },
    getRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    runScript,
    ...overrides
  };
}

async function loadRuntimeLayout(
  request: RuntimeOpenRequest,
  dependencies: RuntimeSessionResolvedDependencies
): Promise<LayoutDefinition> {
  const requestedLayout = cleanToken(request.layoutId) || cleanToken(request.layoutName) || DEFAULT_ACTIVE_LAYOUT_NAME;
  return dependencies.loadLayoutByRouteToken(requestedLayout, sessionWorkspaceId(request));
}

function sessionRecord(sessionToken: string): RuntimeSessionRecord {
  const token = cleanToken(sessionToken);
  if (!token || !sessionStore.has(token)) {
    throw new Error("Runtime session not found");
  }
  const record = sessionStore.get(token);
  if (!record) {
    throw new Error("Runtime session not found");
  }
  record.session.lastAccessedAt = now();
  return record;
}

function pruneExpiredSessions(): void {
  const cutoff = now() - SESSION_TTL_MS;
  for (const [token, record] of sessionStore.entries()) {
    if (record.session.lastAccessedAt >= cutoff) {
      continue;
    }
    if (record.modCheckTimer) {
      clearInterval(record.modCheckTimer);
    }
    sessionStore.delete(token);
  }
}

function enqueuePatch(record: RuntimeSessionRecord, operations: RuntimePatchOperation[]): RuntimePatchSet {
  const patch: RuntimePatchSet = {
    sessionToken: record.session.token,
    serverSeq: record.session.lastServerSeq + 1,
    timestamp: now(),
    operations
  };
  record.session.lastServerSeq = patch.serverSeq;
  record.session.patches.push(patch);
  if (record.session.patches.length > PATCH_HISTORY_LIMIT) {
    record.session.patches.splice(0, record.session.patches.length - PATCH_HISTORY_LIMIT);
  }
  record.emitter.emit("patch", patch);
  return patch;
}

function patchSetSince(record: RuntimeSessionRecord, lastServerSeq: number): RuntimePatchSet[] {
  return record.session.patches.filter((patch) => patch.serverSeq > lastServerSeq);
}

function renderAndPatch(record: RuntimeSessionRecord): RuntimePatchSet {
  const tree = buildRenderTree(record.session);
  return enqueuePatch(record, [
    {
      type: "replaceRenderTree",
      renderTree: tree
    },
    {
      type: "setRecordDirty",
      dirty: record.session.recordDirty
    }
  ]);
}

function bindingForObject(session: RuntimeSession, objectId: string): RuntimeObjectBinding | null {
  return session.objectBindings.get(objectId) ?? null;
}

function nextTabObjectId(session: RuntimeSession, currentObjectId: string, reverse = false): string | null {
  if (session.tabOrderObjectIds.length === 0) {
    return null;
  }
  const currentIndex = session.tabOrderObjectIds.indexOf(currentObjectId);
  if (currentIndex < 0) {
    return reverse
      ? session.tabOrderObjectIds[session.tabOrderObjectIds.length - 1] ?? null
      : session.tabOrderObjectIds[0] ?? null;
  }
  if (reverse) {
    const next = currentIndex - 1;
    if (next < 0) {
      return session.tabOrderObjectIds[session.tabOrderObjectIds.length - 1] ?? null;
    }
    return session.tabOrderObjectIds[next] ?? null;
  }
  const next = currentIndex + 1;
  if (next >= session.tabOrderObjectIds.length) {
    return session.tabOrderObjectIds[0] ?? null;
  }
  return session.tabOrderObjectIds[next] ?? null;
}

function fieldBufferKey(binding: RuntimeObjectBinding): string {
  if (binding.kind === "portalField") {
    return `portal:${binding.portalComponentId}:${binding.rowRecordId}:${binding.fieldName}`;
  }
  if (binding.kind === "layoutField") {
    return `field:${binding.fieldName}`;
  }
  return `object:${binding.objectId}`;
}

function componentForObjectId(session: RuntimeSession, objectId: string): LayoutComponent | null {
  const componentId = session.objectMap.objectIdToComponentId[objectId];
  if (!componentId) {
    return null;
  }
  return session.layout.components.find((component) => component.id === componentId) ?? null;
}

function componentForBinding(session: RuntimeSession, binding: RuntimeObjectBinding): LayoutComponent | null {
  if (binding.kind === "layoutField" || binding.kind === "button") {
    return componentForObjectId(session, binding.objectId);
  }
  if (binding.kind === "portalField") {
    return session.layout.components.find((component) => component.id === binding.portalComponentId) ?? null;
  }
  return null;
}

function isEmptyValue(value: unknown): boolean {
  if (value == null) {
    return true;
  }
  if (typeof value === "string") {
    return value.trim().length === 0;
  }
  return false;
}

function componentExpectsNumber(component: LayoutComponent): boolean {
  const dataFormat = cleanToken(component.props.dataFormat).toLowerCase();
  return dataFormat.includes("number") || dataFormat.includes("numeric");
}

function componentExpectsDate(component: LayoutComponent): boolean {
  const dataFormat = cleanToken(component.props.dataFormat).toLowerCase();
  const controlType = cleanToken(component.props.controlType).toLowerCase();
  return controlType === "date" || dataFormat.includes("date");
}

function componentExpectsTime(component: LayoutComponent): boolean {
  const dataFormat = cleanToken(component.props.dataFormat).toLowerCase();
  return dataFormat.includes("time");
}

function validateFieldValue(component: LayoutComponent, fieldName: string, value: unknown): FieldValidationResult {
  if (component.props.validationRequired === true && isEmptyValue(value)) {
    return {
      ok: false,
      message: cleanToken(component.props.validationMessage) || `${fieldName} is required.`
    };
  }

  const raw = typeof value === "string" ? value.trim() : String(value ?? "").trim();
  if (!raw) {
    return { ok: true };
  }

  if (componentExpectsNumber(component)) {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      return {
        ok: false,
        message: `${fieldName} must be a number.`
      };
    }
    if (component.props.validationRangeMin != null) {
      const min = Number(component.props.validationRangeMin);
      if (Number.isFinite(min) && parsed < min) {
        return {
          ok: false,
          message: `${fieldName} must be at least ${min}.`
        };
      }
    }
    if (component.props.validationRangeMax != null) {
      const max = Number(component.props.validationRangeMax);
      if (Number.isFinite(max) && parsed > max) {
        return {
          ok: false,
          message: `${fieldName} must be at most ${max}.`
        };
      }
    }
  }

  if (componentExpectsDate(component)) {
    const parsed = Date.parse(raw);
    if (Number.isNaN(parsed)) {
      return {
        ok: false,
        message: `${fieldName} must be a valid date.`
      };
    }
  }

  if (componentExpectsTime(component)) {
    const valid = /^\d{1,2}:\d{2}(:\d{2})?(\s?(AM|PM))?$/i.test(raw);
    if (!valid) {
      return {
        ok: false,
        message: `${fieldName} must be a valid time.`
      };
    }
  }

  return { ok: true };
}

function firstValidationFailure(session: RuntimeSession): { objectId: string; message: string } | null {
  for (const binding of session.objectBindings.values()) {
    if (binding.kind !== "layoutField" && binding.kind !== "portalField") {
      continue;
    }
    const key = fieldBufferKey(binding);
    if (!session.fieldBuffer.has(key)) {
      continue;
    }
    const value = session.fieldBuffer.get(key);
    const component = componentForBinding(session, binding);
    if (!component) {
      continue;
    }
    const fieldName = binding.kind === "layoutField" ? binding.fieldName : binding.fieldName;
    const validation = validateFieldValue(component, fieldName, value);
    if (!validation.ok) {
      return {
        objectId: binding.objectId,
        message: validation.message
      };
    }
  }
  return null;
}

function setBufferedField(record: RuntimeSessionRecord, objectId: string, value: unknown): RuntimePatchSet {
  const binding = bindingForObject(record.session, objectId);
  if (!binding || (binding.kind !== "layoutField" && binding.kind !== "portalField")) {
    return enqueuePatch(record, [
      {
        type: "setError",
        objectId,
        message: "Object is not an editable field."
      }
    ]);
  }
  const key = fieldBufferKey(binding);
  record.session.fieldBuffer.set(key, value);
  record.session.recordDirty = true;
  return enqueuePatch(record, [
    {
      type: "updateFieldValue",
      objectId,
      value
    },
    {
      type: "setRecordDirty",
      dirty: true
    }
  ]);
}

function setFocus(record: RuntimeSessionRecord, objectId: string): RuntimePatchSet {
  record.session.focusedObjectId = objectId;
  return enqueuePatch(record, [
    {
      type: "setFocus",
      objectId
    }
  ]);
}

function revertEdits(record: RuntimeSessionRecord): RuntimePatchSet {
  record.session.fieldBuffer.clear();
  record.session.recordDirty = false;
  return renderAndPatch(record);
}

function collectBufferedLayoutFields(session: RuntimeSession): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of session.fieldBuffer.entries()) {
    if (!key.startsWith("field:")) {
      continue;
    }
    payload[key.slice("field:".length)] = value;
  }
  return payload;
}

function collectBufferedPortalFields(session: RuntimeSession): Map<string, { tableOccurrence: string; fieldData: Record<string, unknown> }> {
  const grouped = new Map<string, { tableOccurrence: string; fieldData: Record<string, unknown> }>();
  for (const [key, value] of session.fieldBuffer.entries()) {
    if (!key.startsWith("portal:")) {
      continue;
    }
    const [, portalComponentId, rowRecordId, fieldName] = key.split(":");
    const binding = [...session.objectBindings.values()].find(
      (entry) =>
        entry.kind === "portalField" &&
        entry.portalComponentId === portalComponentId &&
        entry.rowRecordId === rowRecordId &&
        entry.fieldName === fieldName
    );
    if (!binding || binding.kind !== "portalField") {
      continue;
    }
    const groupKey = `${binding.portalComponentId}:${binding.rowRecordId}`;
    const existing = grouped.get(groupKey) ?? {
      tableOccurrence: binding.tableOccurrence,
      fieldData: {}
    };
    existing.fieldData[binding.fieldName] = value;
    grouped.set(groupKey, existing);
  }
  return grouped;
}

async function commitEdits(record: RuntimeSessionRecord): Promise<RuntimePatchSet> {
  const session = record.session;
  const dependencies = record.dependencies;
  if (session.fieldBuffer.size === 0) {
    session.recordDirty = false;
    return enqueuePatch(record, [
      {
        type: "setRecordDirty",
        dirty: false
      },
      {
        type: "setStatusMessage",
        message: "No staged edits to commit."
      }
    ]);
  }

  const validationFailure = firstValidationFailure(session);
  if (validationFailure) {
    return enqueuePatch(record, [
      {
        type: "setError",
        objectId: validationFailure.objectId,
        message: validationFailure.message
      },
      {
        type: "setStatusMessage",
        message: validationFailure.message
      }
    ]);
  }

  const layoutFields = collectBufferedLayoutFields(session);
  const portalFields = collectBufferedPortalFields(session);
  const currentRecord = session.records[session.currentRecordIndex] ?? {};
  const tableOccurrence = session.layout.defaultTableOccurrence;
  const recordId = cleanToken(currentRecord.recordId);

  try {
    if (recordId && Object.keys(layoutFields).length > 0) {
      await dependencies.updateRecord(tableOccurrence, recordId, layoutFields, {
        workspaceId: session.workspaceId,
        layoutName: session.layout.name,
        tableOccurrence
      });
    }

    for (const [groupKey, payload] of portalFields.entries()) {
      const segments = groupKey.split(":");
      const rowRecordId = segments[1] ?? "";
      if (rowRecordId === "__new__") {
        await dependencies.createRecord(payload.tableOccurrence, payload.fieldData, {
          workspaceId: session.workspaceId,
          layoutName: payload.tableOccurrence,
          tableOccurrence: payload.tableOccurrence
        });
      } else {
        await dependencies.updateRecord(payload.tableOccurrence, rowRecordId, payload.fieldData, {
          workspaceId: session.workspaceId,
          layoutName: payload.tableOccurrence,
          tableOccurrence: payload.tableOccurrence
        });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Commit failed";
    return enqueuePatch(record, [
      {
        type: "setError",
        message
      }
    ]);
  }

  session.fieldBuffer.clear();
  session.recordDirty = false;
  session.records = await dependencies.getRecords({
    tableOccurrence: session.layout.defaultTableOccurrence,
    workspaceId: session.workspaceId,
    layoutName: session.layout.name,
    limit: 200
  });
  if (session.records.length > 0) {
    session.currentRecordIndex = Math.min(session.currentRecordIndex, session.records.length - 1);
  } else {
    session.currentRecordIndex = 0;
  }
  return renderAndPatch(record);
}

async function switchLayout(record: RuntimeSessionRecord, layoutToken: string): Promise<RuntimePatchSet> {
  const nextLayout = await record.dependencies.loadLayoutByRouteToken(layoutToken, record.session.workspaceId);
  record.session.layout = nextLayout;
  record.session.objectMap = buildDeterministicObjectMap(nextLayout);
  record.session.tabOrderObjectIds = buildTabOrderObjectIds(record.session);
  record.session.records = await record.dependencies.getRecords({
    tableOccurrence: nextLayout.defaultTableOccurrence,
    workspaceId: record.session.workspaceId,
    layoutName: nextLayout.name,
    limit: 200
  });
  record.session.currentRecordIndex = 0;
  record.session.fieldBuffer.clear();
  record.session.recordDirty = false;
  const tree = buildRenderTree(record.session);
  return enqueuePatch(record, [
    {
      type: "navigate",
      layoutId: nextLayout.id,
      layoutName: nextLayout.name,
      mode: record.session.mode
    },
    {
      type: "replaceRenderTree",
      renderTree: tree
    },
    {
      type: "setRecordDirty",
      dirty: false
    }
  ]);
}

async function applyButtonClick(record: RuntimeSessionRecord, objectId: string): Promise<RuntimePatchSet> {
  const binding = bindingForObject(record.session, objectId);
  if (!binding || binding.kind !== "button") {
    return enqueuePatch(record, [
      {
        type: "setStatusMessage",
        message: "No action bound to this object."
      }
    ]);
  }

  if (binding.action === "goToLayout" && cleanToken(binding.layoutName)) {
    return switchLayout(record, cleanToken(binding.layoutName));
  }

  if (binding.action === "runScript" && cleanToken(binding.script)) {
    try {
      await record.dependencies.runScript(
        record.session.layout.defaultTableOccurrence,
        cleanToken(binding.script),
        cleanToken(binding.parameter),
        {
          workspaceId: record.session.workspaceId,
          layoutName: record.session.layout.name,
          tableOccurrence: record.session.layout.defaultTableOccurrence
        }
      );
      return enqueuePatch(record, [
        {
          type: "showDialog",
          dialog: {
            title: "Script Complete",
            message: `Ran script: ${cleanToken(binding.script)}`,
            level: "info"
          }
        }
      ]);
    } catch (error) {
      return enqueuePatch(record, [
        {
          type: "setError",
          objectId,
          message: error instanceof Error ? error.message : "Script failed"
        }
      ]);
    }
  }

  if (binding.action === "deletePortalRow") {
    const focused = record.session.focusedObjectId ?? "";
    const portalBinding = focused ? bindingForObject(record.session, focused) : null;
    if (portalBinding && portalBinding.kind === "portalField" && portalBinding.rowRecordId !== "__new__") {
      try {
        await record.dependencies.deleteRecord(portalBinding.tableOccurrence, portalBinding.rowRecordId, {
          workspaceId: record.session.workspaceId,
          layoutName: portalBinding.tableOccurrence,
          tableOccurrence: portalBinding.tableOccurrence
        });
        record.session.records = await record.dependencies.getRecords({
          tableOccurrence: record.session.layout.defaultTableOccurrence,
          workspaceId: record.session.workspaceId,
          layoutName: record.session.layout.name,
          limit: 200
        });
        return renderAndPatch(record);
      } catch (error) {
        return enqueuePatch(record, [
          {
            type: "setError",
            objectId,
            message: error instanceof Error ? error.message : "Delete portal row failed"
          }
        ]);
      }
    }
    return enqueuePatch(record, [
      {
        type: "setError",
        objectId,
        message: "Select a portal row before deleting."
      }
    ]);
  }

  return enqueuePatch(record, [
    {
      type: "setStatusMessage",
      message: "Button action not implemented for this object."
    }
  ]);
}

async function processEvent(record: RuntimeSessionRecord, event: RuntimeClientEvent): Promise<RuntimePatchSet> {
  const session = record.session;
  session.lastClientSeq = Math.max(session.lastClientSeq, Math.max(0, Math.round(event.clientSeq || 0)));
  if (event.eventType === "focus") {
    return setFocus(record, event.objectId);
  }

  if (event.eventType === "blur") {
    const shouldCommit = Boolean(event.payload?.commitOnBlur);
    if (shouldCommit && session.recordDirty) {
      return commitEdits(record);
    }
    return enqueuePatch(record, []);
  }

  if (event.eventType === "input") {
    return setBufferedField(record, event.objectId, event.payload?.value ?? "");
  }

  if (event.eventType === "click") {
    return applyButtonClick(record, event.objectId);
  }

  if (event.eventType === "commit") {
    return commitEdits(record);
  }

  if (event.eventType === "navigate") {
    if (session.recordDirty) {
      await commitEdits(record);
    }
    const targetLayout = cleanToken(event.payload?.layoutId ?? event.payload?.layoutName);
    if (!targetLayout) {
      return enqueuePatch(record, [
        {
          type: "setError",
          message: "Missing target layout for navigation event."
        }
      ]);
    }
    return switchLayout(record, targetLayout);
  }

  if (event.eventType === "keydown") {
    const key = cleanToken(event.payload?.key).toLowerCase();
    if (key === "tab") {
      const reverse = Boolean(event.payload?.shiftKey);
      const nextId = nextTabObjectId(session, event.objectId, reverse);
      if (!nextId) {
        return enqueuePatch(record, []);
      }
      return setFocus(record, nextId);
    }
    if (key === "escape") {
      return revertEdits(record);
    }
    if (key === "enter" && Boolean(event.payload?.commitOnEnter)) {
      return commitEdits(record);
    }
    return enqueuePatch(record, []);
  }

  if (event.eventType === "portalScroll") {
    const offsetRaw = Number.parseInt(String(event.payload?.offset ?? "0"), 10);
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;
    session.portalOffsets.set(event.objectId, offset);
    return renderAndPatch(record);
  }

  if (event.eventType === "viewport") {
    const nextViewport = normalizeViewport(session.layout, {
      widthPx: Number(event.payload?.widthPx),
      heightPx: Number(event.payload?.heightPx),
      zoom: Number(event.payload?.zoom)
    });
    const previous = session.viewport;
    if (
      previous.widthPx === nextViewport.widthPx &&
      previous.heightPx === nextViewport.heightPx &&
      previous.zoom === nextViewport.zoom
    ) {
      return enqueuePatch(record, []);
    }
    session.viewport = nextViewport;
    return renderAndPatch(record);
  }

  return enqueuePatch(record, []);
}

function startBackgroundRecordMonitor(record: RuntimeSessionRecord): void {
  if (record.modCheckTimer) {
    clearInterval(record.modCheckTimer);
  }
  record.modCheckTimer = setInterval(async () => {
    try {
      const session = record.session;
      if (session.records.length === 0) {
        return;
      }
      const existing = session.records[session.currentRecordIndex] ?? {};
      const existingModId = cleanToken(existing.modId);
      const refreshed = await record.dependencies.getRecords({
        tableOccurrence: session.layout.defaultTableOccurrence,
        workspaceId: session.workspaceId,
        layoutName: session.layout.name,
        limit: 1,
        offset: session.currentRecordIndex + 1
      });
      const next = refreshed[0] as Record<string, unknown> | undefined;
      if (!next) {
        return;
      }
      const refreshedModId = cleanToken(next.modId);
      if (!existingModId || !refreshedModId || existingModId === refreshedModId) {
        return;
      }
      session.records[session.currentRecordIndex] = next;
      renderAndPatch(record);
    } catch {
      // Background monitor failures should not crash runtime sessions.
    }
  }, BACKGROUND_MOD_CHECK_MS);
  record.modCheckTimer.unref?.();
}

export async function openRuntimeSession(
  request: RuntimeOpenRequest,
  dependencyOverrides?: RuntimeSessionDependencies
): Promise<RuntimeOpenResponse> {
  pruneExpiredSessions();
  const dependencies = resolveDependencies(dependencyOverrides);
  const workspaceId = sessionWorkspaceId(request);
  const layout = await loadRuntimeLayout(request, dependencies);
  const records = await dependencies.getRecords({
    tableOccurrence: layout.defaultTableOccurrence,
    workspaceId,
    layoutName: layout.name,
    limit: 200
  });
  const objectMap = buildDeterministicObjectMap(layout);
  const session: RuntimeSession = {
    token: randomUUID(),
    workspaceId,
    mode: request.mode ?? "browse",
    layout,
    objectMap,
    objectBindings: new Map(),
    tabOrderObjectIds: [],
    records: records.map((record) => asFMRecord(record as Record<string, unknown>)),
    currentRecordIndex: 0,
    focusedObjectId: null,
    recordDirty: false,
    fieldBuffer: new Map(),
    lastClientSeq: 0,
    lastServerSeq: 0,
    createdAt: now(),
    lastAccessedAt: now(),
    patches: [],
    portalOffsets: new Map(),
    viewport: normalizeViewport(layout, request.viewport),
    geometryBaselineCache: createGeometryBaselineCache()
  };
  const emitter = new EventEmitter();
  emitter.setMaxListeners(50);
  const record = {
    session,
    emitter,
    modCheckTimer: null,
    dependencies
  } satisfies RuntimeSessionRecord;
  session.tabOrderObjectIds = buildTabOrderObjectIds(session);
  const tree = buildRenderTree(session);
  const initialPatch = enqueuePatch(record, [
    {
      type: "replaceRenderTree",
      renderTree: tree
    }
  ]);
  sessionStore.set(session.token, record);
  startBackgroundRecordMonitor(record);
  return {
    sessionToken: session.token,
    serverSeq: initialPatch.serverSeq,
    mode: session.mode,
    layout: {
      id: layout.id,
      name: layout.name,
      defaultTableOccurrence: layout.defaultTableOccurrence
    },
    viewport: session.viewport,
    renderTree: tree,
    recordDirty: false
  };
}

export async function sendRuntimeEvent(sessionToken: string, event: RuntimeClientEvent): Promise<RuntimePatchSet> {
  const record = sessionRecord(sessionToken);
  return processEvent(record, event);
}

export async function pollRuntimeSession(
  sessionToken: string,
  lastServerSeq: number
): Promise<{ patchSets: RuntimePatchSet[]; timeout: boolean }> {
  const record = sessionRecord(sessionToken);
  const immediate = patchSetSince(record, Math.max(0, lastServerSeq));
  if (immediate.length > 0) {
    return {
      patchSets: immediate,
      timeout: false
    };
  }

  return new Promise((resolve) => {
    let settled = false;
    const onPatch = () => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      record.emitter.off("patch", onPatch);
      resolve({
        patchSets: patchSetSince(record, Math.max(0, lastServerSeq)),
        timeout: false
      });
    };
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      record.emitter.off("patch", onPatch);
      resolve({
        patchSets: [],
        timeout: true
      });
    }, POLL_TIMEOUT_MS);
    record.emitter.on("patch", onPatch);
  });
}

export function subscribeRuntimeSession(
  sessionToken: string,
  onPatch: (patchSet: RuntimePatchSet) => void
): () => void {
  const record = sessionRecord(sessionToken);
  const handler = (patchSet: RuntimePatchSet) => {
    onPatch(patchSet);
  };
  record.emitter.on("patch", handler);
  return () => {
    record.emitter.off("patch", handler);
  };
}

export function getRuntimeSessionSnapshot(sessionToken: string): RuntimeSession | null {
  const token = cleanToken(sessionToken);
  const record = token ? sessionStore.get(token) : undefined;
  return record?.session ?? null;
}

export function getRuntimePatchHistorySince(sessionToken: string, lastServerSeq: number): RuntimePatchSet[] {
  const token = cleanToken(sessionToken);
  const record = token ? sessionStore.get(token) : undefined;
  if (!record) {
    return [];
  }
  return patchSetSince(record, Math.max(0, lastServerSeq));
}

export function getRuntimeRenderTree(sessionToken: string): RuntimeRenderTreeNode | null {
  const record = getRuntimeSessionSnapshot(sessionToken);
  if (!record) {
    return null;
  }
  return buildRenderTree(record);
}

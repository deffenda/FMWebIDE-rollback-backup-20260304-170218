import { evaluateFMCalcBoolean } from "../fmcalc/index.ts";
import {
  commitTransactionBuffer,
  createTransactionBuffer,
  revertTransactionBuffer,
  stageFieldOperation,
  type ScriptTransactionBuffer
} from "./transaction-manager.ts";
import type {
  RuntimeContextFrame,
  RuntimeMode,
  RuntimeVariableValue,
  ScriptDefinition,
  ScriptEngineResult,
  ScriptEngineRunState,
  ScriptFrameState,
  ScriptStep,
  ScriptStepTraceEntry
} from "./types";

export type ScriptVariableApi = {
  set: (name: string, value: RuntimeVariableValue, frameId?: string) => void;
  get: (name: string, frameId?: string) => RuntimeVariableValue | undefined;
  clearFrame: (frameId: string) => void;
};

export type ScriptRuntimeActions = {
  goToLayout: (layoutName: string) => Promise<void> | void;
  goToRelatedRecord?: (input: {
    tableOccurrence?: string;
    layoutName?: string;
    showOnlyRelated?: boolean;
  }) => Promise<{ ok: boolean; lastError?: number; lastMessage?: string }>;
  goToRecord: (target: { mode?: "first" | "prev" | "next" | "last"; index?: number; recordId?: string }) => Promise<void> | void;
  enterMode: (mode: RuntimeMode) => Promise<void> | void;
  performFind: (criteria?: Record<string, string>) => Promise<void> | void;
  showAllRecords?: () => Promise<{ ok: boolean; lastError?: number; lastMessage?: string }>;
  omitRecord?: () => Promise<{ ok: boolean; lastError?: number; lastMessage?: string }>;
  showOmittedOnly?: () => Promise<{ ok: boolean; lastError?: number; lastMessage?: string }>;
  showCustomDialog: (input: {
    title?: string;
    message?: string;
    defaultInput?: string;
  }) => Promise<{ button: number; inputValue?: string }>;
  pauseScript: (durationMs: number) => Promise<void>;
  setField: (fieldName: string, value: RuntimeVariableValue) => Promise<{ ok: boolean; lastError?: number; lastMessage?: string }>;
  commit: () => Promise<{ ok: boolean; lastError?: number; lastMessage?: string }>;
  revert: () => Promise<{ ok: boolean; lastError?: number; lastMessage?: string }>;
  newRecord: () => Promise<{ ok: boolean; recordId?: string; lastError?: number; lastMessage?: string }>;
  deleteRecord: () => Promise<{ ok: boolean; lastError?: number; lastMessage?: string }>;
  openRecord: (recordId: string) => Promise<{ ok: boolean; lastError?: number; lastMessage?: string }>;
  refreshWindow: () => Promise<void>;
  replaceFieldContents?: (fieldName: string, value: RuntimeVariableValue) => Promise<{ ok: boolean; lastError?: number; lastMessage?: string }>;
  beginTransaction?: () => Promise<{ ok: boolean; lastError?: number; lastMessage?: string }>;
  commitTransaction?: () => Promise<{ ok: boolean; lastError?: number; lastMessage?: string }>;
  revertTransaction?: () => Promise<{ ok: boolean; lastError?: number; lastMessage?: string }>;
  performScriptOnServer: (
    scriptName: string,
    parameter?: string
  ) => Promise<{ ok: boolean; lastError?: number; lastMessage?: string }>;
};

export type ScriptEngineAdapter = {
  now?: () => number;
  resolveCurrentContext: () => RuntimeContextFrame | undefined;
  resolveFieldValue: (fieldName: string) => RuntimeVariableValue | Promise<RuntimeVariableValue>;
  actions: ScriptRuntimeActions;
  variables: ScriptVariableApi;
  onState?: (state: ScriptEngineRunState) => void;
  onTrace?: (entry: ScriptStepTraceEntry) => void;
  onTransactionState?: (state: ScriptEngineRunState["transaction"]) => void;
  stepMode?: boolean;
  awaitStep?: (entry: ScriptStepTraceEntry) => Promise<void>;
  implicitTransaction?: boolean;
  maxCallDepth?: number;
  executeCustomStep?: (
    input: ScriptCustomStepExecutionInput
  ) => Promise<ScriptCustomStepExecutionResult | undefined> | ScriptCustomStepExecutionResult | undefined;
};

export type ScriptCustomStepExecutionInput = {
  step: ScriptStep;
  scriptName: string;
  frameId: string;
  scriptParameter?: string;
  runtimeContext?: RuntimeContextFrame;
  resolveValue: (raw: unknown) => Promise<RuntimeVariableValue>;
  getVariable: (name: string) => RuntimeVariableValue | undefined;
  setVariable: (name: string, value: RuntimeVariableValue) => void;
  transactionActive: boolean;
  stageTransactionField: (fieldName: string, value: RuntimeVariableValue) => void;
  actions: {
    goToLayout: ScriptRuntimeActions["goToLayout"];
    goToRecord: ScriptRuntimeActions["goToRecord"];
    enterMode: ScriptRuntimeActions["enterMode"];
    performFind: ScriptRuntimeActions["performFind"];
    setField: ScriptRuntimeActions["setField"];
    commit: ScriptRuntimeActions["commit"];
    revert: ScriptRuntimeActions["revert"];
    showCustomDialog: ScriptRuntimeActions["showCustomDialog"];
    performScriptOnServer: ScriptRuntimeActions["performScriptOnServer"];
  };
};

export type ScriptCustomStepExecutionResult = {
  handled: boolean;
  ok?: boolean;
  lastError?: number;
  lastMessage?: string;
  exitScriptWith?: RuntimeVariableValue;
};

export type RunScriptOptions = {
  scriptName: string;
  scriptsByName: Record<string, ScriptDefinition>;
  parameter?: string;
};

type IfFrame = {
  parentExecute: boolean;
  currentExecute: boolean;
  branchTaken: boolean;
};

function shouldExecuteStep(ifStack: IfFrame[]): boolean {
  return ifStack.every((entry) => entry.currentExecute);
}

function normalizeScriptLookupKey(value: string): string {
  return value.trim().toLowerCase();
}

function parseNumber(value: unknown): number | undefined {
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function createRunId(): string {
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createFrameId(): string {
  return `frame-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function resolveLoopBoundaries(steps: ScriptStep[]): {
  loopStartToEnd: Map<number, number>;
  loopEndToStart: Map<number, number>;
} {
  const starts: number[] = [];
  const loopStartToEnd = new Map<number, number>();
  const loopEndToStart = new Map<number, number>();
  for (let index = 0; index < steps.length; index += 1) {
    const stepType = stepTypeFromName(steps[index]);
    if (stepType === "Loop") {
      starts.push(index);
      continue;
    }
    if (stepType === "End Loop") {
      const start = starts.pop();
      if (start !== undefined) {
        loopStartToEnd.set(start, index);
        loopEndToStart.set(index, start);
      }
    }
  }
  return {
    loopStartToEnd,
    loopEndToStart
  };
}

function stepTypeFromName(step: ScriptStep): string {
  const token = step.type.trim();
  if (token) {
    return token;
  }
  return "Comment";
}

async function resolveStepValue(
  raw: unknown,
  input: {
    adapter: ScriptEngineAdapter;
    frameId: string;
    scriptParameter?: string;
    getLastError?: () => number;
    getLastMessage?: () => string | undefined;
  }
): Promise<RuntimeVariableValue> {
  if (typeof raw !== "string") {
    return raw as RuntimeVariableValue;
  }

  const token = raw.trim();
  if (!token) {
    return "";
  }

  if (token === "Get(ScriptParameter)" || token === "Get ( ScriptParameter )") {
    return input.scriptParameter ?? "";
  }

  if (token === "Get(LastError)" || token === "Get ( LastError )") {
    return Number(input.getLastError?.() ?? 0);
  }

  if (token === "Get(LastMessage)" || token === "Get ( LastMessage )") {
    return String(input.getLastMessage?.() ?? "");
  }

  if ((token.startsWith("$$") || token.startsWith("$")) && !token.includes(" ")) {
    return input.adapter.variables.get(token, input.frameId) ?? "";
  }

  if (/^-?\d+(?:\.\d+)?$/.test(token)) {
    return Number(token);
  }

  if (/^(true|false)$/i.test(token)) {
    return token.toLowerCase() === "true";
  }

  const context = input.adapter.resolveCurrentContext();
  const boolResult = evaluateFMCalcBoolean(token, {
    currentTableOccurrence: context?.tableOccurrence,
    currentRecord: context?.recordId ? { recordId: context.recordId } : {}
  });
  if (boolResult.ok && (token.includes("=") || token.toLowerCase().startsWith("if") || token.toLowerCase().startsWith("case"))) {
    return boolResult.value;
  }

  return token;
}

async function executeStep(
  step: ScriptStep,
  input: {
    adapter: ScriptEngineAdapter;
    scriptName: string;
    frameId: string;
    scriptParameter?: string;
    setErrorCapture: (enabled: boolean) => void;
    getErrorCapture: () => boolean;
    setLastError: (error: number, message?: string) => void;
    getLastError: () => number;
    getLastMessage: () => string | undefined;
    isTransactionActive: () => boolean;
    stageTransactionField: (fieldName: string, value: RuntimeVariableValue, stepId: string) => void;
    commitTransaction: () => Promise<{ ok: boolean; lastError?: number; lastMessage?: string }>;
    revertTransaction: () => Promise<{ ok: boolean; lastError?: number; lastMessage?: string }>;
    beginTransaction: () => Promise<{ ok: boolean; lastError?: number; lastMessage?: string }>;
    runNestedScript: (scriptName: string, parameter?: string, depth?: number) => Promise<ScriptEngineResult>;
    exitWith: (result?: RuntimeVariableValue) => void;
  }
): Promise<void> {
  const type = stepTypeFromName(step);
  const params = step.params ?? {};
  const stepId = step.id || `${type}-step`;
  const resolveValue = async (raw: unknown) =>
    resolveStepValue(raw, {
      adapter: input.adapter,
      frameId: input.frameId,
      scriptParameter: input.scriptParameter,
      getLastError: input.getLastError,
      getLastMessage: input.getLastMessage
    });

  if (type === "Comment") {
    return;
  }

  if (type === "Begin Transaction") {
    const started = await input.beginTransaction();
    input.setLastError(started.ok ? 0 : Number(started.lastError ?? 1), started.lastMessage);
    return;
  }

  if (type === "Commit Transaction") {
    const committed = await input.commitTransaction();
    input.setLastError(committed.ok ? 0 : Number(committed.lastError ?? 1), committed.lastMessage);
    if (!committed.ok && !input.getErrorCapture()) {
      throw new Error(committed.lastMessage || "Commit transaction failed");
    }
    return;
  }

  if (type === "Revert Transaction") {
    const reverted = await input.revertTransaction();
    input.setLastError(reverted.ok ? 0 : Number(reverted.lastError ?? 1), reverted.lastMessage);
    if (!reverted.ok && !input.getErrorCapture()) {
      throw new Error(reverted.lastMessage || "Revert transaction failed");
    }
    return;
  }

  if (type === "Set Error Capture") {
    input.setErrorCapture(Boolean(params.on ?? params.enabled ?? true));
    input.setLastError(0, "");
    return;
  }

  if (type === "Set Variable" || type === "Set Variable By Name") {
    const name = String(params.name ?? params.variable ?? "").trim();
    if (!name) {
      input.setLastError(102, "Variable name missing");
      return;
    }
    const value = await resolveValue(params.value ?? params.expression ?? "");
    input.adapter.variables.set(name, value, input.frameId);
    input.setLastError(0, input.getLastMessage());
    return;
  }

  if (type === "Go to Layout") {
    const layoutName = String(params.layoutName ?? params.layout ?? "").trim();
    if (!layoutName) {
      input.setLastError(102, "Layout name missing");
      return;
    }
    await input.adapter.actions.goToLayout(layoutName);
    input.setLastError(0, "");
    return;
  }

  if (type === "Go to Related Record") {
    const action = input.adapter.actions.goToRelatedRecord;
    if (!action) {
      input.setLastError(1201, "Go to Related Record is unavailable in this runtime");
      if (!input.getErrorCapture()) {
        throw new Error("Go to Related Record is unavailable");
      }
      return;
    }
    const result = await action({
      tableOccurrence: String(params.tableOccurrence ?? params.relatedTableOccurrence ?? "").trim() || undefined,
      layoutName: String(params.layoutName ?? "").trim() || undefined,
      showOnlyRelated: Boolean(params.showOnlyRelated ?? true)
    });
    input.setLastError(result.ok ? 0 : Number(result.lastError ?? 1), result.lastMessage);
    if (!result.ok && !input.getErrorCapture()) {
      throw new Error(result.lastMessage || "Go to Related Record failed");
    }
    return;
  }

  if (type === "Go to Record/Request/Page") {
    const modeToken = String(params.mode ?? "").trim().toLowerCase();
    const mode =
      modeToken === "first" || modeToken === "prev" || modeToken === "next" || modeToken === "last"
        ? modeToken
        : undefined;
    const index = parseNumber(params.index);
    const recordId = String(params.recordId ?? "").trim() || undefined;
    await input.adapter.actions.goToRecord({
      mode,
      index,
      recordId
    });
    input.setLastError(0, "");
    return;
  }

  if (type === "Enter Browse Mode") {
    await input.adapter.actions.enterMode("browse");
    input.setLastError(0, "");
    return;
  }

  if (type === "Enter Preview Mode") {
    await input.adapter.actions.enterMode("preview");
    input.setLastError(0, "");
    return;
  }

  if (type === "Enter Find Mode") {
    await input.adapter.actions.enterMode("find");
    input.setLastError(0, "");
    return;
  }

  if (type === "Perform Find") {
    const criteria = params.criteria && typeof params.criteria === "object" ? (params.criteria as Record<string, string>) : undefined;
    await input.adapter.actions.performFind(criteria);
    input.setLastError(0, "");
    return;
  }

  if (type === "Show All Records") {
    const action = input.adapter.actions.showAllRecords;
    if (!action) {
      input.setLastError(1201, "Show All Records is unavailable in this runtime");
      if (!input.getErrorCapture()) {
        throw new Error("Show All Records is unavailable");
      }
      return;
    }
    const result = await action();
    input.setLastError(result.ok ? 0 : Number(result.lastError ?? 1), result.lastMessage);
    if (!result.ok && !input.getErrorCapture()) {
      throw new Error(result.lastMessage || "Show All Records failed");
    }
    return;
  }

  if (type === "Omit Record") {
    const action = input.adapter.actions.omitRecord;
    if (!action) {
      input.setLastError(1201, "Omit Record is unavailable in this runtime");
      if (!input.getErrorCapture()) {
        throw new Error("Omit Record is unavailable");
      }
      return;
    }
    const result = await action();
    input.setLastError(result.ok ? 0 : Number(result.lastError ?? 1), result.lastMessage);
    if (!result.ok && !input.getErrorCapture()) {
      throw new Error(result.lastMessage || "Omit Record failed");
    }
    return;
  }

  if (type === "Show Omitted Only") {
    const action = input.adapter.actions.showOmittedOnly;
    if (!action) {
      input.setLastError(1201, "Show Omitted Only is unavailable in this runtime");
      if (!input.getErrorCapture()) {
        throw new Error("Show Omitted Only is unavailable");
      }
      return;
    }
    const result = await action();
    input.setLastError(result.ok ? 0 : Number(result.lastError ?? 1), result.lastMessage);
    if (!result.ok && !input.getErrorCapture()) {
      throw new Error(result.lastMessage || "Show Omitted Only failed");
    }
    return;
  }

  if (type === "Show Custom Dialog") {
    const result = await input.adapter.actions.showCustomDialog({
      title: String(params.title ?? "").trim() || undefined,
      message: String(params.message ?? "").trim() || undefined,
      defaultInput: String(params.defaultInput ?? "").trim() || undefined
    });
    input.adapter.variables.set("$LAST_DIALOG_CHOICE", result.button, input.frameId);
    if (typeof result.inputValue === "string") {
      input.adapter.variables.set("$LAST_DIALOG_INPUT", result.inputValue, input.frameId);
    }
    input.setLastError(0, "");
    return;
  }

  if (type === "Pause/Resume Script") {
    const durationMs = Math.max(0, Math.round(Number(params.durationMs ?? params.duration ?? 0) || 0));
    await input.adapter.actions.pauseScript(durationMs);
    input.setLastError(0, "");
    return;
  }

  if (type === "Set Field" || type === "Set Field By Name") {
    const fieldName = String(params.fieldName ?? params.field ?? "").trim();
    if (!fieldName) {
      input.setLastError(102, "Field name missing");
      return;
    }
    const value = await resolveValue(params.value ?? "");
    if (input.isTransactionActive()) {
      input.stageTransactionField(fieldName, value, stepId);
      input.setLastError(0, "");
      return;
    }
    const result = await input.adapter.actions.setField(fieldName, value);
    input.setLastError(result.ok ? 0 : Number(result.lastError ?? 1), result.lastMessage);
    if (!result.ok && !input.getErrorCapture()) {
      throw new Error(result.lastMessage || `Set Field failed: ${fieldName}`);
    }
    return;
  }

  if (type === "Replace Field Contents") {
    const fieldName = String(params.fieldName ?? params.field ?? "").trim();
    if (!fieldName) {
      input.setLastError(102, "Field name missing");
      return;
    }
    const value = await resolveValue(params.value ?? params.replacement ?? "");
    if (input.isTransactionActive()) {
      input.stageTransactionField(fieldName, value, stepId);
      input.setLastError(0, "");
      return;
    }
    const action = input.adapter.actions.replaceFieldContents;
    if (!action) {
      input.setLastError(1201, "Replace Field Contents is unavailable in this runtime");
      if (!input.getErrorCapture()) {
        throw new Error("Replace Field Contents is unavailable");
      }
      return;
    }
    const result = await action(fieldName, value);
    input.setLastError(result.ok ? 0 : Number(result.lastError ?? 1), result.lastMessage);
    if (!result.ok && !input.getErrorCapture()) {
      throw new Error(result.lastMessage || `Replace Field Contents failed: ${fieldName}`);
    }
    return;
  }

  if (type === "Commit Records/Requests") {
    const result = await input.adapter.actions.commit();
    input.setLastError(result.ok ? 0 : Number(result.lastError ?? 1), result.lastMessage);
    return;
  }

  if (type === "Revert Record/Request") {
    const result = await input.adapter.actions.revert();
    input.setLastError(result.ok ? 0 : Number(result.lastError ?? 1), result.lastMessage);
    return;
  }

  if (type === "New Record/Request") {
    const result = await input.adapter.actions.newRecord();
    input.setLastError(result.ok ? 0 : Number(result.lastError ?? 1), result.lastMessage);
    if (result.recordId) {
      input.adapter.variables.set("$LAST_NEW_RECORD_ID", result.recordId, input.frameId);
    }
    return;
  }

  if (type === "Delete Record/Request") {
    const result = await input.adapter.actions.deleteRecord();
    input.setLastError(result.ok ? 0 : Number(result.lastError ?? 1), result.lastMessage);
    return;
  }

  if (type === "Open Record/Request") {
    const recordId = String(params.recordId ?? "").trim();
    if (!recordId) {
      input.setLastError(102, "Record id missing");
      return;
    }
    const result = await input.adapter.actions.openRecord(recordId);
    input.setLastError(result.ok ? 0 : Number(result.lastError ?? 1), result.lastMessage);
    return;
  }

  if (type === "Refresh Window") {
    await input.adapter.actions.refreshWindow();
    input.setLastError(0, "");
    return;
  }

  if (type === "Perform Script") {
    const scriptName = String(params.scriptName ?? params.script ?? "").trim();
    if (!scriptName) {
      input.setLastError(102, "Nested script name missing");
      return;
    }
    const parameter = String(params.parameter ?? "").trim() || undefined;
    const result = await input.runNestedScript(scriptName, parameter);
    input.setLastError(result.lastError, result.lastMessage);
    if (params.resultVariable && String(params.resultVariable).trim()) {
      input.adapter.variables.set(String(params.resultVariable).trim(), result.returnValue ?? "", input.frameId);
    }
    input.adapter.variables.set("$$FM_LAST_SCRIPT_RESULT", result.returnValue ?? "");
    if (!result.ok && !input.getErrorCapture()) {
      throw new Error(result.lastMessage || `Nested script ${scriptName} failed`);
    }
    return;
  }

  if (type === "Perform Script On Server") {
    const scriptName = String(params.scriptName ?? params.script ?? "").trim();
    if (!scriptName) {
      input.setLastError(102, "Server script name missing");
      return;
    }
    const parameter = String(params.parameter ?? "").trim() || undefined;
    const result = await input.adapter.actions.performScriptOnServer(scriptName, parameter);
    input.setLastError(result.ok ? 0 : Number(result.lastError ?? 1), result.lastMessage);
    if (!result.ok && !input.getErrorCapture()) {
      throw new Error(result.lastMessage || `Server script ${scriptName} failed`);
    }
    return;
  }

  if (type === "Exit Script") {
    const resultValue = await resolveValue(params.result ?? params.value ?? "");
    input.exitWith(resultValue);
    input.setLastError(0, "");
    return;
  }

  const customStepExecutor = input.adapter.executeCustomStep;
  if (customStepExecutor) {
    const result = await customStepExecutor({
      step,
      scriptName: input.scriptName,
      frameId: input.frameId,
      scriptParameter: input.scriptParameter,
      runtimeContext: input.adapter.resolveCurrentContext(),
      resolveValue: async (raw) => resolveValue(raw),
      getVariable: (name) => input.adapter.variables.get(name, input.frameId),
      setVariable: (name, value) => input.adapter.variables.set(name, value, input.frameId),
      transactionActive: input.isTransactionActive(),
      stageTransactionField: (fieldName, value) => input.stageTransactionField(fieldName, value, stepId),
      actions: {
        goToLayout: input.adapter.actions.goToLayout,
        goToRecord: input.adapter.actions.goToRecord,
        enterMode: input.adapter.actions.enterMode,
        performFind: input.adapter.actions.performFind,
        setField: input.adapter.actions.setField,
        commit: input.adapter.actions.commit,
        revert: input.adapter.actions.revert,
        showCustomDialog: input.adapter.actions.showCustomDialog,
        performScriptOnServer: input.adapter.actions.performScriptOnServer
      }
    });
    if (result?.handled) {
      const ok = result.ok !== false;
      input.setLastError(ok ? 0 : Number(result.lastError ?? 1), result.lastMessage);
      if (result.exitScriptWith !== undefined) {
        input.exitWith(result.exitScriptWith);
      }
      if (!ok && !input.getErrorCapture()) {
        throw new Error(result.lastMessage || `Plugin script step failed: ${type}`);
      }
      return;
    }
  }

  input.setLastError(0, `Unsupported step ignored: ${type}`);
}

export async function executeScript(options: RunScriptOptions, adapter: ScriptEngineAdapter): Promise<ScriptEngineRunState> {
  const runId = createRunId();
  const startedAt = Number(adapter.now?.() ?? Date.now());
  const maxCallDepth = Math.max(1, Math.round(adapter.maxCallDepth ?? 16));

  const scriptByKey = new Map<string, ScriptDefinition>();
  for (const script of Object.values(options.scriptsByName)) {
    scriptByKey.set(normalizeScriptLookupKey(script.name), script);
  }

  const findScript = (name: string): ScriptDefinition | undefined => {
    return scriptByKey.get(normalizeScriptLookupKey(name));
  };

  const runState: ScriptEngineRunState = {
    runId,
    status: "running",
    startedAt,
    callStack: [],
    lastError: 0,
    errorCapture: false,
    stepTrace: [],
    transaction: {
      id: "txn-none",
      status: "idle",
      startedAt,
      operationCount: 0,
      lastError: 0
    }
  };

  let exitRequested = false;
  let exitResult: RuntimeVariableValue | undefined;
  let transactionBuffer: ScriptTransactionBuffer | null = null;

  const publish = () => {
    adapter.onState?.({
      ...runState,
      callStack: [...runState.callStack],
      stepTrace: [...runState.stepTrace]
    });
    adapter.onTransactionState?.(runState.transaction);
  };

  const appendTrace = (entry: Omit<ScriptStepTraceEntry, "runId" | "timestamp"> & { timestamp?: number }) => {
    const next: ScriptStepTraceEntry = {
      runId,
      timestamp: Number(adapter.now?.() ?? Date.now()),
      ...entry
    };
    runState.stepTrace = [...runState.stepTrace, next].slice(-300);
    adapter.onTrace?.(next);
    publish();
    return next;
  };

  const setLastError = (error: number, message?: string) => {
    runState.lastError = Number.isFinite(error) ? Math.max(0, Math.round(error)) : 1;
    runState.lastMessage = message;
    adapter.variables.set("$$FM_LAST_ERROR", runState.lastError);
    adapter.variables.set("$$FM_LAST_MESSAGE", typeof message === "string" ? message : "");
    publish();
  };

  const beginTransaction = async (): Promise<{ ok: boolean; lastError?: number; lastMessage?: string }> => {
    if (transactionBuffer) {
      return {
        ok: false,
        lastError: 301,
        lastMessage: "Transaction already active"
      };
    }
    const now = Number(adapter.now?.() ?? Date.now());
    transactionBuffer = createTransactionBuffer(now);
    runState.transaction = transactionBuffer.state;
    if (adapter.actions.beginTransaction) {
      const beginResult = await adapter.actions.beginTransaction();
      if (!beginResult.ok) {
        transactionBuffer = null;
        runState.transaction = {
          ...runState.transaction,
          status: "failed",
          completedAt: now,
          lastError: Number(beginResult.lastError ?? 1),
          lastMessage: beginResult.lastMessage
        };
        return beginResult;
      }
    }
    publish();
    return {
      ok: true,
      lastError: 0
    };
  };

  const stageTransactionField = (fieldName: string, value: RuntimeVariableValue, stepId: string) => {
    if (!transactionBuffer) {
      return;
    }
    transactionBuffer = stageFieldOperation(transactionBuffer, {
      stepId,
      fieldName,
      value,
      now: Number(adapter.now?.() ?? Date.now())
    });
    runState.transaction = transactionBuffer.state;
    publish();
  };

  const commitTransaction = async (): Promise<{ ok: boolean; lastError?: number; lastMessage?: string }> => {
    if (!transactionBuffer) {
      return {
        ok: false,
        lastError: 301,
        lastMessage: "No active transaction"
      };
    }
    const committed = await commitTransactionBuffer(
      transactionBuffer,
      {
        applyField: async (operation) => {
          return adapter.actions.setField(operation.fieldName, operation.value);
        },
        commit: adapter.actions.commitTransaction ?? adapter.actions.commit,
        revert: adapter.actions.revertTransaction ?? adapter.actions.revert
      },
      Number(adapter.now?.() ?? Date.now())
    );
    transactionBuffer = committed.buffer.state.status === "active" ? committed.buffer : null;
    runState.transaction = committed.buffer.state;
    publish();
    return committed.result;
  };

  const revertTransaction = async (): Promise<{ ok: boolean; lastError?: number; lastMessage?: string }> => {
    if (!transactionBuffer) {
      return {
        ok: false,
        lastError: 301,
        lastMessage: "No active transaction"
      };
    }
    const reverted = await revertTransactionBuffer(
      transactionBuffer,
      Number(adapter.now?.() ?? Date.now()),
      adapter.actions.revertTransaction ?? adapter.actions.revert
    );
    transactionBuffer = null;
    runState.transaction = reverted.buffer.state;
    publish();
    return reverted.result;
  };

  const runDefinition = async (scriptName: string, parameter: string | undefined, depth: number): Promise<ScriptEngineResult> => {
    if (depth > maxCallDepth) {
      setLastError(1202, "Max script call depth exceeded");
      return {
        ok: false,
        lastError: runState.lastError,
        lastMessage: runState.lastMessage
      };
    }

    const definition = findScript(scriptName);
    if (!definition) {
      setLastError(104, `Script not found: ${scriptName}`);
      return {
        ok: false,
        lastError: runState.lastError,
        lastMessage: runState.lastMessage
      };
    }

    const frameId = createFrameId();
    const frame: ScriptFrameState = {
      frameId,
      runId,
      scriptId: definition.id,
      scriptName: definition.name,
      pointer: 0,
      parameter
    };
    runState.callStack.push(frame);
    runState.activeFrameId = frameId;
    publish();

    const ifStack: IfFrame[] = [];
    const loopBoundaries = resolveLoopBoundaries(definition.steps);
    const activeLoopStack: number[] = [];

    try {
      for (let pointer = 0; pointer < definition.steps.length; pointer += 1) {
        const step = definition.steps[pointer];
        if (step.enabled === false || exitRequested) {
          appendTrace({
            frameId,
            scriptName: definition.name,
            pointer,
            stepId: step.id,
            stepType: stepTypeFromName(step) as ScriptStep["type"],
            status: "skipped"
          });
          continue;
        }

        frame.pointer = pointer;
        publish();

        const stepType = stepTypeFromName(step);
        appendTrace({
          frameId,
          scriptName: definition.name,
          pointer,
          stepId: step.id,
          stepType: step.type,
          status: "started"
        });

        if (stepType === "If") {
          const parentExecute = shouldExecuteStep(ifStack);
          if (!parentExecute) {
            ifStack.push({
              parentExecute,
              currentExecute: false,
              branchTaken: false
            });
            continue;
          }
          const conditionValue = await resolveStepValue(step.params?.condition ?? false, {
            adapter,
            frameId,
            scriptParameter: parameter,
            getLastError: () => runState.lastError,
            getLastMessage: () => runState.lastMessage
          });
          const condition = Boolean(conditionValue);
          ifStack.push({
            parentExecute,
            currentExecute: condition,
            branchTaken: condition
          });
          appendTrace({
            frameId,
            scriptName: definition.name,
            pointer,
            stepId: step.id,
            stepType: step.type,
            status: "completed"
          });
          continue;
        }

        if (stepType === "Else If") {
          const top = ifStack[ifStack.length - 1];
          if (!top) {
            setLastError(1206, "Else If encountered without If");
            appendTrace({
              frameId,
              scriptName: definition.name,
              pointer,
              stepId: step.id,
              stepType: step.type,
              status: "failed",
              lastError: runState.lastError,
              lastMessage: runState.lastMessage
            });
            if (!runState.errorCapture) {
              break;
            }
            continue;
          }

          if (!top.parentExecute || top.branchTaken) {
            top.currentExecute = false;
            appendTrace({
              frameId,
              scriptName: definition.name,
              pointer,
              stepId: step.id,
              stepType: step.type,
              status: "completed"
            });
            continue;
          }

          const conditionValue = await resolveStepValue(step.params?.condition ?? false, {
            adapter,
            frameId,
            scriptParameter: parameter,
            getLastError: () => runState.lastError,
            getLastMessage: () => runState.lastMessage
          });
          const condition = Boolean(conditionValue);
          top.currentExecute = condition;
          top.branchTaken = condition;
          appendTrace({
            frameId,
            scriptName: definition.name,
            pointer,
            stepId: step.id,
            stepType: step.type,
            status: "completed"
          });
          continue;
        }

        if (stepType === "Else") {
          const top = ifStack[ifStack.length - 1];
          if (!top) {
            setLastError(1203, "Else encountered without If");
            appendTrace({
              frameId,
              scriptName: definition.name,
              pointer,
              stepId: step.id,
              stepType: step.type,
              status: "failed",
              lastError: runState.lastError,
              lastMessage: runState.lastMessage
            });
            if (!runState.errorCapture) {
              break;
            }
            continue;
          }
          if (!top.parentExecute) {
            top.currentExecute = false;
          } else if (top.branchTaken) {
            top.currentExecute = false;
          } else {
            top.currentExecute = true;
            top.branchTaken = true;
          }
          appendTrace({
            frameId,
            scriptName: definition.name,
            pointer,
            stepId: step.id,
            stepType: step.type,
            status: "completed"
          });
          continue;
        }

        if (stepType === "End If") {
          if (ifStack.length === 0) {
            setLastError(1204, "End If encountered without If");
            appendTrace({
              frameId,
              scriptName: definition.name,
              pointer,
              stepId: step.id,
              stepType: step.type,
              status: "failed",
              lastError: runState.lastError,
              lastMessage: runState.lastMessage
            });
            if (!runState.errorCapture) {
              break;
            }
          } else {
            ifStack.pop();
          }
          appendTrace({
            frameId,
            scriptName: definition.name,
            pointer,
            stepId: step.id,
            stepType: step.type,
            status: "completed"
          });
          continue;
        }

        if (stepType === "Loop") {
          if (activeLoopStack[activeLoopStack.length - 1] !== pointer) {
            activeLoopStack.push(pointer);
          }
          appendTrace({
            frameId,
            scriptName: definition.name,
            pointer,
            stepId: step.id,
            stepType: step.type,
            status: "completed"
          });
          continue;
        }

        if (stepType === "Exit Loop If") {
          const currentLoopStart = activeLoopStack[activeLoopStack.length - 1];
          const loopEndPointer =
            typeof currentLoopStart === "number" ? loopBoundaries.loopStartToEnd.get(currentLoopStart) : undefined;
          if (typeof currentLoopStart !== "number" || typeof loopEndPointer !== "number") {
            setLastError(1207, "Exit Loop If encountered outside of a Loop");
            appendTrace({
              frameId,
              scriptName: definition.name,
              pointer,
              stepId: step.id,
              stepType: step.type,
              status: "failed",
              lastError: runState.lastError,
              lastMessage: runState.lastMessage
            });
            if (!runState.errorCapture) {
              break;
            }
            continue;
          }
          const conditionValue = await resolveStepValue(step.params?.condition ?? false, {
            adapter,
            frameId,
            scriptParameter: parameter,
            getLastError: () => runState.lastError,
            getLastMessage: () => runState.lastMessage
          });
          const condition = Boolean(conditionValue);
          if (condition) {
            if (activeLoopStack.length > 0) {
              activeLoopStack.pop();
            }
            pointer = loopEndPointer;
          }
          appendTrace({
            frameId,
            scriptName: definition.name,
            pointer: frame.pointer,
            stepId: step.id,
            stepType: step.type,
            status: "completed"
          });
          continue;
        }

        if (stepType === "End Loop") {
          const loopStart = loopBoundaries.loopEndToStart.get(pointer);
          if (typeof loopStart === "number") {
            if (activeLoopStack.length === 0 || activeLoopStack[activeLoopStack.length - 1] !== loopStart) {
              activeLoopStack.push(loopStart);
            }
            appendTrace({
              frameId,
              scriptName: definition.name,
              pointer,
              stepId: step.id,
              stepType: step.type,
              status: "looped"
            });
            pointer = loopStart;
            continue;
          }
          appendTrace({
            frameId,
            scriptName: definition.name,
            pointer,
            stepId: step.id,
            stepType: step.type,
            status: "completed"
          });
          continue;
        }

        if (!shouldExecuteStep(ifStack)) {
          appendTrace({
            frameId,
            scriptName: definition.name,
            pointer,
            stepId: step.id,
            stepType: step.type,
            status: "skipped"
          });
          continue;
        }

        if (adapter.stepMode) {
          const waitFor = adapter.awaitStep;
          if (waitFor) {
            await waitFor({
              runId,
              frameId,
              scriptName: definition.name,
              pointer,
              stepId: step.id,
              stepType: step.type,
              status: "started",
              timestamp: Number(adapter.now?.() ?? Date.now())
            });
          }
        }

        try {
          await executeStep(step, {
            adapter,
            scriptName: definition.name,
            frameId,
            scriptParameter: parameter,
            setErrorCapture: (enabled) => {
              runState.errorCapture = enabled;
              publish();
            },
            getErrorCapture: () => runState.errorCapture,
            setLastError,
            getLastError: () => runState.lastError,
            getLastMessage: () => runState.lastMessage,
            isTransactionActive: () => Boolean(transactionBuffer),
            stageTransactionField: (fieldName, value, stepId) => {
              stageTransactionField(fieldName, value, stepId);
            },
            beginTransaction,
            commitTransaction,
            revertTransaction,
            runNestedScript: async (nestedScriptName, nestedParameter) => {
              return runDefinition(nestedScriptName, nestedParameter, depth + 1);
            },
            exitWith: (result) => {
              exitRequested = true;
              exitResult = result;
            }
          });
          appendTrace({
            frameId,
            scriptName: definition.name,
            pointer,
            stepId: step.id,
            stepType: step.type,
            status: "completed",
            lastError: runState.lastError,
            lastMessage: runState.lastMessage
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Script step failed";
          setLastError(runState.lastError || 1, message);
          appendTrace({
            frameId,
            scriptName: definition.name,
            pointer,
            stepId: step.id,
            stepType: step.type,
            status: "failed",
            lastError: runState.lastError,
            lastMessage: runState.lastMessage
          });
          if (!runState.errorCapture) {
            break;
          }
        }
      }

      const ok = runState.lastError === 0;
      return {
        ok,
        lastError: runState.lastError,
        lastMessage: runState.lastMessage,
        returnValue: exitResult
      };
    } finally {
      runState.callStack = runState.callStack.filter((entry) => entry.frameId !== frameId);
      adapter.variables.clearFrame(frameId);
      runState.activeFrameId = runState.callStack[runState.callStack.length - 1]?.frameId;
      publish();
    }
  };

  try {
    if (adapter.implicitTransaction) {
      const started = await beginTransaction();
      if (!started.ok) {
        setLastError(Number(started.lastError ?? 1), started.lastMessage || "Failed to start implicit transaction");
      }
    }

    const result = await runDefinition(options.scriptName, options.parameter, 1);
    let finalizedResult = result;

    if (runState.transaction.status === "active") {
      if (result.ok) {
        const committed = await commitTransaction();
        if (!committed.ok) {
          finalizedResult = {
            ...result,
            ok: false,
            lastError: Number(committed.lastError ?? 1),
            lastMessage: committed.lastMessage || "Implicit transaction commit failed"
          };
        }
      } else {
        await revertTransaction();
      }
    }

    runState.result = finalizedResult;
    runState.lastError = finalizedResult.lastError;
    runState.lastMessage = finalizedResult.lastMessage;
    runState.status = finalizedResult.ok ? "completed" : "failed";
  } catch (error) {
    if (runState.transaction.status === "active") {
      await revertTransaction();
    }
    runState.status = "failed";
    runState.lastError = runState.lastError || 1;
    runState.lastMessage = error instanceof Error ? error.message : "Script execution failed";
    runState.result = {
      ok: false,
      lastError: runState.lastError,
      lastMessage: runState.lastMessage
    };
  }

  runState.completedAt = Number(adapter.now?.() ?? Date.now());
  publish();
  return runState;
}

import type { LayoutComponent, LayoutDefinition, FMRecord } from "../lib/layout-model";
import type {
  RuntimeContextFrame,
  RuntimeKernelSnapshot,
  RuntimeMode,
  RuntimeVariableValue,
  ScriptStep
} from "../lib/runtime-kernel/types";

export const PLUGIN_SDK_VERSION = "1.0.0";

export type PluginLogLevel = "debug" | "info" | "warn" | "error";

export type PluginLogger = {
  log: (level: PluginLogLevel, message: string, details?: Record<string, unknown>) => void;
};

export type PluginHookName =
  | "OnRecordLoad"
  | "OnRecordCommit"
  | "OnLayoutEnter"
  | "OnScriptStart"
  | "OnScriptEnd"
  | "OnTransactionStart"
  | "OnTransactionEnd";

export type PluginHookEvent = {
  name: PluginHookName;
  timestamp: number;
  payload: Record<string, unknown>;
};

export type PluginHookHandler = (event: PluginHookEvent) => void | Promise<void>;

export type PluginRuntimeKernelBridge = {
  getSnapshot: () => RuntimeKernelSnapshot | undefined;
};

export type PluginScriptStepValidatorResult = {
  ok: boolean;
  lastError?: number;
  message?: string;
};

export type PluginScriptStepExecutionResult = {
  handled: boolean;
  ok?: boolean;
  lastError?: number;
  lastMessage?: string;
  exitScriptWith?: RuntimeVariableValue;
};

export type PluginScriptRuntimeActions = {
  goToLayout?: (layoutName: string) => Promise<void> | void;
  goToRecord?: (target: { mode?: "first" | "prev" | "next" | "last"; index?: number; recordId?: string }) => Promise<void> | void;
  enterMode?: (mode: RuntimeMode) => Promise<void> | void;
  performFind?: (criteria?: Record<string, string>) => Promise<void> | void;
  setField?: (
    fieldName: string,
    value: RuntimeVariableValue
  ) => Promise<{ ok: boolean; lastError?: number; lastMessage?: string }>;
  commit?: () => Promise<{ ok: boolean; lastError?: number; lastMessage?: string }>;
  revert?: () => Promise<{ ok: boolean; lastError?: number; lastMessage?: string }>;
  showCustomDialog?: (input: {
    title?: string;
    message?: string;
    defaultInput?: string;
  }) => Promise<{ button: number; inputValue?: string }>;
  performScriptOnServer?: (
    scriptName: string,
    parameter?: string
  ) => Promise<{ ok: boolean; lastError?: number; lastMessage?: string }>;
};

export type PluginScriptStepExecutionContext = {
  step: ScriptStep;
  scriptName: string;
  frameId: string;
  scriptParameter?: string;
  runtimeContext?: RuntimeContextFrame;
  resolveValue: (raw: unknown) => Promise<RuntimeVariableValue>;
  setVariable: (name: string, value: RuntimeVariableValue) => void;
  getVariable: (name: string) => RuntimeVariableValue | undefined;
  transactionActive: boolean;
  stageTransactionField: (fieldName: string, value: RuntimeVariableValue) => void;
  actions: PluginScriptRuntimeActions;
  logger: PluginLogger;
};

export type PluginScriptStepDefinition = {
  stepType: string;
  displayName?: string;
  description?: string;
  priority?: number;
  validate?: (
    context: Omit<PluginScriptStepExecutionContext, "resolveValue" | "stageTransactionField" | "actions">
  ) => PluginScriptStepValidatorResult | Promise<PluginScriptStepValidatorResult>;
  execute: (
    context: PluginScriptStepExecutionContext
  ) => PluginScriptStepExecutionResult | Promise<PluginScriptStepExecutionResult>;
  errorCodes?: Record<string, number>;
};

export type PluginLayoutRenderMode = "browse" | "preview";

export type PluginLayoutComponentRenderContext = {
  component: LayoutComponent;
  layout: LayoutDefinition;
  mode: PluginLayoutRenderMode;
  viewMode?: "form" | "list" | "table";
  record?: FMRecord | null;
  records?: FMRecord[];
  runtimePosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  pluginState?: Record<string, unknown>;
};

export type PluginLayoutComponentDefinition = {
  type: string;
  displayName?: string;
  category?: "layoutObject" | "uiComponent";
  priority?: number;
  runtimeRenderer?: (context: PluginLayoutComponentRenderContext) => unknown;
  previewRenderer?: (context: PluginLayoutComponentRenderContext) => unknown;
  inspectorRenderer?: (context: {
    component: LayoutComponent;
    layout: LayoutDefinition;
    pluginState?: Record<string, unknown>;
  }) => unknown;
};

export type PluginMenuItemDefinition = {
  id: string;
  menuId: string;
  label: string;
  order?: number;
  action: (context: {
    workspaceId?: string;
    layoutId?: string;
    recordId?: string;
    logger: PluginLogger;
  }) => void | Promise<void>;
};

export type PluginDataOperationKind = "read" | "find" | "create" | "write" | "delete" | "script" | "metadata";

export type PluginDataAdapterRequest<TPayload = unknown> = {
  operation: PluginDataOperationKind;
  workspaceId?: string;
  fileId?: string;
  databaseName?: string;
  layoutName?: string;
  tableOccurrence?: string;
  payload?: TPayload;
};

export type PluginDataAdapterHandleContext<TResult = unknown> = {
  request: PluginDataAdapterRequest;
  next: () => Promise<TResult>;
  logger: PluginLogger;
};

export type PluginDataAdapterDefinition = {
  id: string;
  priority?: number;
  supports?: (request: PluginDataAdapterRequest) => boolean;
  handle: <TResult = unknown>(context: PluginDataAdapterHandleContext<TResult>) => Promise<TResult> | TResult;
};

export type PluginContext = {
  runtimeKernel: PluginRuntimeKernelBridge;
  registerScriptStep: (definition: PluginScriptStepDefinition) => () => void;
  registerLayoutComponent: (definition: PluginLayoutComponentDefinition) => () => void;
  registerMenuItem: (definition: PluginMenuItemDefinition) => () => void;
  registerTriggerHook: (name: PluginHookName, handler: PluginHookHandler) => () => void;
  registerDataAdapter: (definition: PluginDataAdapterDefinition) => () => void;
  logger: PluginLogger;
};

export interface FMPlugin {
  id: string;
  version: string;
  compatibility: string;
  activate(context: PluginContext): void | Promise<void>;
  deactivate?: () => void | Promise<void>;
}

export type PluginManifest = {
  id: string;
  name: string;
  version: string;
  compatibility: string;
  description?: string;
  entry?: string;
  author?: string;
  homepage?: string;
};

export type PluginLifecycleStatus = "registered" | "active" | "inactive" | "error";

export type PluginRuntimeState = {
  id: string;
  version: string;
  compatibility: string;
  status: PluginLifecycleStatus;
  activatedAt?: number;
  lastError?: string;
};

export type PluginCompatibilityResult = {
  compatible: boolean;
  reason?: string;
};

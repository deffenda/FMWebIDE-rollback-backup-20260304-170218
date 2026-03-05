export type RuntimeMode = "browse" | "find" | "preview";

export type FoundSetQuerySpec = {
  criteria?: Record<string, string>;
  sort?: Array<{
    field: string;
    direction: "asc" | "desc";
  }>;
  filters?: Record<string, string | number | boolean>;
  limit?: number;
  offset?: number;
};

export type FoundSetDataSource = {
  workspaceId: string;
  fileId?: string;
  databaseName?: string;
  layoutName: string;
  tableOccurrence: string;
};

export type FoundSetRecord = {
  id: string;
};

export type FoundSetState = {
  id: string;
  dataSource: FoundSetDataSource;
  querySpec: FoundSetQuerySpec;
  recordIds: string[];
  pageSize: number;
  pages: Record<number, string[]>;
  loadedPageIndexes: number[];
  totalCount: number;
  currentIndex: number;
  lastRefreshedAt: number;
};

export type WindowType = "main" | "card";

export type RuntimeNavigationEntry = {
  layoutName: string;
  mode: RuntimeMode;
  foundSetId?: string;
  recordId?: string;
  timestamp: number;
};

export type RuntimeWindowState = {
  id: string;
  type: WindowType;
  title: string;
  parentWindowId?: string;
  fileId?: string;
  databaseName?: string;
  layoutName: string;
  tableOccurrence: string;
  mode: RuntimeMode;
  foundSetId?: string;
  recordId?: string;
  navigationStack: RuntimeNavigationEntry[];
};

export type PortalContext = {
  componentId: string;
  rowToken?: string;
  tableOccurrence?: string;
};

export type RuntimeContextFrame = {
  id: string;
  reason: string;
  windowId: string;
  fileId?: string;
  databaseName?: string;
  layoutName: string;
  tableOccurrence: string;
  foundSetId?: string;
  recordId?: string;
  portal?: PortalContext;
  pushedAt: number;
};

export type RuntimeRelationshipEdge = {
  id: string;
  leftTableOccurrenceName: string;
  rightTableOccurrenceName: string;
};

export type VariablePrimitive = string | number | boolean | null;

export type RuntimeVariableValue =
  | VariablePrimitive
  | RuntimeVariableValue[]
  | {
      [key: string]: RuntimeVariableValue;
    };

export type RuntimeVariableStoreState = {
  globals: Record<string, RuntimeVariableValue>;
  localsByFrameId: Record<string, Record<string, RuntimeVariableValue>>;
};

export type ScriptStepType =
  | "Begin Transaction"
  | "Commit Transaction"
  | "Revert Transaction"
  | "Loop"
  | "Exit Loop If"
  | "End Loop"
  | "Go to Layout"
  | "Go to Related Record"
  | "Go to Record/Request/Page"
  | "Enter Browse Mode"
  | "Enter Preview Mode"
  | "Enter Find Mode"
  | "Perform Find"
  | "Replace Field Contents"
  | "Omit Record"
  | "Show Omitted Only"
  | "Show All Records"
  | "Show Custom Dialog"
  | "Pause/Resume Script"
  | "Set Field"
  | "Set Field By Name"
  | "Set Variable"
  | "Set Variable By Name"
  | "Commit Records/Requests"
  | "Revert Record/Request"
  | "New Record/Request"
  | "Delete Record/Request"
  | "Open Record/Request"
  | "Refresh Window"
  | "If"
  | "Else If"
  | "Else"
  | "End If"
  | "Exit Script"
  | "Perform Script"
  | "Perform Script On Server"
  | "Set Error Capture"
  | "Comment"
  | (string & {});

export type ScriptStep = {
  id: string;
  type: ScriptStepType;
  enabled?: boolean;
  comment?: string;
  params?: Record<string, unknown>;
};

export type ScriptDefinition = {
  id: string;
  name: string;
  steps: ScriptStep[];
};

export type ScriptFrameState = {
  frameId: string;
  runId: string;
  scriptId: string;
  scriptName: string;
  pointer: number;
  parameter?: string;
};

export type ScriptEngineResult = {
  ok: boolean;
  lastError: number;
  lastMessage?: string;
  returnValue?: RuntimeVariableValue;
};

export type ScriptStepTraceStatus =
  | "started"
  | "completed"
  | "skipped"
  | "failed"
  | "looped";

export type ScriptStepTraceEntry = {
  runId: string;
  frameId: string;
  scriptName: string;
  pointer: number;
  stepId: string;
  stepType: ScriptStepType;
  status: ScriptStepTraceStatus;
  timestamp: number;
  lastError?: number;
  lastMessage?: string;
};

export type ScriptTransactionOperation = {
  id: string;
  stepId: string;
  fieldName: string;
  value: RuntimeVariableValue;
  queuedAt: number;
};

export type ScriptTransactionStatus = "idle" | "active" | "committed" | "reverted" | "failed";

export type ScriptTransactionState = {
  id: string;
  status: ScriptTransactionStatus;
  startedAt: number;
  completedAt?: number;
  operationCount: number;
  lastError: number;
  lastMessage?: string;
};

export type ScriptEngineRunState = {
  runId: string;
  status: "running" | "paused" | "completed" | "failed" | "cancelled";
  startedAt: number;
  completedAt?: number;
  activeFrameId?: string;
  callStack: ScriptFrameState[];
  lastError: number;
  lastMessage?: string;
  errorCapture: boolean;
  stepTrace: ScriptStepTraceEntry[];
  transaction: ScriptTransactionState;
  result?: ScriptEngineResult;
};

export type RuntimeKernelState = {
  sessionId: string;
  workspaceId: string;
  windows: Record<string, RuntimeWindowState>;
  windowOrder: string[];
  focusedWindowId: string;
  foundSets: Record<string, FoundSetState>;
  contextStacksByWindow: Record<string, RuntimeContextFrame[]>;
  variables: RuntimeVariableStoreState;
  relationships: RuntimeRelationshipEdge[];
  scriptsByName: Record<string, ScriptDefinition>;
  activeScriptRun?: ScriptEngineRunState;
  scriptHistory: ScriptEngineRunState[];
  activeTransaction?: ScriptTransactionState;
  transactionHistory: ScriptTransactionState[];
};

export type RuntimeKernelSnapshot = {
  sessionId: string;
  workspaceId: string;
  focusedWindowId: string;
  windows: RuntimeWindowState[];
  foundSets: Array<{
    id: string;
    layoutName: string;
    tableOccurrence: string;
    totalCount: number;
    currentIndex: number;
    currentRecordId?: string;
  }>;
  contextStacksByWindow: Record<string, RuntimeContextFrame[]>;
  variables: {
    globalNames: string[];
    localFrameIds: string[];
  };
  activeScriptRun?: {
    runId: string;
    status: ScriptEngineRunState["status"];
    activeFrameId?: string;
    callDepth: number;
    lastError: number;
    lastMessage?: string;
    callStack: ScriptFrameState[];
    stepTraceTail: ScriptStepTraceEntry[];
  };
  activeTransaction?: ScriptTransactionState;
};

export type RuntimeKernelSubscriber = (state: RuntimeKernelState) => void;

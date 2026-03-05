import type { LayoutDefinition } from "../../lib/layout-model.ts";
import type { GeometryBaselineCache, LayoutViewport } from "../../fm/layout/geometry/types.ts";

export type RuntimeSessionMode = "browse" | "find" | "preview";

export type RuntimeClientEventType =
  | "focus"
  | "blur"
  | "click"
  | "input"
  | "keydown"
  | "commit"
  | "navigate"
  | "portalScroll"
  | "viewport";

export type RuntimeClientEvent = {
  objectId: string;
  eventType: RuntimeClientEventType;
  payload?: Record<string, unknown>;
  timestamp: number;
  clientSeq: number;
};

export type RuntimePatchOperation =
  | {
      type: "replaceRenderTree";
      renderTree: RuntimeRenderTreeNode;
    }
  | {
      type: "updateFieldValue";
      objectId: string;
      value: unknown;
    }
  | {
      type: "updateComputedStyle";
      objectId: string;
      styleDelta: Record<string, unknown>;
    }
  | {
      type: "showDialog";
      dialog: {
        title: string;
        message: string;
        level: "info" | "warning" | "error";
      };
    }
  | {
      type: "navigate";
      layoutId: string;
      layoutName: string;
      mode: RuntimeSessionMode;
    }
  | {
      type: "setFocus";
      objectId: string;
    }
  | {
      type: "updatePortalRows";
      portalId: string;
      rows: RuntimePortalRow[];
    }
  | {
      type: "setRecordDirty";
      dirty: boolean;
    }
  | {
      type: "setError";
      objectId?: string;
      message: string;
    }
  | {
      type: "setStatusMessage";
      message: string;
    };

export type RuntimePatchSet = {
  sessionToken: string;
  serverSeq: number;
  timestamp: number;
  operations: RuntimePatchOperation[];
};

export type RuntimeRenderTreeNode = {
  nodeId: string;
  objectId: string;
  type: string;
  tag: string;
  role?: string;
  ariaLabel?: string;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  style?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  text?: string;
  value?: unknown;
  hidden?: boolean;
  disabled?: boolean;
  eventBindings?: RuntimeClientEventType[];
  children?: RuntimeRenderTreeNode[];
};

export type RuntimePortalRow = {
  rowObjectId: string;
  rowRecordId: string;
  rowIndex: number;
  values: Record<string, unknown>;
};

export type RuntimeObjectBinding =
  | {
      kind: "layoutField";
      objectId: string;
      componentId: string;
      fieldName: string;
      tableOccurrence: string;
    }
  | {
      kind: "portalField";
      objectId: string;
      portalComponentId: string;
      rowRecordId: string;
      rowIndex: number;
      fieldName: string;
      tableOccurrence: string;
    }
  | {
      kind: "button";
      objectId: string;
      componentId: string;
      action: "runScript" | "goToLayout" | "deletePortalRow";
      script?: string;
      parameter?: string;
      layoutName?: string;
    };

export type RuntimeLayoutObjectMap = {
  componentIdToObjectId: Record<string, string>;
  objectIdToComponentId: Record<string, string>;
};

export type RuntimeOpenRequest = {
  fixtureId?: string;
  layoutId?: string;
  layoutName?: string;
  mode?: RuntimeSessionMode;
  workspaceId?: string;
  viewport?: Partial<LayoutViewport>;
};

export type RuntimeOpenResponse = {
  sessionToken: string;
  serverSeq: number;
  mode: RuntimeSessionMode;
  layout: {
    id: string;
    name: string;
    defaultTableOccurrence: string;
  };
  viewport: LayoutViewport;
  renderTree: RuntimeRenderTreeNode;
  recordDirty: boolean;
};

export type RuntimeSession = {
  token: string;
  workspaceId: string;
  mode: RuntimeSessionMode;
  layout: LayoutDefinition;
  objectMap: RuntimeLayoutObjectMap;
  objectBindings: Map<string, RuntimeObjectBinding>;
  tabOrderObjectIds: string[];
  records: Array<Record<string, unknown>>;
  currentRecordIndex: number;
  focusedObjectId: string | null;
  recordDirty: boolean;
  fieldBuffer: Map<string, unknown>;
  lastClientSeq: number;
  lastServerSeq: number;
  createdAt: number;
  lastAccessedAt: number;
  patches: RuntimePatchSet[];
  portalOffsets: Map<string, number>;
  viewport: LayoutViewport;
  geometryBaselineCache: GeometryBaselineCache;
};

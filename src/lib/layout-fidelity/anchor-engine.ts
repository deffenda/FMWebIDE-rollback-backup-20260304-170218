import type { LayoutComponent } from "../layout-model";

export type AnchorContainerKind = "layout" | "tab" | "slide" | "popover" | "portal" | "portalRow";

export type AnchorRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type AnchorFlags = {
  left: boolean;
  top: boolean;
  right: boolean;
  bottom: boolean;
};

export type AnchoredFrame = AnchorRect & {
  containerKind: AnchorContainerKind;
  containerId?: string;
  anchors: AnchorFlags;
};

export const DDR_OBJECT_FLAG_DONT_ANCHOR_LEFT = 0x1000_0000;
export const DDR_OBJECT_FLAG_DONT_ANCHOR_TOP = 0x2000_0000;
export const DDR_OBJECT_FLAG_ANCHOR_RIGHT = 0x4000_0000;
export const DDR_OBJECT_FLAG_ANCHOR_BOTTOM = 0x8000_0000;

const DEFAULT_ANCHORS: AnchorFlags = {
  left: true,
  top: true,
  right: false,
  bottom: false
};

type ComputeAnchoredRectInput = {
  baseRect: AnchorRect;
  baseContainer: AnchorRect;
  runtimeContainer: AnchorRect;
  anchors: AnchorFlags;
  minimumWidth?: number;
  minimumHeight?: number;
};

type RuntimeFrameInput = {
  components: LayoutComponent[];
  baseCanvas: { width: number; height: number };
  runtimeCanvas: { width: number; height: number };
};

function normalizeDimension(value: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, parsed);
}

function normalizeRect(rect: AnchorRect): AnchorRect {
  return {
    x: Number.isFinite(rect.x) ? Number(rect.x) : 0,
    y: Number.isFinite(rect.y) ? Number(rect.y) : 0,
    width: normalizeDimension(rect.width, 0),
    height: normalizeDimension(rect.height, 0)
  };
}

function normalizeToInt(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value);
}

function normalizeFlagBits(rawBits: number | null | undefined): number | null {
  if (rawBits == null || !Number.isFinite(rawBits)) {
    return null;
  }
  return Number(rawBits) >>> 0;
}

export function parseDdrObjectFlagBits(rawValue: unknown): number | null {
  const token = String(rawValue ?? "").trim();
  if (!token) {
    return null;
  }
  const parsed = Number.parseInt(token, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed >>> 0;
}

export function decodeAnchorsFromDdrObjectFlags(
  rawBits: number | null | undefined,
  fallback: Partial<AnchorFlags> = DEFAULT_ANCHORS
): AnchorFlags {
  const bits = normalizeFlagBits(rawBits);
  const fallbackAnchors: AnchorFlags = {
    left: fallback.left ?? DEFAULT_ANCHORS.left,
    top: fallback.top ?? DEFAULT_ANCHORS.top,
    right: fallback.right ?? DEFAULT_ANCHORS.right,
    bottom: fallback.bottom ?? DEFAULT_ANCHORS.bottom
  };
  if (bits == null) {
    return fallbackAnchors;
  }

  return {
    left: (bits & DDR_OBJECT_FLAG_DONT_ANCHOR_LEFT) === 0,
    top: (bits & DDR_OBJECT_FLAG_DONT_ANCHOR_TOP) === 0,
    right: (bits & DDR_OBJECT_FLAG_ANCHOR_RIGHT) !== 0,
    bottom: (bits & DDR_OBJECT_FLAG_ANCHOR_BOTTOM) !== 0
  };
}

export function resolveComponentAnchors(component: LayoutComponent): AnchorFlags {
  const fromFlags = decodeAnchorsFromDdrObjectFlags(component.props.ddrObjectFlags ?? null, DEFAULT_ANCHORS);
  return {
    left: component.props.autosizeLeft ?? fromFlags.left,
    top: component.props.autosizeTop ?? fromFlags.top,
    right: component.props.autosizeRight ?? fromFlags.right,
    bottom: component.props.autosizeBottom ?? fromFlags.bottom
  };
}

export function computeAnchoredRect({
  baseRect,
  baseContainer,
  runtimeContainer,
  anchors,
  minimumWidth = 8,
  minimumHeight = 8
}: ComputeAnchoredRectInput): AnchorRect {
  const normalizedBaseRect = normalizeRect(baseRect);
  const normalizedBaseContainer = normalizeRect(baseContainer);
  const normalizedRuntimeContainer = normalizeRect(runtimeContainer);
  const deltaWidth = normalizedRuntimeContainer.width - normalizedBaseContainer.width;
  const deltaHeight = normalizedRuntimeContainer.height - normalizedBaseContainer.height;

  let nextX = normalizedBaseRect.x;
  let nextY = normalizedBaseRect.y;
  let nextWidth = normalizedBaseRect.width;
  let nextHeight = normalizedBaseRect.height;

  if (anchors.left && anchors.right) {
    nextWidth = Math.max(minimumWidth, normalizedBaseRect.width + deltaWidth);
  } else if (!anchors.left && anchors.right) {
    nextX = normalizedBaseRect.x + deltaWidth;
  } else if (!anchors.left && !anchors.right) {
    nextX = normalizedBaseRect.x + deltaWidth / 2;
  }

  if (anchors.top && anchors.bottom) {
    nextHeight = Math.max(minimumHeight, normalizedBaseRect.height + deltaHeight);
  } else if (!anchors.top && anchors.bottom) {
    nextY = normalizedBaseRect.y + deltaHeight;
  } else if (!anchors.top && !anchors.bottom) {
    nextY = normalizedBaseRect.y + deltaHeight / 2;
  }

  return {
    x: normalizeToInt(nextX),
    y: normalizeToInt(nextY),
    width: normalizeToInt(Math.max(minimumWidth, nextWidth)),
    height: normalizeToInt(Math.max(minimumHeight, nextHeight))
  };
}

function parentPathToken(ddrObjectPath: string): string {
  const token = String(ddrObjectPath ?? "").trim();
  if (!token.includes(".")) {
    return "";
  }
  const pieces = token.split(".");
  pieces.pop();
  return pieces.join(".");
}

function resolveParentFromPath(
  ddrObjectPath: string,
  componentByPath: Map<string, LayoutComponent>
): LayoutComponent | null {
  let token = parentPathToken(ddrObjectPath);
  while (token) {
    const parent = componentByPath.get(token);
    if (parent) {
      return parent;
    }
    token = parentPathToken(token);
  }
  return null;
}

function inferContainerKindFromParent(parent: LayoutComponent | null | undefined): AnchorContainerKind {
  if (!parent) {
    return "layout";
  }
  if (parent.type === "portal") {
    return "portalRow";
  }
  if (parent.type === "panel") {
    return parent.props.panelType === "slide" ? "slide" : "tab";
  }
  const originalType = String(parent.props.ddrOriginalObjectType ?? "")
    .trim()
    .toLowerCase();
  if (originalType === "popover") {
    return "popover";
  }
  if (originalType === "portal") {
    return "portalRow";
  }
  return "layout";
}

export function computeRuntimeComponentFrames({
  components,
  baseCanvas,
  runtimeCanvas
}: RuntimeFrameInput): Record<string, AnchoredFrame> {
  const frames: Record<string, AnchoredFrame> = {};
  const componentById = new Map<string, LayoutComponent>();
  const componentByPath = new Map<string, LayoutComponent>();
  for (const component of components) {
    componentById.set(component.id, component);
    const pathToken = String(component.props.ddrObjectPath ?? "").trim();
    if (pathToken) {
      componentByPath.set(pathToken, component);
    }
  }

  const layoutBaseRect: AnchorRect = {
    x: 0,
    y: 0,
    width: normalizeDimension(baseCanvas.width, 1200),
    height: normalizeDimension(baseCanvas.height, 900)
  };
  const layoutRuntimeRect: AnchorRect = {
    x: 0,
    y: 0,
    width: normalizeDimension(runtimeCanvas.width, 1200),
    height: normalizeDimension(runtimeCanvas.height, 900)
  };

  for (const component of components) {
    const parentIdFromPortal = String(component.props.portalParentComponentId ?? "").trim();
    const parentId =
      parentIdFromPortal ||
      (() => {
        const parentComponent = resolveParentFromPath(String(component.props.ddrObjectPath ?? ""), componentByPath);
        return parentComponent?.id ?? "";
      })();
    const parent = parentId ? componentById.get(parentId) ?? null : null;

    const anchors = resolveComponentAnchors(component);
    const baseRect: AnchorRect = {
      x: Number(component.position.x) || 0,
      y: Number(component.position.y) || 0,
      width: Number(component.position.width) || 0,
      height: Number(component.position.height) || 0
    };

    const parentBaseRect = parent
      ? {
          x: Number(parent.position.x) || 0,
          y: Number(parent.position.y) || 0,
          width: Number(parent.position.width) || 0,
          height: Number(parent.position.height) || 0
        }
      : layoutBaseRect;
    const parentRuntimeRect = parent ? frames[parent.id] ?? parentBaseRect : layoutRuntimeRect;

    const relativeBaseRect: AnchorRect = parent
      ? {
          x: baseRect.x - parentBaseRect.x,
          y: baseRect.y - parentBaseRect.y,
          width: baseRect.width,
          height: baseRect.height
        }
      : baseRect;

    const relativeRuntimeRect = computeAnchoredRect({
      baseRect: relativeBaseRect,
      baseContainer: {
        x: 0,
        y: 0,
        width: parentBaseRect.width,
        height: parentBaseRect.height
      },
      runtimeContainer: {
        x: 0,
        y: 0,
        width: parentRuntimeRect.width,
        height: parentRuntimeRect.height
      },
      anchors
    });

    const absoluteRect: AnchorRect = parent
      ? {
          x: parentRuntimeRect.x + relativeRuntimeRect.x,
          y: parentRuntimeRect.y + relativeRuntimeRect.y,
          width: relativeRuntimeRect.width,
          height: relativeRuntimeRect.height
        }
      : relativeRuntimeRect;

    frames[component.id] = {
      ...absoluteRect,
      containerKind: inferContainerKindFromParent(parent),
      containerId: parent?.id,
      anchors
    };
  }

  return frames;
}

import type { LayoutComponent, LayoutDefinition } from "../../../lib/layout-model.ts";
import {
  decodeAnchorsFromDdrObjectFlags,
  parseDdrObjectFlagBits
} from "../../../lib/layout-fidelity/anchor-engine.ts";
import { applyAnchors } from "./applyAnchors.ts";
import { resolvePartIdForObject } from "./computePartMetrics.ts";
import type {
  AnchorOverrideByObjectId,
  AnchorSpec,
  GeometryBaselineCache,
  InternalPartMetrics,
  ObjectGeometry,
  Rect
} from "./types.ts";

const DEFAULT_ANCHORS: AnchorSpec = {
  left: true,
  top: true,
  right: false,
  bottom: false
};

function round(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 1000) / 1000;
}

function objectOrder(component: LayoutComponent): number {
  const ddr = Number(component.props.ddrArrangeOrder);
  if (Number.isFinite(ddr)) {
    return ddr;
  }
  const z = Number(component.position.z);
  if (Number.isFinite(z)) {
    return z;
  }
  return 0;
}

function resolveAnchorSpec(options: {
  component: LayoutComponent;
  layoutOverrides: AnchorOverrideByObjectId | undefined;
  baselineContainerWidthUnits: number;
}): AnchorSpec {
  const { component, layoutOverrides, baselineContainerWidthUnits } = options;
  const override = layoutOverrides?.[component.id] ?? {};
  const parsedFlagBits = parseDdrObjectFlagBits(component.props.ddrObjectFlags);
  const hasExplicitAutosizeProps =
    typeof component.props.autosizeLeft === "boolean" ||
    typeof component.props.autosizeRight === "boolean" ||
    typeof component.props.autosizeTop === "boolean" ||
    typeof component.props.autosizeBottom === "boolean";
  const hasExplicitAnchorMetadata = hasExplicitAutosizeProps || parsedFlagBits != null;
  const fromFlags = decodeAnchorsFromDdrObjectFlags(parsedFlagBits, DEFAULT_ANCHORS);
  const inferredWideBodyObject =
    !hasExplicitAnchorMetadata &&
    Number.isFinite(baselineContainerWidthUnits) &&
    baselineContainerWidthUnits > 0 &&
    component.position.width / baselineContainerWidthUnits >= 0.85;

  return {
    left: override.left ?? component.props.autosizeLeft ?? fromFlags.left,
    right:
      override.right ??
      component.props.autosizeRight ??
      (inferredWideBodyObject ? true : fromFlags.right),
    top: override.top ?? component.props.autosizeTop ?? fromFlags.top,
    bottom: override.bottom ?? component.props.autosizeBottom ?? fromFlags.bottom
  };
}

function baselineCacheKey(layoutId: string, partId: string, componentId: string): string {
  return `${layoutId}::${partId}::${componentId}`;
}

function sanitizeRect(rect: Rect): Rect {
  return {
    x: Number.isFinite(rect.x) ? rect.x : 0,
    y: Number.isFinite(rect.y) ? rect.y : 0,
    w: Number.isFinite(rect.w) ? Math.max(1, rect.w) : 1,
    h: Number.isFinite(rect.h) ? Math.max(1, rect.h) : 1
  };
}

function resolvePartMetrics(
  partMetrics: InternalPartMetrics[],
  partId: string
): InternalPartMetrics | null {
  return partMetrics.find((entry) => entry.partId === partId) ?? null;
}

function resolveBaselinePartMetrics(
  partMetrics: InternalPartMetrics[],
  partId: string
): InternalPartMetrics {
  return (
    partMetrics.find((entry) => entry.partId === partId) ??
    partMetrics.find((entry) => entry.partType === "body") ??
    partMetrics[0]
  );
}

export function createGeometryBaselineCache(): GeometryBaselineCache {
  return {
    byObjectKey: new Map()
  };
}

export function computeObjectGeometry(options: {
  layout: LayoutDefinition;
  zoom: number;
  partMetrics: InternalPartMetrics[];
  anchorOverrides?: AnchorOverrideByObjectId;
  baselineCache?: GeometryBaselineCache;
}): ObjectGeometry[] {
  const zoom = Math.max(0.1, Number(options.zoom) || 1);
  const baselineCache = options.baselineCache ?? createGeometryBaselineCache();
  const objectGeometries: ObjectGeometry[] = [];
  const sorted = [...options.layout.components].sort((left, right) => {
    const leftOrder = objectOrder(left);
    const rightOrder = objectOrder(right);
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return left.id.localeCompare(right.id);
  });

  for (const component of sorted) {
    const partId = resolvePartIdForObject(options.layout, component.position.y);
    const runtimePart = resolvePartMetrics(options.partMetrics, partId);
    if (!runtimePart) {
      continue;
    }
    const baselinePart = resolveBaselinePartMetrics(options.partMetrics, partId);
    const baselineContainerRectUnits: Rect = sanitizeRect({
      x: 0,
      y: 0,
      w: baselinePart.contentRectUnits.w,
      h: baselinePart.baselineHeightUnits
    });
    const currentContainerRectUnits: Rect = sanitizeRect({
      x: 0,
      y: 0,
      w: runtimePart.contentRectUnits.w,
      h: runtimePart.heightUnits
    });

    const baselineObjectRectUnits: Rect = sanitizeRect({
      x: component.position.x,
      y: component.position.y - baselinePart.baselineTopUnits,
      w: component.position.width,
      h: component.position.height
    });

    const cacheKey = baselineCacheKey(options.layout.id, partId, component.id);
    const cached = baselineCache.byObjectKey.get(cacheKey);
    const cachedObjectRectUnits = cached ? sanitizeRect(cached.objectRectPx) : baselineObjectRectUnits;
    const cachedContainerRectUnits = cached ? sanitizeRect(cached.containerRectPx) : baselineContainerRectUnits;
    if (!cached) {
      baselineCache.byObjectKey.set(cacheKey, {
        objectRectPx: baselineObjectRectUnits,
        containerRectPx: baselineContainerRectUnits
      });
    }
    const anchorSpec = resolveAnchorSpec({
      component,
      layoutOverrides: options.anchorOverrides,
      baselineContainerWidthUnits: cachedContainerRectUnits.w
    });

    const anchoredRectUnits = applyAnchors({
      baselineObjectRect: cachedObjectRectUnits,
      baselineContainerRect: cachedContainerRectUnits,
      currentContainerRect: currentContainerRectUnits,
      anchors: anchorSpec
    });

    const rectPx: Rect = {
      x: round(anchoredRectUnits.x * zoom),
      y: round((runtimePart.topUnits + anchoredRectUnits.y) * zoom),
      w: round(anchoredRectUnits.w * zoom),
      h: round(anchoredRectUnits.h * zoom)
    };
    objectGeometries.push({
      id: component.id,
      objectType: component.type,
      partId,
      rectPx,
      zIndex: objectOrder(component),
      anchorSpec,
      baselineRectPx: {
        x: round(cachedObjectRectUnits.x * zoom),
        y: round((baselinePart.baselineTopUnits + cachedObjectRectUnits.y) * zoom),
        w: round(cachedObjectRectUnits.w * zoom),
        h: round(cachedObjectRectUnits.h * zoom)
      },
      baselineContainerRectPx: {
        x: round(cachedContainerRectUnits.x * zoom),
        y: round(cachedContainerRectUnits.y * zoom),
        w: round(cachedContainerRectUnits.w * zoom),
        h: round(cachedContainerRectUnits.h * zoom)
      },
      containerRectPx: {
        x: round(currentContainerRectUnits.x * zoom),
        y: round((runtimePart.topUnits + currentContainerRectUnits.y) * zoom),
        w: round(currentContainerRectUnits.w * zoom),
        h: round(currentContainerRectUnits.h * zoom)
      }
    });
  }

  objectGeometries.sort((left, right) => {
    if (left.zIndex !== right.zIndex) {
      return left.zIndex - right.zIndex;
    }
    return left.id.localeCompare(right.id);
  });
  return objectGeometries;
}

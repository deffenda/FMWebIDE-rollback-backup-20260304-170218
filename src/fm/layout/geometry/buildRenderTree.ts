import type { LayoutDefinition } from "@/src/lib/layout-model";
import { computeObjectGeometry, createGeometryBaselineCache } from "./computeObjectGeometry.ts";
import { computePartMetrics } from "./computePartMetrics.ts";
import type {
  AnchorOverridesByLayoutId,
  GeometryBaselineCache,
  LayoutRenderTree,
  LayoutViewport,
  RenderNode
} from "./types.ts";

export function buildLayoutRenderTree(options: {
  layout: LayoutDefinition;
  viewport: LayoutViewport;
  anchorOverrides?: AnchorOverridesByLayoutId;
  baselineCache?: GeometryBaselineCache;
}): LayoutRenderTree {
  const zoom = Math.max(0.1, Number(options.viewport.zoom) || 1);
  const baselineCache = options.baselineCache ?? createGeometryBaselineCache();
  const partMetricsResult = computePartMetrics(options.layout, options.viewport);
  const layoutOverrides = options.anchorOverrides?.[options.layout.id];
  const objectGeometries = computeObjectGeometry({
    layout: options.layout,
    zoom,
    partMetrics: partMetricsResult.parts,
    anchorOverrides: layoutOverrides,
    baselineCache
  });

  const objectByPart = new Map<string, RenderNode[]>();
  for (const geometry of objectGeometries) {
    const bucket = objectByPart.get(geometry.partId) ?? [];
    bucket.push({
      id: geometry.id,
      kind: "object",
      objectType: geometry.objectType,
      rectPx: geometry.rectPx,
      zIndex: geometry.zIndex,
      partId: geometry.partId,
      meta: {
        anchorSpec: geometry.anchorSpec,
        baselineRectPx: geometry.baselineRectPx,
        baselineContainerRectPx: geometry.baselineContainerRectPx,
        containerRectPx: geometry.containerRectPx
      }
    });
    objectByPart.set(geometry.partId, bucket);
  }

  const partNodes: RenderNode[] = partMetricsResult.parts.map((part) => {
    const children = (objectByPart.get(part.partId) ?? []).sort((left, right) => {
      if (left.zIndex !== right.zIndex) {
        return left.zIndex - right.zIndex;
      }
      return left.id.localeCompare(right.id);
    });
    return {
      id: part.partId,
      kind: "part",
      objectType: part.partType,
      rectPx: part.contentRectPx,
      zIndex: part.index,
      partId: part.partId,
      meta: {
        partType: part.partType,
        topPx: part.topPx,
        heightPx: part.heightPx,
        topUnits: part.topUnits,
        heightUnits: part.heightUnits
      },
      children
    };
  });

  return {
    id: options.layout.id,
    kind: "layout",
    rectPx: {
      x: 0,
      y: 0,
      w: partMetricsResult.runtimeWidthPx,
      h: partMetricsResult.runtimeHeightPx
    },
    children: partNodes,
    meta: {
      viewport: options.viewport,
      totalHeightPx: partMetricsResult.totalHeightPx,
      partCount: partMetricsResult.parts.length,
      objectCount: objectGeometries.length,
      partMetrics: partMetricsResult.parts,
      objectGeometries
    }
  };
}

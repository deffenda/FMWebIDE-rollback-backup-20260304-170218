import type { LayoutDefinition, LayoutPartDefinition } from "../../../lib/layout-model.ts";
import type { InternalPartMetrics, LayoutViewport, Rect } from "./types.ts";

const MIN_PART_HEIGHT_UNITS = 20;
const BODY_PART_TYPES = new Set(["body"]);

function isBodyPart(partType: string): boolean {
  return BODY_PART_TYPES.has(String(partType ?? "").trim().toLowerCase());
}

function safeNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
}

function withPartFallback(layout: LayoutDefinition): LayoutPartDefinition[] {
  if (Array.isArray(layout.parts) && layout.parts.length > 0) {
    return layout.parts;
  }
  return [
    {
      id: "body",
      type: "body",
      label: "Body",
      height: layout.canvas.height
    }
  ];
}

function buildBaselineRanges(layout: LayoutDefinition, parts: LayoutPartDefinition[]): Array<{ partId: string; top: number; bottom: number }> {
  const ranges: Array<{ partId: string; top: number; bottom: number }> = [];
  let cursor = 0;
  for (const part of parts) {
    const height = Math.max(MIN_PART_HEIGHT_UNITS, safeNumber(part.height, 0));
    ranges.push({
      partId: part.id,
      top: cursor,
      bottom: cursor + height
    });
    cursor += height;
  }
  return ranges;
}

function resolvePartForObjectY(
  y: number,
  ranges: Array<{ partId: string; top: number; bottom: number }>,
  fallbackPartId: string
): string {
  const center = y;
  for (const range of ranges) {
    if (center >= range.top && center < range.bottom) {
      return range.partId;
    }
  }
  return fallbackPartId;
}

function inferHeightFromContent(layout: LayoutDefinition, partId: string, fallbackHeight: number): number {
  const baselineParts = withPartFallback(layout);
  const baselineRanges = buildBaselineRanges(layout, baselineParts);
  const fallbackPartId = baselineParts.find((entry) => isBodyPart(entry.type))?.id ?? baselineParts[0].id;
  const maxBottom = layout.components.reduce((acc, component) => {
    if (!component.position) {
      return acc;
    }
    if (String(component.props.portalParentComponentId ?? "").trim()) {
      return acc;
    }
    const objectPartId = resolvePartForObjectY(component.position.y, baselineRanges, fallbackPartId);
    if (objectPartId !== partId) {
      return acc;
    }
    const range = baselineRanges.find((entry) => entry.partId === objectPartId);
    if (!range) {
      return acc;
    }
    const relativeBottom = component.position.y + component.position.height - range.top;
    return Math.max(acc, relativeBottom);
  }, 0);
  if (!Number.isFinite(maxBottom) || maxBottom <= 0) {
    return fallbackHeight;
  }
  return Math.max(fallbackHeight, maxBottom);
}

function partHeightUnits(
  layout: LayoutDefinition,
  part: LayoutPartDefinition,
  baselineRanges: Array<{ partId: string; top: number; bottom: number }>
): number {
  const explicit = safeNumber(part.height, NaN);
  if (Number.isFinite(explicit) && explicit > 0) {
    return Math.max(MIN_PART_HEIGHT_UNITS, explicit);
  }
  const fallbackFromContent = inferHeightFromContent(layout, part.id, MIN_PART_HEIGHT_UNITS);
  const range = baselineRanges.find((entry) => entry.partId === part.id);
  if (range) {
    return Math.max(MIN_PART_HEIGHT_UNITS, range.bottom - range.top, fallbackFromContent);
  }
  return Math.max(MIN_PART_HEIGHT_UNITS, fallbackFromContent);
}

function runtimeWidthUnits(layout: LayoutDefinition, viewport: LayoutViewport): number {
  const zoom = Math.max(0.1, safeNumber(viewport.zoom, 1));
  const viewportUnits = safeNumber(viewport.widthPx, layout.canvas.width) / zoom;
  return Math.max(layout.canvas.width, viewportUnits);
}

function runtimeHeightUnits(layout: LayoutDefinition, viewport: LayoutViewport): number {
  const zoom = Math.max(0.1, safeNumber(viewport.zoom, 1));
  const viewportUnits = safeNumber(viewport.heightPx, layout.canvas.height) / zoom;
  return Math.max(layout.canvas.height, viewportUnits);
}

export function computePartMetrics(
  layout: LayoutDefinition,
  viewport: LayoutViewport
): {
  parts: InternalPartMetrics[];
  totalHeightPx: number;
  runtimeWidthPx: number;
  runtimeHeightPx: number;
} {
  const zoom = Math.max(0.1, safeNumber(viewport.zoom, 1));
  const parts = withPartFallback(layout);
  const baselineRanges = buildBaselineRanges(layout, parts);
  const baseHeightsUnits = parts.map((part) => partHeightUnits(layout, part, baselineRanges));
  const totalBaseHeightUnits = baseHeightsUnits.reduce((sum, value) => sum + value, 0);
  const targetHeightUnits = runtimeHeightUnits(layout, viewport);
  const targetWidthUnits = runtimeWidthUnits(layout, viewport);

  const bodyIndices = parts
    .map((part, index) => ({ part, index }))
    .filter((entry) => isBodyPart(entry.part.type))
    .map((entry) => entry.index);

  const runtimeHeightsUnits = [...baseHeightsUnits];
  if (bodyIndices.length > 0) {
    const fixedHeightUnits = runtimeHeightsUnits.reduce((sum, height, index) => {
      return bodyIndices.includes(index) ? sum : sum + height;
    }, 0);
    const baseBodyHeightUnits = runtimeHeightsUnits.reduce((sum, height, index) => {
      return bodyIndices.includes(index) ? sum + height : sum;
    }, 0);
    const desiredBodyHeightUnits = Math.max(baseBodyHeightUnits, targetHeightUnits - fixedHeightUnits);
    const bodyScale = baseBodyHeightUnits > 0 ? desiredBodyHeightUnits / baseBodyHeightUnits : 1;
    for (const bodyIndex of bodyIndices) {
      runtimeHeightsUnits[bodyIndex] = Math.max(
        MIN_PART_HEIGHT_UNITS,
        Math.round(runtimeHeightsUnits[bodyIndex] * bodyScale * 1000) / 1000
      );
    }
  }

  const output: InternalPartMetrics[] = [];
  let runtimeTopUnits = 0;
  let baselineTopUnits = 0;
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    const baseHeightUnits = baseHeightsUnits[index];
    const heightUnits = runtimeHeightsUnits[index];
    const topPx = runtimeTopUnits * zoom;
    const heightPx = heightUnits * zoom;
    const contentRectPx: Rect = {
      x: 0,
      y: topPx,
      w: targetWidthUnits * zoom,
      h: heightPx
    };
    output.push({
      partId: part.id,
      partType: part.type,
      topPx,
      heightPx,
      contentRectPx,
      index,
      topUnits: runtimeTopUnits,
      heightUnits,
      contentRectUnits: {
        x: 0,
        y: runtimeTopUnits,
        w: targetWidthUnits,
        h: heightUnits
      },
      baselineTopUnits,
      baselineHeightUnits: baseHeightUnits
    });
    runtimeTopUnits += heightUnits;
    baselineTopUnits += baseHeightUnits;
  }

  return {
    parts: output,
    totalHeightPx: runtimeTopUnits * zoom,
    runtimeWidthPx: targetWidthUnits * zoom,
    runtimeHeightPx: Math.max(runtimeTopUnits * zoom, targetHeightUnits * zoom, totalBaseHeightUnits * zoom)
  };
}

export function resolvePartIdForObject(
  layout: LayoutDefinition,
  objectYUnits: number
): string {
  const parts = withPartFallback(layout);
  const baselineRanges = buildBaselineRanges(layout, parts);
  const bodyPart = parts.find((part) => isBodyPart(part.type)) ?? parts[0];
  return resolvePartForObjectY(objectYUnits, baselineRanges, bodyPart.id);
}

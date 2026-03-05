import type { AnchorSpec, Rect } from "./types.ts";

function round(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 1000) / 1000;
}

function sanitizeRect(rect: Rect): Rect {
  return {
    x: Number.isFinite(rect.x) ? rect.x : 0,
    y: Number.isFinite(rect.y) ? rect.y : 0,
    w: Number.isFinite(rect.w) ? Math.max(1, rect.w) : 1,
    h: Number.isFinite(rect.h) ? Math.max(1, rect.h) : 1
  };
}

export function applyAnchors(options: {
  baselineObjectRect: Rect;
  baselineContainerRect: Rect;
  currentContainerRect: Rect;
  anchors: AnchorSpec;
  minimumWidth?: number;
  minimumHeight?: number;
}): Rect {
  const baselineObjectRect = sanitizeRect(options.baselineObjectRect);
  const baselineContainerRect = sanitizeRect(options.baselineContainerRect);
  const currentContainerRect = sanitizeRect(options.currentContainerRect);
  const minW = Number.isFinite(options.minimumWidth) ? Math.max(1, Number(options.minimumWidth)) : 1;
  const minH = Number.isFinite(options.minimumHeight) ? Math.max(1, Number(options.minimumHeight)) : 1;
  const dx = currentContainerRect.w - baselineContainerRect.w;
  const dy = currentContainerRect.h - baselineContainerRect.h;

  let x = baselineObjectRect.x;
  let y = baselineObjectRect.y;
  let w = baselineObjectRect.w;
  let h = baselineObjectRect.h;

  if (options.anchors.left && options.anchors.right) {
    w = Math.max(minW, baselineObjectRect.w + dx);
  } else if (!options.anchors.left && options.anchors.right) {
    x = baselineObjectRect.x + dx;
  } else if (!options.anchors.left && !options.anchors.right) {
    // FileMaker parity approximation for unsupported center anchors:
    // keep baseline x for deterministic behavior.
    x = baselineObjectRect.x;
  }

  if (options.anchors.top && options.anchors.bottom) {
    h = Math.max(minH, baselineObjectRect.h + dy);
  } else if (!options.anchors.top && options.anchors.bottom) {
    y = baselineObjectRect.y + dy;
  } else if (!options.anchors.top && !options.anchors.bottom) {
    y = baselineObjectRect.y;
  }

  return {
    x: round(x),
    y: round(y),
    w: round(Math.max(minW, w)),
    h: round(Math.max(minH, h))
  };
}

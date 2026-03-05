export type VirtualWindowOptions = {
  totalCount: number;
  scrollTop: number;
  viewportHeight: number;
  rowHeight: number;
  overscan?: number;
  fullRenderThreshold?: number;
};

export type VirtualWindow = {
  startIndex: number;
  endIndexExclusive: number;
  topSpacerPx: number;
  bottomSpacerPx: number;
  visibleCount: number;
};

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, Math.round(value)));
}

function normalizeCount(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.round(value));
}

function normalizePositive(value: number, fallback: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return value;
}

export function computeVirtualWindow(options: VirtualWindowOptions): VirtualWindow {
  const totalCount = normalizeCount(options.totalCount);
  if (totalCount <= 0) {
    return {
      startIndex: 0,
      endIndexExclusive: 0,
      topSpacerPx: 0,
      bottomSpacerPx: 0,
      visibleCount: 0
    };
  }

  const rowHeight = normalizePositive(options.rowHeight, 32);
  const viewportHeight = normalizePositive(options.viewportHeight, rowHeight * 8);
  const overscan = clampInteger(options.overscan ?? 8, 0, 200);
  const fullRenderThreshold = clampInteger(options.fullRenderThreshold ?? 160, 1, 100_000);

  if (totalCount <= fullRenderThreshold) {
    return {
      startIndex: 0,
      endIndexExclusive: totalCount,
      topSpacerPx: 0,
      bottomSpacerPx: 0,
      visibleCount: totalCount
    };
  }

  const maxScrollTop = Math.max(0, totalCount * rowHeight - viewportHeight);
  const scrollTop = Math.max(0, Math.min(maxScrollTop, Number(options.scrollTop) || 0));
  const firstVisibleIndex = Math.floor(scrollTop / rowHeight);
  const viewportRows = Math.max(1, Math.ceil(viewportHeight / rowHeight));

  const startIndex = clampInteger(firstVisibleIndex - overscan, 0, totalCount - 1);
  const endIndexExclusive = clampInteger(
    firstVisibleIndex + viewportRows + overscan,
    startIndex + 1,
    totalCount
  );

  const topSpacerPx = startIndex * rowHeight;
  const bottomSpacerPx = Math.max(0, (totalCount - endIndexExclusive) * rowHeight);

  return {
    startIndex,
    endIndexExclusive,
    topSpacerPx,
    bottomSpacerPx,
    visibleCount: endIndexExclusive - startIndex
  };
}


import type { FoundSetDataSource, FoundSetQuerySpec, FoundSetState } from "./types";

type CreateFoundSetInput = {
  id?: string;
  dataSource: FoundSetDataSource;
  querySpec?: FoundSetQuerySpec;
  recordIds?: string[];
  pages?: Record<number, string[]>;
  pageSize?: number;
  currentIndex?: number;
  totalCount?: number;
  now?: number;
};

type RefreshFoundSetInput = {
  foundSet: FoundSetState;
  recordIds?: string[];
  pages?: Record<number, string[]>;
  pageSize?: number;
  totalCount?: number;
  preserveRecordId?: string;
  now?: number;
};

type AttachFoundSetPageInput = {
  foundSet: FoundSetState;
  pageIndex: number;
  recordIds: string[];
  totalCount?: number;
  now?: number;
};

function safeIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  if (!Number.isFinite(index)) {
    return 0;
  }
  return Math.max(0, Math.min(length - 1, Math.round(index)));
}

function normalizeRecordIds(recordIds: string[] | undefined): string[] {
  return (recordIds ?? []).map((entry) => String(entry ?? "").trim()).filter((entry) => entry.length > 0);
}

function normalizePageMap(rawPages: Record<number, string[]> | undefined): Record<number, string[]> {
  if (!rawPages || typeof rawPages !== "object") {
    return {};
  }
  const normalized: Record<number, string[]> = {};
  for (const [rawPageIndex, recordIds] of Object.entries(rawPages)) {
    const pageIndex = Number.parseInt(rawPageIndex, 10);
    if (!Number.isFinite(pageIndex) || pageIndex < 0) {
      continue;
    }
    normalized[pageIndex] = normalizeRecordIds(recordIds);
  }
  return normalized;
}

function normalizePageSize(pageSize: number | undefined, fallback: number): number {
  if (!Number.isFinite(pageSize) || Number(pageSize) <= 0) {
    return fallback;
  }
  return Math.max(1, Math.round(Number(pageSize)));
}

function pageIndexesFromMap(pages: Record<number, string[]>): number[] {
  return Object.keys(pages)
    .map((key) => Number.parseInt(key, 10))
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((left, right) => left - right);
}

function recordIdAtIndexFromPages(foundSet: FoundSetState, index: number): string | undefined {
  const pageSize = normalizePageSize(foundSet.pageSize, 200);
  const pageIndex = Math.floor(index / pageSize);
  const inPageIndex = index % pageSize;
  const page = foundSet.pages[pageIndex];
  if (!Array.isArray(page) || page.length === 0) {
    return undefined;
  }
  return page[inPageIndex];
}

function mergedTotalCount(
  recordIds: string[],
  pages: Record<number, string[]>,
  totalCount: number | undefined
): number {
  const normalizedTotal = Math.round(Number(totalCount ?? 0) || 0);
  const pageKnownCount = Object.values(pages).reduce((sum, entries) => sum + entries.length, 0);
  return Math.max(recordIds.length, pageKnownCount, normalizedTotal);
}

function nextFoundSetId(): string {
  return `foundset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createFoundSet(input: CreateFoundSetInput): FoundSetState {
  const recordIds = normalizeRecordIds(input.recordIds);
  const providedPages = normalizePageMap(input.pages);
  const pageSize = normalizePageSize(input.pageSize, recordIds.length > 0 ? recordIds.length : 200);
  const pages = Object.keys(providedPages).length > 0 ? providedPages : recordIds.length > 0 ? { 0: recordIds } : {};
  const loadedPageIndexes = pageIndexesFromMap(pages);
  const totalCount = mergedTotalCount(recordIds, pages, input.totalCount);
  return {
    id: input.id?.trim() || nextFoundSetId(),
    dataSource: input.dataSource,
    querySpec: input.querySpec ?? {},
    recordIds,
    pageSize,
    pages,
    loadedPageIndexes,
    totalCount,
    currentIndex: safeIndex(Number(input.currentIndex ?? 0), Math.max(1, totalCount)),
    lastRefreshedAt: Number(input.now ?? Date.now())
  };
}

export function currentFoundSetRecordId(foundSet: FoundSetState): string | undefined {
  const totalCount = Math.max(0, Math.round(Number(foundSet.totalCount) || 0));
  if (totalCount <= 0) {
    return undefined;
  }
  const index = safeIndex(foundSet.currentIndex, totalCount);
  if (foundSet.recordIds.length > 0) {
    return foundSet.recordIds[index];
  }
  return recordIdAtIndexFromPages(foundSet, index);
}

export function goToFoundSetRecord(
  foundSet: FoundSetState,
  target: { index?: number; recordId?: string; mode?: "first" | "prev" | "next" | "last" }
): FoundSetState {
  const length = Math.max(0, Math.round(Number(foundSet.totalCount) || foundSet.recordIds.length));
  if (length === 0) {
    return {
      ...foundSet,
      currentIndex: 0
    };
  }

  let nextIndex = safeIndex(foundSet.currentIndex, length);
  if (typeof target.index === "number") {
    nextIndex = safeIndex(target.index, length);
  } else if (target.recordId) {
    const matchIndex = foundSet.recordIds.findIndex((entry) => entry === target.recordId);
    if (matchIndex >= 0) {
      nextIndex = matchIndex;
    } else {
      for (const pageIndex of foundSet.loadedPageIndexes) {
        const page = foundSet.pages[pageIndex] ?? [];
        const inPageIndex = page.findIndex((entry) => entry === target.recordId);
        if (inPageIndex >= 0) {
          nextIndex = pageIndex * foundSet.pageSize + inPageIndex;
          break;
        }
      }
    }
  } else if (target.mode === "first") {
    nextIndex = 0;
  } else if (target.mode === "last") {
    nextIndex = Math.max(0, length - 1);
  } else if (target.mode === "prev") {
    nextIndex = safeIndex(foundSet.currentIndex - 1, length);
  } else if (target.mode === "next") {
    nextIndex = safeIndex(foundSet.currentIndex + 1, length);
  }

  if (nextIndex === foundSet.currentIndex) {
    return foundSet;
  }

  return {
    ...foundSet,
    currentIndex: nextIndex
  };
}

export function refreshFoundSet(input: RefreshFoundSetInput): FoundSetState {
  const nextRecordIds = normalizeRecordIds(input.recordIds);
  const nextPageSize = normalizePageSize(input.pageSize, input.foundSet.pageSize);
  const nextPages =
    input.pages && Object.keys(input.pages).length > 0
      ? normalizePageMap(input.pages)
      : nextRecordIds.length > 0
        ? { 0: nextRecordIds }
        : input.foundSet.pages;
  const nextLoadedPages = pageIndexesFromMap(nextPages);
  const preserveRecordId = input.preserveRecordId?.trim();
  const previousRecordId = preserveRecordId || currentFoundSetRecordId(input.foundSet);
  const nextTotalCount = mergedTotalCount(nextRecordIds, nextPages, input.totalCount);
  let nextIndex = safeIndex(input.foundSet.currentIndex, Math.max(1, nextTotalCount));

  if (previousRecordId) {
    const matchedInRecordIds = nextRecordIds.findIndex((entry) => entry === previousRecordId);
    if (matchedInRecordIds >= 0) {
      nextIndex = matchedInRecordIds;
    } else {
      for (const pageIndex of nextLoadedPages) {
        const page = nextPages[pageIndex] ?? [];
        const matchedInPage = page.findIndex((entry) => entry === previousRecordId);
        if (matchedInPage >= 0) {
          nextIndex = pageIndex * nextPageSize + matchedInPage;
          break;
        }
      }
    }
  }

  return {
    ...input.foundSet,
    recordIds: nextRecordIds,
    pageSize: nextPageSize,
    pages: nextPages,
    loadedPageIndexes: nextLoadedPages,
    totalCount: nextTotalCount,
    currentIndex: nextIndex,
    lastRefreshedAt: Number(input.now ?? Date.now())
  };
}

export function attachFoundSetRecord(foundSet: FoundSetState, recordId: string, asCurrent = false): FoundSetState {
  const normalized = recordId.trim();
  if (!normalized) {
    return foundSet;
  }
  const existingIndex = foundSet.recordIds.findIndex((entry) => entry === normalized);
  if (existingIndex >= 0) {
    if (!asCurrent || existingIndex === foundSet.currentIndex) {
      return foundSet;
    }
    return {
      ...foundSet,
      currentIndex: existingIndex
    };
  }

  const nextRecordIds = [...foundSet.recordIds, normalized];
  const nextPages = {
    ...foundSet.pages,
    0: nextRecordIds
  };
  return {
    ...foundSet,
    recordIds: nextRecordIds,
    pages: nextPages,
    loadedPageIndexes: pageIndexesFromMap(nextPages),
    totalCount: Math.max(foundSet.totalCount, nextRecordIds.length),
    currentIndex: asCurrent ? nextRecordIds.length - 1 : foundSet.currentIndex,
    lastRefreshedAt: Date.now()
  };
}

export function attachFoundSetPage(input: AttachFoundSetPageInput): FoundSetState {
  const pageIndex = Math.max(0, Math.round(Number(input.pageIndex) || 0));
  const pageRecordIds = normalizeRecordIds(input.recordIds);
  const nextPages = {
    ...input.foundSet.pages,
    [pageIndex]: pageRecordIds
  };
  const nextLoadedPageIndexes = pageIndexesFromMap(nextPages);
  const nextTotalCount = mergedTotalCount(input.foundSet.recordIds, nextPages, input.totalCount ?? input.foundSet.totalCount);
  return {
    ...input.foundSet,
    pages: nextPages,
    loadedPageIndexes: nextLoadedPageIndexes,
    totalCount: nextTotalCount,
    lastRefreshedAt: Number(input.now ?? Date.now())
  };
}


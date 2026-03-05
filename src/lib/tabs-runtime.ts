import type { LayoutComponent } from "./layout-model";

export function parseActivePanelTabsToken(raw: string | null | undefined): Record<string, number> {
  const token = String(raw ?? "").trim();
  if (!token) {
    return {};
  }
  const output: Record<string, number> = {};
  for (const entry of token.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) {
      continue;
    }
    const separator = trimmed.indexOf(":");
    if (separator <= 0) {
      continue;
    }
    const panelId = trimmed.slice(0, separator).trim();
    const index = Number.parseInt(trimmed.slice(separator + 1).trim(), 10);
    if (!panelId || !Number.isFinite(index) || index < 0) {
      continue;
    }
    output[panelId] = index;
  }
  return output;
}

export function serializeActivePanelTabsToken(activeByPanelId: Record<string, number>): string {
  return Object.entries(activeByPanelId)
    .filter(([panelId, index]) => panelId.trim().length > 0 && Number.isFinite(index) && index >= 0)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([panelId, index]) => `${panelId}:${Math.round(index)}`)
    .join(",");
}

export function clampPanelTabIndex(index: number, tabCount: number): number {
  if (!Number.isFinite(index)) {
    return 0;
  }
  const safeTabCount = Math.max(1, Math.round(tabCount) || 1);
  return Math.max(0, Math.min(safeTabCount - 1, Math.round(index)));
}

function parseGroupTabHint(groupId: string | undefined, panelId: string, tabCount: number): number | null {
  const raw = String(groupId ?? "").trim();
  if (!raw) {
    return null;
  }
  const normalizedPanel = panelId.trim();
  if (!normalizedPanel) {
    return null;
  }
  const regex = new RegExp(`^${normalizedPanel}[:|/]tab[:|/](\\d+)$`, "i");
  const match = raw.match(regex);
  if (!match) {
    return null;
  }
  const value = Number.parseInt(match[1] ?? "", 10);
  if (!Number.isFinite(value)) {
    return null;
  }
  return clampPanelTabIndex(value, tabCount);
}

export function inferPanelChildTabIndex(
  panel: LayoutComponent,
  child: LayoutComponent,
  tabCount: number
): number | null {
  if (panel.id === child.id || panel.type !== "panel") {
    return null;
  }
  const clampedTabCount = Math.max(1, Math.round(tabCount) || 1);
  const groupHint = parseGroupTabHint(child.props.groupId, panel.id, clampedTabCount);
  if (groupHint != null) {
    return groupHint;
  }
  if (clampedTabCount === 1 || panel.props.panelType === "slide") {
    return 0;
  }

  const panelX = panel.position.x;
  const panelY = panel.position.y;
  const panelWidth = Math.max(1, panel.position.width);
  const panelHeight = Math.max(1, panel.position.height);
  const panelHeadHeight = 28;
  const panelBodyTop = panelY + panelHeadHeight;
  const panelBottom = panelY + panelHeight;

  const childCenterX = child.position.x + child.position.width / 2;
  const childCenterY = child.position.y + child.position.height / 2;
  const insideBodyBounds =
    childCenterX >= panelX &&
    childCenterX <= panelX + panelWidth &&
    childCenterY >= panelBodyTop &&
    childCenterY <= panelBottom;

  if (!insideBodyBounds) {
    return null;
  }

  const segmentWidth = panelWidth / clampedTabCount;
  const relativeX = childCenterX - panelX;
  const inferred = Math.floor(relativeX / Math.max(1, segmentWidth));
  return clampPanelTabIndex(inferred, clampedTabCount);
}

export function isComponentVisibleForActivePanelTab(
  panel: LayoutComponent,
  child: LayoutComponent,
  activeTabIndex: number,
  tabCount: number
): boolean {
  const childTab = inferPanelChildTabIndex(panel, child, tabCount);
  if (childTab == null) {
    return true;
  }
  return childTab === clampPanelTabIndex(activeTabIndex, tabCount);
}

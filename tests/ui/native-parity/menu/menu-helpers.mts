import { expect } from "@playwright/test";

export const LAYOUT_NAME = "Asset Details";

function encodedLayout(layoutName: string): string {
  return encodeURIComponent(layoutName);
}

export async function gotoLayoutMode(page: any, layoutName = LAYOUT_NAME) {
  await page.goto(`/layouts/${encodedLayout(layoutName)}/edit?uiTest=1`);
  await expect(page.locator(".fm-layout-menubar").first()).toBeVisible();
}

export async function gotoBrowseMode(
  page: any,
  layoutName = LAYOUT_NAME,
  mode: "browse" | "find" | "preview" = "browse"
) {
  const suffix = mode === "browse" ? "" : `&mode=${mode}`;
  await page.goto(`/layouts/${encodedLayout(layoutName)}/browse?uiTest=1${suffix}`);
  await expect(page.locator(".fm-layout-menubar").first()).toBeVisible();
}

export async function openTopMenu(page: any, label: string) {
  const trigger = page.locator(`.fm-layout-menubar .fm-layout-menubar-button:has-text("${label}")`).first();
  await expect(trigger).toBeVisible();
  await trigger.click();
  const menu = page.locator('.fm-view-menu[role="menu"]').filter({ has: page.locator(":scope button") }).last();
  await expect(menu).toBeVisible();
  return menu;
}

export async function openManageSubmenu(page: any) {
  return openFileSubmenu(page, "Manage");
}

export async function openFileSubmenu(page: any, label: "Manage" | "Sharing") {
  await openTopMenu(page, "File");
  const trigger = page.locator(`.fm-view-menu .fm-view-menu-item.has-submenu:has-text("${label}")`).first();
  await expect(trigger).toBeVisible();
  await trigger.click();
  const submenu = page.locator(`.fm-view-submenu[role="menu"][aria-label="${label}"]`).last();
  await expect(submenu).toBeVisible();
  return submenu;
}

export async function getVisibleButtonLabels(container: any) {
  const buttons = container.locator('button:not([style*="display: none"])');
  const count = await buttons.count();
  const labels: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const raw = (await buttons.nth(index).innerText()).replace(/\s+/g, " ").trim();
    if (!raw) {
      continue;
    }
    labels.push(raw.replace(/^✓\s*/, ""));
  }
  return labels;
}

export async function clearMenuCommandHistory(page: any) {
  await page.evaluate(() => {
    const hook = (window as any).__fmMenuCommandBus;
    if (hook && typeof hook.clear === "function") {
      hook.clear();
    }
  });
}

export async function getMenuCommandHistory(page: any): Promise<Array<{ commandId: string; source: string; timestamp: number }>> {
  return page.evaluate(() => {
    const hook = (window as any).__fmMenuCommandBus;
    if (!hook || typeof hook.getHistory !== "function") {
      return [];
    }
    return hook.getHistory();
  });
}

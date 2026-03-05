import { test, expect } from "@playwright/test";
import { gotoLayoutMode, openManageSubmenu } from "./menu-helpers.mts";

const standaloneManageEntries: Array<{ label: string; title: string }> = [
  { label: "Security...", title: "Manage Security" },
  { label: "Value Lists...", title: "Manage Value Lists" },
  { label: "Layouts...", title: "Manage Layouts" },
  { label: "Scripts...", title: "Manage Scripts" }
];

test("File > Manage opens standalone dialogs per section (no embedded section rail)", async ({ page }) => {
  await gotoLayoutMode(page);

  for (const entry of standaloneManageEntries) {
    const submenu = await openManageSubmenu(page);
    const trigger = submenu.locator(`button:has-text("${entry.label}")`).first();
    await expect(trigger).toBeVisible();
    await expect(trigger).toBeEnabled();
    await trigger.click();

    const dialog = page.locator(".app-layer-manage-center-modal.app-layer-manage-center-modal-standalone").last();
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".app-layer-manage-center-header h3")).toHaveText(entry.title);
    await expect(dialog.locator(".app-layer-manage-center-nav")).toHaveCount(0);

    await dialog.locator(".app-layer-manage-center-header button").first().click();
    await expect(dialog).toHaveCount(0);
  }
});

test("File > Manage > Database opens the dedicated Manage Database dialog", async ({ page }) => {
  await gotoLayoutMode(page);

  const submenu = await openManageSubmenu(page);
  const trigger = submenu.locator('button:has-text("Database...")').first();
  await expect(trigger).toBeVisible();
  await expect(trigger).toBeEnabled();
  await trigger.click();

  const databaseDialog = page.locator(".manage-db-modal").last();
  await expect(databaseDialog).toBeVisible();
  await expect(page.locator(".app-layer-manage-center-modal.app-layer-manage-center-modal-standalone")).toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(databaseDialog).toHaveCount(0);
});

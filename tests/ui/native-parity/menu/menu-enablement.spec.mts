import { test, expect } from "@playwright/test";
import { gotoBrowseMode, gotoLayoutMode, openFileSubmenu, openTopMenu } from "./menu-helpers.mts";

function menuButton(menu: any, label: string) {
  return menu.locator(`button:has-text("${label}")`).first();
}

test("menu enablement: layout mode with no selection vs selected object", async ({ page }) => {
  await gotoLayoutMode(page);

  const editNoSelection = await openTopMenu(page, "Edit");
  await expect(menuButton(editNoSelection, "Cut")).toBeDisabled();

  const firstObject = page.locator(".canvas-item.layout-preview-item").first();
  if ((await firstObject.count()) === 0) {
    test.skip(true, "No layout objects available for selection test");
    return;
  }

  await firstObject.click();
  const editWithSelection = await openTopMenu(page, "Edit");
  await expect(menuButton(editWithSelection, "Cut")).toBeEnabled();
});

test("menu enablement: browse clean vs dirty record", async ({ page }) => {
  await gotoBrowseMode(page);

  const recordsMenu = await openTopMenu(page, "Records");
  await expect(menuButton(recordsMenu, "New Record")).toBeEnabled();

  const editable = page
    .locator(
      ".runtime-canvas-wrap input:not([type='hidden']):not([disabled]), .runtime-canvas-wrap textarea:not([disabled]), .runtime-canvas-wrap select:not([disabled])"
    )
    .first();

  if ((await editable.count()) === 0) {
    test.skip(true, "No editable field available on browse fixture");
    return;
  }

  await editable.click();
  await editable.fill("menu-enable-dirty");

  const recordsDirty = await openTopMenu(page, "Records");
  const revert = menuButton(recordsDirty, "Revert Record");
  if ((await revert.count()) > 0) {
    await expect(revert).toBeEnabled();
  }
});

test("menu enablement: find mode shows find actions", async ({ page }) => {
  await gotoBrowseMode(page);
  const findButton = page.locator(".fm-status-main .fm-find-split-main").first();
  if ((await findButton.count()) === 0) {
    test.skip(true, "Find button unavailable on fixture layout");
    return;
  }
  await findButton.click();

  const recordsMenu = await openTopMenu(page, "Records");
  const performFind = menuButton(recordsMenu, "Perform Find");
  const cancelFind = menuButton(recordsMenu, "Cancel Find");

  await expect(performFind).toBeEnabled();
  await expect(cancelFind).toBeEnabled();

  const manageSubmenu = await openFileSubmenu(page, "Manage");
  await expect(manageSubmenu.locator("button").first()).toBeVisible();
});

test("menu enablement: preview mode checks Preview and disables record writes", async ({ page }) => {
  await gotoBrowseMode(page, "Asset Details", "preview");

  const viewMenu = await openTopMenu(page, "View");
  const browseMode = menuButton(viewMenu, "Browse Mode");
  const previewMode = menuButton(viewMenu, "Preview Mode");
  await expect(browseMode).toBeVisible();
  await expect(previewMode).toBeVisible();
  await expect(previewMode).toContainText("✓");
  await expect(browseMode).not.toContainText("✓");

  const recordsMenu = await openTopMenu(page, "Records");
  const newRecord = menuButton(recordsMenu, "New Record");
  await expect(newRecord).toBeDisabled();
});

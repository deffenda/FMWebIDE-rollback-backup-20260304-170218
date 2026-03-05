import { test, expect } from "@playwright/test";
import {
  browseModeTopLevelMenuLabels,
  fileManageMenuItems,
  fileSharingMenuItems,
  layoutModeTopLevelMenuLabels
} from "../../../../src/menu/filemakerMenuSpec.ts";
import {
  gotoBrowseMode,
  gotoLayoutMode,
  openFileSubmenu,
  openManageSubmenu,
  getVisibleButtonLabels,
  openTopMenu
} from "./menu-helpers.mts";

test("menu structure: top-level labels and no Workspace menu entries", async ({ page }) => {
  await gotoLayoutMode(page);
  const topButtons = page.locator(".fm-layout-menubar .fm-layout-menubar-button");
  const labels = await topButtons.allInnerTexts();
  const normalized = labels.map((entry) => entry.replace(/\s+/g, " ").trim());

  expect(normalized).toEqual([...layoutModeTopLevelMenuLabels]);
  expect(normalized.some((entry) => /workspace/i.test(entry))).toBeFalsy();

  await gotoBrowseMode(page);
  const browseLabels = (await page
    .locator(".fm-layout-menubar .fm-layout-menubar-button")
    .allInnerTexts()).map((entry) => entry.replace(/\s+/g, " ").trim());
  expect(browseLabels).toEqual([...browseModeTopLevelMenuLabels]);
  expect(browseLabels.some((entry) => /workspace/i.test(entry))).toBeFalsy();
});

test("menu structure: File > Manage subtree matches canonical ordering", async ({ page }) => {
  await gotoLayoutMode(page);
  const layoutManageSubmenu = await openManageSubmenu(page);
  const labels = await getVisibleButtonLabels(layoutManageSubmenu);
  const expected = fileManageMenuItems.map((entry) => entry.label);
  expect(labels).toEqual(expected);

  await gotoBrowseMode(page);
  const browseManageSubmenu = await openManageSubmenu(page);
  const browseManageLabels = await getVisibleButtonLabels(browseManageSubmenu);
  expect(browseManageLabels).toEqual(expected);

  const sharingSubmenu = await openFileSubmenu(page, "Sharing");
  const sharingLabels = await getVisibleButtonLabels(sharingSubmenu);
  const sharingExpected = fileSharingMenuItems.map((entry) => entry.label);
  expect(sharingLabels).toEqual(sharingExpected);
});

test("menu structure: Window menu does not include workspace/app-layer-default noise", async ({ page }) => {
  await gotoLayoutMode(page);
  const windowMenu = await openTopMenu(page, "Window");
  const labels = await getVisibleButtonLabels(windowMenu);
  expect(labels.some((entry) => /workspace/i.test(entry))).toBeFalsy();
  expect(labels.some((entry) => /app-layer-default/i.test(entry))).toBeFalsy();
  expect(labels.some((entry) => /app-layer-write/i.test(entry))).toBeFalsy();
});

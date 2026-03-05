import { expect } from "@playwright/test";

export async function assertModeHook(page: any, expectedMode: "layout" | "browse") {
  const state = await page.evaluate(() => window.__FMWEB_NATIVE_UI_TEST__?.getState?.() ?? null);
  expect(state?.mode).toBe(expectedMode);
}

export async function assertLayoutIdHook(page: any, expectedLayoutId: string) {
  const state = await page.evaluate(() => window.__FMWEB_NATIVE_UI_TEST__?.getState?.() ?? null);
  expect(String(state?.layoutId ?? "")).toContain(expectedLayoutId);
}

export async function assertStatusToolbarVisible(page: any) {
  await expect(page.locator(".fm-status-area, .fm-layout-status-area").first()).toBeVisible();
}

export async function assertTopMenuOpen(page: any, menuAriaLabel: string) {
  await expect(page.getByRole("menu", { name: menuAriaLabel }).first()).toBeVisible();
}

export async function assertFindModeActive(page: any) {
  await expect(page.locator(".fm-status-main button:has-text('Perform Find'), .fm-status-main button:has-text('Cancel Find')").first()).toBeVisible();
}

export async function assertPreviewModeActive(page: any) {
  await expect(page.locator(".fm-preview-pill:has-text('Preview Mode'), .fm-status-sub button:has-text('Print')").first()).toBeVisible();
}

export async function assertViewTabSelected(page: any, label: string) {
  const tab = page.locator(`.fm-view-switch button:has-text('${label}')`).first();
  await expect(tab).toHaveAttribute("aria-selected", "true");
}

export async function assertFocusOnFirstEditableField(page: any) {
  const editable = page.locator("input:not([type='hidden']):not([disabled]), textarea:not([disabled]), select:not([disabled])").first();
  await editable.click();
  await expect(editable).toBeFocused();
}

export async function assertDirtyStatePill(page: any, expected: boolean) {
  const pill = page.locator(".fm-preview-pill.staged:has-text('Uncommitted changes')");
  if (expected) {
    await expect(pill.first()).toBeVisible();
  } else {
    await expect(pill).toHaveCount(0);
  }
}

export async function assertModeSeparationLayout(page: any) {
  await expect(page.locator(".runtime-canvas-wrap")).toHaveCount(0);
}

export async function assertModeSeparationBrowse(page: any) {
  await expect(page.locator(".layout-safe-mode-banner, .canvas-wrap .fm-layout-menubar")).toHaveCount(0);
}

export async function assertRecordNavigatorInputVisible(page: any) {
  await expect(page.locator("input[aria-label='Current record']").first()).toBeVisible();
}

export async function assertLastActionHook(page: any, commandId: string) {
  const state = await page.evaluate(() => window.__FMWEB_NATIVE_UI_TEST__?.getState?.() ?? null);
  expect(state?.lastCommandId).toBe(commandId);
}

export const invariantCatalog = [
  "assertModeHook",
  "assertLayoutIdHook",
  "assertStatusToolbarVisible",
  "assertTopMenuOpen",
  "assertFindModeActive",
  "assertPreviewModeActive",
  "assertViewTabSelected",
  "assertFocusOnFirstEditableField",
  "assertDirtyStatePill",
  "assertModeSeparationLayout",
  "assertModeSeparationBrowse",
  "assertRecordNavigatorInputVisible",
  "assertLastActionHook"
];

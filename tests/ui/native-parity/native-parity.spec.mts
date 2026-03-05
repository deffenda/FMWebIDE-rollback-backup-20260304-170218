import { test, expect } from "@playwright/test";
import {
  assertDirtyStatePill,
  assertFindModeActive,
  assertFocusOnFirstEditableField,
  assertLastActionHook,
  assertLayoutIdHook,
  assertModeHook,
  assertModeSeparationBrowse,
  assertModeSeparationLayout,
  assertPreviewModeActive,
  assertRecordNavigatorInputVisible,
  assertStatusToolbarVisible,
  assertTopMenuOpen,
  assertViewTabSelected
} from "./assertions.mts";
import { nativeCommandRegistry, type UiMode } from "./commandRegistry.mts";
import {
  assertCoverageThreshold,
  runNativeCommand,
  type CommandResult,
  writeCoverageReport
} from "./engine.mts";

const WORKSPACE_ID = "default";
const LAYOUT_CANDIDATES = ["Asset Details", "Assets", "Asset"];

function encodedLayout(layoutName: string): string {
  return encodeURIComponent(layoutName);
}

async function gotoHome(page: any) {
  await page.goto("/");
  await expect(page.getByText("Layout Mode + Browse Mode")).toBeVisible();
}

async function gotoLayoutMode(page: any, layoutName = LAYOUT_CANDIDATES[0]) {
  await page.goto(`/layouts/${encodedLayout(layoutName)}/edit?workspace=${encodeURIComponent(WORKSPACE_ID)}&uiTest=1`);
  await expect(page.locator(".fm-layout-menubar").first()).toBeVisible();
  return layoutName;
}

async function gotoBrowseMode(page: any, layoutName = LAYOUT_CANDIDATES[0], mode: "browse" | "find" | "preview" = "browse") {
  const suffix = mode === "browse" ? "" : `&mode=${mode}`;
  await page.goto(`/layouts/${encodedLayout(layoutName)}/browse?workspace=${encodeURIComponent(WORKSPACE_ID)}&uiTest=1${suffix}`);
  await expect(page.locator(".fm-status-area").first()).toBeVisible();
  return layoutName;
}

async function enterFindMode(page: any) {
  const findButton = page.locator(".fm-status-main .fm-find-split-main").first();
  if ((await findButton.count()) > 0) {
    await findButton.click();
  }
  await assertFindModeActive(page);
}

async function enterPreviewMode(page: any) {
  const previewTab = page.locator('.fm-view-switch button:has-text("Preview")').first();
  if ((await previewTab.count()) === 0) {
    test.skip(true, "Preview tab unavailable");
    return;
  }
  if (await previewTab.isDisabled()) {
    test.skip(true, "Preview mode disabled by runtime flag");
    return;
  }
  await previewTab.click();
  await assertPreviewModeActive(page);
}

async function withFirstEditable(page: any, fn: (locator: any) => Promise<void>) {
  const editable = page
    .locator(
      ".runtime-canvas-wrap input:not([type='hidden']):not([disabled]), .runtime-canvas-wrap textarea:not([disabled]), .runtime-canvas-wrap select:not([disabled])"
    )
    .first();
  if ((await editable.count()) === 0) {
    test.skip(true, "No editable runtime fields found on fixture layout");
    return;
  }
  await fn(editable);
}

test.describe("Native parity UI smoke + edge-case suite", () => {
  test("01 home page loads and exposes mode links", async ({ page }) => {
    await gotoHome(page);
    await expect(page.locator('a:has-text("Open Layout Mode")')).toBeVisible();
    await expect(page.locator('a:has-text("Open Browse Mode")')).toBeVisible();
  });

  test("02 layout mode installs uiTest hook", async ({ page }) => {
    const layout = await gotoLayoutMode(page);
    await assertModeHook(page, "layout");
    await assertLayoutIdHook(page, layout);
  });

  test("03 layout mode status area and mode-separation invariants", async ({ page }) => {
    await gotoLayoutMode(page);
    await assertStatusToolbarVisible(page);
    await assertModeSeparationLayout(page);
  });

  test("04 layout mode top menubar file menu opens", async ({ page }) => {
    await gotoLayoutMode(page);
    await page.locator('.fm-layout-menubar .fm-layout-menubar-button:has-text("File")').first().click();
    await assertTopMenuOpen(page, "File menu");
  });

  test("05 layout mode top menubar view menu opens", async ({ page }) => {
    await gotoLayoutMode(page);
    await page.locator('.fm-layout-menubar .fm-layout-menubar-button:has-text("View")').first().click();
    await assertTopMenuOpen(page, "View menu");
  });

  test("06 layout object single-select invariant", async ({ page }) => {
    await gotoLayoutMode(page);
    const firstItem = page.locator(".canvas-item.layout-preview-item").first();
    if ((await firstItem.count()) === 0) {
      test.skip(true, "No canvas items available");
      return;
    }
    await firstItem.click();
    await expect(firstItem).toHaveClass(/selected/);
  });

  test("07 layout object multi-select with shift", async ({ page }) => {
    await gotoLayoutMode(page);
    const firstTwo = page.locator(".canvas-item.layout-preview-item");
    if ((await firstTwo.count()) < 2) {
      test.skip(true, "Need at least two canvas items for shift multi-select");
      return;
    }
    await firstTwo.nth(0).click();
    await firstTwo.nth(1).click({ modifiers: ["Shift"] });
    await expect(page.locator(".canvas-item.layout-preview-item.selected")).toHaveCount(2);
  });

  test("07b layout object coverage iteration across visible nodes", async ({ page }) => {
    await gotoLayoutMode(page);
    const nodes = page.locator(".canvas-item.layout-preview-item");
    const count = await nodes.count();
    if (count === 0) {
      test.skip(true, "No layout objects found for iteration");
      return;
    }
    const max = Math.min(8, count);
    for (let index = 0; index < max; index += 1) {
      const node = nodes.nth(index);
      await node.click();
      await expect(node).toHaveClass(/selected/);
    }
  });

  test("07c layout undo/redo smoke keeps selection stable", async ({ page }) => {
    await gotoLayoutMode(page);
    const firstItem = page.locator(".canvas-item.layout-preview-item").first();
    if ((await firstItem.count()) === 0) {
      test.skip(true, "No canvas items available");
      return;
    }
    await firstItem.click();
    await page.keyboard.press("ArrowRight");
    await page.locator('.fm-layout-menubar .fm-layout-menubar-button:has-text("Edit")').first().click();
    const undo = page.locator('.fm-view-menu button:has-text("Undo")').first();
    if ((await undo.count()) > 0 && !(await undo.isDisabled())) {
      await undo.click();
    }
    await expect(firstItem).toHaveClass(/selected/);
  });

  test("08 browse mode installs uiTest hook", async ({ page }) => {
    const layout = await gotoBrowseMode(page);
    await assertModeHook(page, "browse");
    await assertLayoutIdHook(page, layout);
    await assertModeSeparationBrowse(page);
  });

  test("09 browse mode record navigator invariant", async ({ page }) => {
    await gotoBrowseMode(page);
    await assertStatusToolbarVisible(page);
    await assertRecordNavigatorInputVisible(page);
  });

  test("10 browse view switch form/list/table", async ({ page }) => {
    await gotoBrowseMode(page);
    await page.locator('.fm-view-switch button:has-text("List")').first().click();
    await assertViewTabSelected(page, "List");
    await page.locator('.fm-view-switch button:has-text("Table")').first().click();
    await assertViewTabSelected(page, "Table");
    await page.locator('.fm-view-switch button:has-text("Form")').first().click();
    await assertViewTabSelected(page, "Form");
  });

  test("11 browse mode enter find mode and show find controls", async ({ page }) => {
    await gotoBrowseMode(page);
    await enterFindMode(page);
    await assertFindModeActive(page);
  });

  test("12 browse mode preview toggle shows preview controls", async ({ page }) => {
    await gotoBrowseMode(page);
    await enterPreviewMode(page);
    await assertPreviewModeActive(page);
  });

  test("13 focus invariant: click field and typing stays focused", async ({ page }) => {
    await gotoBrowseMode(page);
    await assertFocusOnFirstEditableField(page);
  });

  test("14 dirty-state invariant: edit marks uncommitted changes", async ({ page }) => {
    await gotoBrowseMode(page);
    await withFirstEditable(page, async (editable) => {
      await editable.click();
      await editable.fill("native-parity-dirty-test");
      await assertDirtyStatePill(page, true);
    });
  });

  test("15 commit invariant: save clears dirty marker when available", async ({ page }) => {
    await gotoBrowseMode(page);
    await withFirstEditable(page, async (editable) => {
      await editable.click();
      await editable.fill("native-parity-save-test");
      await assertDirtyStatePill(page, true);
      const saveButton = page.locator('.fm-status-main button:has-text("Save")').first();
      if ((await saveButton.count()) > 0 && !(await saveButton.isDisabled())) {
        await saveButton.click();
        await expect(page.locator(".fm-preview-pill.staged")).toHaveCount(0);
      }
    });
  });

  test("16 revert invariant: cancel exits staged state", async ({ page }) => {
    await gotoBrowseMode(page);
    await withFirstEditable(page, async (editable) => {
      await editable.click();
      await editable.fill("native-parity-cancel-test");
      await assertDirtyStatePill(page, true);
      const cancelButton = page.locator('.fm-status-main button:has-text("Cancel")').first();
      if ((await cancelButton.count()) > 0 && !(await cancelButton.isDisabled())) {
        await cancelButton.click();
        await expect(page.locator(".fm-preview-pill.staged")).toHaveCount(0);
      }
    });
  });

  test("17 portal edge case: first portal input can be focused", async ({ page }) => {
    await gotoBrowseMode(page);
    const portalInput = page
      .locator(
        ".runtime-portal-wrap .runtime-portal-input:not([disabled]), .runtime-portal-wrap input:not([disabled]), .runtime-portal-wrap textarea:not([disabled]), .runtime-portal-wrap select:not([disabled])"
      )
      .first();
    if ((await portalInput.count()) === 0) {
      test.skip(true, "No editable portal controls in this fixture");
      return;
    }
    await portalInput.click();
    await expect(portalInput).toBeFocused();
  });

  test("18 value list edge case: popup/dropdown control opens", async ({ page }) => {
    await gotoBrowseMode(page);
    const popup = page.locator(".runtime-popup-menu").first();
    if ((await popup.count()) === 0) {
      test.skip(true, "No popup value-list controls in current fixture");
      return;
    }
    await popup.click();
    await expect(popup).toBeVisible();
  });

  test("19 date control edge case: calendar-enabled date control visible", async ({ page }) => {
    await gotoBrowseMode(page);
    const dateControl = page.locator(".runtime-date-input").first();
    if ((await dateControl.count()) === 0) {
      test.skip(true, "No date controls found in current fixture");
      return;
    }
    await expect(dateControl).toBeVisible();
  });

  test("20 keyboard focus edge case: tab moves focus to next field", async ({ page }) => {
    await gotoBrowseMode(page);
    const controls = page.locator(
      ".runtime-canvas-wrap input:not([type='hidden']):not([disabled]), .runtime-canvas-wrap textarea:not([disabled]), .runtime-canvas-wrap select:not([disabled])"
    );
    if ((await controls.count()) < 2) {
      test.skip(true, "Not enough editable controls to validate tab navigation");
      return;
    }
    await controls.nth(0).click();
    await expect(controls.nth(0)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(controls.nth(1)).toBeFocused();
  });

  test("21 top menu coverage in browse mode", async ({ page }) => {
    await gotoBrowseMode(page);
    for (const menuLabel of ["File", "Edit", "Records", "View", "Layouts", "Scripts", "Window", "Help"]) {
      const menuButton = page.locator(`.fm-layout-menubar .fm-layout-menubar-button:has-text('${menuLabel}')`).first();
      if ((await menuButton.count()) === 0) {
        continue;
      }
      await menuButton.click();
      await expect(page.locator(".fm-view-menu").first()).toBeVisible();
      await page.keyboard.press("Escape");
    }
  });

  test("22 click-everything command harness + coverage report", async ({ page }) => {
    const results: CommandResult[] = [];

    async function runMode(mode: UiMode) {
      if (mode === "home") {
        await gotoHome(page);
      } else if (mode === "layout") {
        await gotoLayoutMode(page);
      } else if (mode === "browse") {
        await gotoBrowseMode(page);
      } else if (mode === "find") {
        await gotoBrowseMode(page);
        await enterFindMode(page);
      } else {
        await gotoBrowseMode(page);
        await enterPreviewMode(page);
      }

      const modeCommands = nativeCommandRegistry.filter((entry) => entry.modes.includes(mode));
      for (const command of modeCommands) {
        const result = await runNativeCommand(page, command, mode);
        results.push(result);
      }
    }

    for (const mode of ["home", "layout", "browse"] as UiMode[]) {
      await runMode(mode);
    }

    await writeCoverageReport(results);
    assertCoverageThreshold(results);
    await assertLastActionHook(page, results.at(-1)?.id ?? "");
  });
});

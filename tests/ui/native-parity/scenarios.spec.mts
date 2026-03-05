import { test, expect } from "@playwright/test";
import {
  assertDirtyStatePill,
  assertFindModeActive,
  assertFocusOnFirstEditableField,
  assertModeHook,
  assertModeSeparationLayout,
  assertPreviewModeActive,
  assertRecordNavigatorInputVisible,
  assertStatusToolbarVisible,
  assertViewTabSelected
} from "./assertions.mts";
import { selectScenarioRunSet } from "./scenarios/index.mts";
import type { NativeParityScenario, ScenarioStep } from "./scenarios/types.mts";

const WORKSPACE_ID = "default";

function encodedLayout(layoutName: string): string {
  return encodeURIComponent(layoutName);
}

async function gotoHome(page: any) {
  await page.goto("/");
  await expect(page.getByText("Layout Mode + Browse Mode")).toBeVisible();
}

async function gotoLayoutMode(page: any, layoutName: string) {
  await page.goto(`/layouts/${encodedLayout(layoutName)}/edit?workspace=${encodeURIComponent(WORKSPACE_ID)}&uiTest=1`);
  await expect(page.locator(".fm-layout-menubar").first()).toBeVisible();
}

async function gotoBrowseMode(page: any, layoutName: string, mode: "browse" | "find" | "preview" = "browse") {
  const suffix = mode === "browse" ? "" : `&mode=${mode}`;
  await page.goto(`/layouts/${encodedLayout(layoutName)}/browse?workspace=${encodeURIComponent(WORKSPACE_ID)}&uiTest=1${suffix}`);
  await expect(page.locator(".fm-status-area").first()).toBeVisible();
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
  if ((await previewTab.count()) === 0 || (await previewTab.isDisabled())) {
    test.skip(true, "Preview mode unavailable");
  }
  await previewTab.click();
  await assertPreviewModeActive(page);
}

async function resolveFirstEditable(page: any): Promise<any | null> {
  const editable = page
    .locator(
      ".runtime-canvas-wrap input:not([type='hidden']):not([disabled]), .runtime-canvas-wrap textarea:not([disabled]), .runtime-canvas-wrap select:not([disabled])"
    )
    .first();
  if ((await editable.count()) === 0) {
    return null;
  }
  return editable;
}

async function runStep(page: any, step: ScenarioStep): Promise<void> {
  const isOptional = Boolean(step.optional);
  const skipOnMissing = async (reason: string): Promise<void> => {
    if (isOptional) {
      return;
    }
    throw new Error(reason);
  };

  if (step.action === "gotoHome") {
    await gotoHome(page);
    return;
  }
  if (step.action === "gotoLayout") {
    await gotoLayoutMode(page, step.layoutName ?? "Asset Details");
    return;
  }
  if (step.action === "gotoBrowse") {
    await gotoBrowseMode(page, step.layoutName ?? "Asset Details", step.mode ?? "browse");
    return;
  }
  if (step.action === "enterFindMode") {
    await enterFindMode(page);
    return;
  }
  if (step.action === "enterPreviewMode") {
    await enterPreviewMode(page);
    return;
  }
  if (step.action === "switchView") {
    const target = step.value ?? "Form";
    const tab = page.locator(`.fm-view-switch button:has-text("${target}")`).first();
    if ((await tab.count()) === 0) {
      await skipOnMissing(`Missing view switch tab: ${target}`);
      return;
    }
    await tab.click();
    await assertViewTabSelected(page, target);
    return;
  }
  if (step.action === "press") {
    const key = step.key ?? "Tab";
    await page.keyboard.press(key);
    return;
  }
  if (step.action === "fillFirstEditable") {
    const editable = await resolveFirstEditable(page);
    if (!editable) {
      await skipOnMissing("No editable controls available");
      return;
    }
    await editable.click();
    await editable.fill(step.value ?? "");
    return;
  }

  if (!step.selector) {
    await skipOnMissing(`Step selector required for action ${step.action}`);
    return;
  }

  const locator = page.locator(step.selector).first();
  if ((await locator.count()) === 0) {
    await skipOnMissing(`Selector not found: ${step.selector}`);
    return;
  }

  if (step.action === "click") {
    await locator.click();
    return;
  }
  if (step.action === "fill") {
    await locator.click();
    await locator.fill(step.value ?? "");
    return;
  }
  if (step.action === "assertVisible") {
    await expect(locator).toBeVisible();
    return;
  }
  if (step.action === "assertHidden") {
    await expect(locator).toHaveCount(0);
    return;
  }
}

async function runInvariant(page: any, scenario: NativeParityScenario, invariant: string): Promise<void> {
  if (invariant === "assertStatusToolbarVisible") {
    await assertStatusToolbarVisible(page);
    return;
  }
  if (invariant === "assertModeHook") {
    const mode = scenario.prerequisites.mode === "layout" ? "layout" : "browse";
    await assertModeHook(page, mode);
    return;
  }
  if (invariant === "assertRecordNavigatorInputVisible") {
    await assertRecordNavigatorInputVisible(page);
    return;
  }
  if (invariant === "assertFindModeActive") {
    await assertFindModeActive(page);
    return;
  }
  if (invariant === "assertPreviewModeActive") {
    await assertPreviewModeActive(page);
    return;
  }
  if (invariant === "assertFocusOnFirstEditableField") {
    await assertFocusOnFirstEditableField(page);
    return;
  }
  if (invariant === "assertDirtyStatePill") {
    await assertDirtyStatePill(page, true);
    return;
  }
  if (invariant === "assertModeSeparationLayout") {
    await assertModeSeparationLayout(page);
  }
}

const scenarioMode = process.env.UI_SCENARIO_MODE === "full" ? "full" : "smoke";
const scenarioRunSet = selectScenarioRunSet(scenarioMode);

test.describe("Native parity scenario library", () => {
  for (const scenario of scenarioRunSet) {
    test(`[${scenario.id}] ${scenario.title}`, async ({ page }) => {
      if (scenario.prerequisites.mode === "home") {
        await gotoHome(page);
      } else if (scenario.prerequisites.mode === "layout") {
        await gotoLayoutMode(page, scenario.prerequisites.layoutName ?? "Asset Details");
      } else {
        await gotoBrowseMode(page, scenario.prerequisites.layoutName ?? "Asset Details", "browse");
      }

      for (const step of scenario.steps) {
        await runStep(page, step);
      }

      for (const invariant of scenario.expectedInvariants) {
        await runInvariant(page, scenario, invariant);
      }
    });
  }
});

import { expect, test } from "@playwright/test";

test.describe("phase3 style visual regression", () => {
  test("runtime layout styles at 1280x720 (100%)", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/layouts/default/runtime?workspace=default", {
      waitUntil: "networkidle"
    });
    await expect(page.getByTestId("fm-render-surface")).toBeVisible();
    await expect(page.getByTestId("fm-render-surface")).toHaveScreenshot("phase3-styles-1280x720-100.png", {
      maxDiffPixelRatio: 0.03
    });
    expect(consoleErrors).toEqual([]);
  });

  test("runtime layout styles at 150% zoom", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/layouts/default/runtime?workspace=default", {
      waitUntil: "networkidle"
    });
    await expect(page.getByTestId("fm-render-surface")).toBeVisible();
    await Promise.all([
      page.waitForResponse((response) => response.url().includes("/api/runtime/event") && response.request().method() === "POST"),
      page.locator(".webdirect-runtime-zoom select").selectOption("150")
    ]);
    await expect(page.getByTestId("fm-render-surface")).toHaveScreenshot("phase3-styles-1280x720-150.png", {
      maxDiffPixelRatio: 0.03
    });
  });

  test("diagnostics panel shows style stack metadata", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/layouts/default/runtime?workspace=default&diag=1", {
      waitUntil: "networkidle"
    });
    await expect(page.getByTestId("fm-render-surface")).toBeVisible();
    await page.locator("[data-objid]").first().hover();
    await expect(page.locator(".fm-geometry-diagnostics-panel")).toContainText("Style Stack");
  });
});


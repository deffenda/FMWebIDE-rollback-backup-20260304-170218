import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { name: "1280x720", width: 1280, height: 720 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1024x768", width: 1024, height: 768 }
] as const;

test.describe("phase2 geometry visual regression", () => {
  for (const viewport of VIEWPORTS) {
    test(`runtime layout visual at ${viewport.name} (100%)`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") {
          consoleErrors.push(message.text());
        }
      });
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/layouts/default/runtime?workspace=default&diag=1", {
        waitUntil: "networkidle"
      });
      await expect(page.getByTestId("fm-render-surface")).toBeVisible();
      await expect(page.getByTestId("fm-render-surface")).toHaveScreenshot(
        `layout-geometry-${viewport.name}-100.png`,
        { maxDiffPixelRatio: 0.02 }
      );
      expect(consoleErrors).toEqual([]);
    });
  }

  test("runtime layout visual at 150% zoom", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto("/layouts/default/runtime?workspace=default&diag=1", {
      waitUntil: "networkidle"
    });
    await expect(page.getByTestId("fm-render-surface")).toBeVisible();
    await Promise.all([
      page.waitForResponse((response) => response.url().includes("/api/runtime/event") && response.request().method() === "POST"),
      page.locator(".webdirect-runtime-zoom select").selectOption("150")
    ]);
    await expect(page.locator(".webdirect-runtime-zoom select")).toHaveValue("150");
    await expect(page.getByTestId("fm-render-surface")).toHaveScreenshot("layout-geometry-1280x720-150.png", {
      maxDiffPixelRatio: 0.02
    });
  });
});

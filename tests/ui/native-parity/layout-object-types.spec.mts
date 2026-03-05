import { expect, test } from "@playwright/test";

test.describe("phase4 object types and field interaction", () => {
  test("runtime renders core object types and supports field focus", async ({ page }) => {
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
    const nodeCount = await page.locator("[data-objid]").count();
    expect(nodeCount).toBeGreaterThan(0);

    const firstField = page.locator(".fm-field").first();
    await firstField.focus();
    await page.keyboard.type("A");
    await page.keyboard.press("Tab");

    expect(consoleErrors).toEqual([]);
  });
});

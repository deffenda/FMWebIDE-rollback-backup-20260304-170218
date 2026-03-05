import { expect, test } from "@playwright/test";

test("phase 1 diagnostics page shows parity summary and layout bounds", async ({ page }) => {
  await page.goto("/diagnostics/parity?workspace=default", {
    waitUntil: "networkidle"
  });

  await expect(page.getByTestId("phase1-parity-diagnostics")).toBeVisible();

  const objectCountNode = page.getByTestId("phase1-layout-object-count");
  await expect(objectCountNode).toBeVisible();
  const objectCount = Number.parseInt((await objectCountNode.textContent()) ?? "0", 10);
  expect(Number.isFinite(objectCount)).toBeTruthy();
  expect(objectCount).toBeGreaterThanOrEqual(1);

  const objectRows = page.getByTestId("phase1-layout-object-row");
  await expect(objectRows.first()).toBeVisible();

  await expect(page.getByText("Parity Matrix Summary")).toBeVisible();
});

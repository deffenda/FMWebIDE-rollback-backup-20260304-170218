import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

type ReportEntry = {
  name: string;
  status: "passed" | "skipped";
  notes?: string;
};

const REPORT_PATH = path.resolve(process.cwd(), "docs/audit/WebDirectLike_Test_Report.md");
const reportEntries: ReportEntry[] = [];

async function gotoRuntime(page: any, layoutName = "Asset Details") {
  await page.goto(`/layouts/${encodeURIComponent(layoutName)}/runtime?uiTest=1`);
  await expect(page.locator(".webdirect-runtime-shell").first()).toBeVisible();
}

test.afterAll(async () => {
  const lines = [
    "# WebDirect-like Runtime Test Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    ...reportEntries.map((entry) => `- ${entry.name}: ${entry.status}${entry.notes ? ` (${entry.notes})` : ""}`)
  ];
  fs.writeFileSync(REPORT_PATH, `${lines.join("\n")}\n`, "utf8");
});

test("runtime renders object IDs and deterministic tree", async ({ page }) => {
  await gotoRuntime(page);
  await expect(page.locator("[data-objid^='obj:']").first()).toBeVisible();
  const objectIds = await page.locator("[data-objid^='obj:']").evaluateAll((nodes) =>
    nodes.map((node) => String(node.getAttribute("data-objid") ?? "")).filter((token) => token.length > 0)
  );
  expect(objectIds.length).toBeGreaterThan(0);
  const unique = new Set(objectIds);
  expect(unique.size).toBe(objectIds.length);
  reportEntries.push({
    name: "render tree objectId fidelity",
    status: "passed"
  });
});

test("runtime focus manager tabs between objects", async ({ page }) => {
  await gotoRuntime(page);
  const inputs = page.locator("input[data-objid]");
  const count = await inputs.count();
  if (count < 2) {
    reportEntries.push({
      name: "focus and tab order",
      status: "skipped",
      notes: "Not enough input fields on fixture layout"
    });
    test.skip(true, "Not enough input fields for focus test");
    return;
  }
  await inputs.nth(0).click();
  const firstId = await inputs.nth(0).getAttribute("data-objid");
  await page.keyboard.press("Tab");
  const activeId = await page.evaluate(
    () => (document.activeElement as HTMLElement | null)?.getAttribute("data-objid") ?? ""
  );
  expect(activeId).not.toEqual(firstId);
  reportEntries.push({
    name: "focus and tab order",
    status: "passed"
  });
});

test("runtime implicit dirty/commit cycle", async ({ page }) => {
  await gotoRuntime(page);
  const input = page.locator("input[data-objid]").first();
  if ((await input.count()) === 0) {
    reportEntries.push({
      name: "implicit commit",
      status: "skipped",
      notes: "No editable input field on fixture layout"
    });
    test.skip(true, "No editable input");
    return;
  }
  await input.click();
  await input.fill("wd-runtime-commit");
  await expect(page.locator(".webdirect-runtime-toolbar")).toContainText("Dirty");
  await page.locator(".webdirect-runtime-toolbar button:has-text('Commit')").click();
  await expect(page.locator(".webdirect-runtime-toolbar")).toContainText("Clean");
  reportEntries.push({
    name: "implicit commit",
    status: "passed"
  });
});

test("runtime real-time propagation across sessions", async ({ browser }) => {
  const contextOne = await browser.newContext();
  const contextTwo = await browser.newContext();
  const pageOne = await contextOne.newPage();
  const pageTwo = await contextTwo.newPage();

  await gotoRuntime(pageOne);
  await gotoRuntime(pageTwo);

  const inputOne = pageOne.locator("input[data-objid]").first();
  const inputTwo = pageTwo.locator("input[data-objid]").first();
  if ((await inputOne.count()) === 0 || (await inputTwo.count()) === 0) {
    reportEntries.push({
      name: "realtime update propagation",
      status: "skipped",
      notes: "No editable input field on fixture layout"
    });
    await contextOne.close();
    await contextTwo.close();
    test.skip(true, "No editable input");
    return;
  }

  const marker = `rt-${Date.now()}`;
  await inputOne.click();
  await inputOne.fill(marker);
  await pageOne.locator(".webdirect-runtime-toolbar button:has-text('Commit')").click();
  await expect(inputTwo).toHaveValue(marker, { timeout: 12_000 });

  reportEntries.push({
    name: "realtime update propagation",
    status: "passed"
  });

  await contextOne.close();
  await contextTwo.close();
});

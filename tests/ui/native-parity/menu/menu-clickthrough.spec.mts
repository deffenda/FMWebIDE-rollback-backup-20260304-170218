import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import {
  clearMenuCommandHistory,
  getMenuCommandHistory,
  gotoBrowseMode,
  gotoLayoutMode,
  openTopMenu
} from "./menu-helpers.mts";

type RunEntry = {
  menu: string;
  item: string;
  status: "executed" | "skipped";
  reason?: string;
};

const SAFE_SKIP_PATTERNS = [
  /close/i,
  /delete/i,
  /recover/i,
  /print/i,
  /import\s+solution/i,
  /delete\s+solution/i,
  /save a copy/i,
  /open\.{3}$/i
];

const MENU_SEQUENCE = ["File", "Edit", "View", "Insert", "Format", "Records", "Scripts", "Window", "Help", "FMWeb IDE"];

function shouldSkipLabel(label: string): string | null {
  for (const pattern of SAFE_SKIP_PATTERNS) {
    if (pattern.test(label)) {
      return `dangerous-or-external:${pattern}`;
    }
  }
  return null;
}

async function clickEnabledMenuItems(page: any, menuLabel: string, results: RunEntry[]) {
  const menu = await openTopMenu(page, menuLabel);
  const items = menu.locator("button.fm-view-menu-item:not(.has-submenu), button.fm-view-submenu-item");
  const count = await items.count();

  for (let index = 0; index < count; index += 1) {
    const item = items.nth(index);
    const label = (await item.innerText()).replace(/\s+/g, " ").trim().replace(/^✓\s*/, "");
    if (!label) {
      continue;
    }

    if (await item.isDisabled()) {
      results.push({ menu: menuLabel, item: label, status: "skipped", reason: "disabled" });
      continue;
    }

    const reason = shouldSkipLabel(label);
    if (reason) {
      results.push({ menu: menuLabel, item: label, status: "skipped", reason });
      continue;
    }

    await item.click();
    await expect(page.locator(".fm-layout-menubar").first()).toBeVisible();
    await page.keyboard.press("Escape");
    results.push({ menu: menuLabel, item: label, status: "executed" });
  }
}

function writeMenuParityReport(results: RunEntry[], commandIds: string[]): void {
  const outputPath = path.resolve(process.cwd(), "docs/audit/Menu_Parity_Test_Report.md");
  const executed = results.filter((entry) => entry.status === "executed");
  const skipped = results.filter((entry) => entry.status === "skipped");

  const lines: string[] = [];
  lines.push("# Menu Parity Test Report");
  lines.push("");
  lines.push(`- Executed items: ${executed.length}`);
  lines.push(`- Skipped items: ${skipped.length}`);
  lines.push(`- Command dispatch count: ${commandIds.length}`);
  lines.push("");
  lines.push("## Executed");
  lines.push(...executed.map((entry) => `- ${entry.menu} > ${entry.item}`));
  lines.push("");
  lines.push("## Skipped");
  lines.push(...skipped.map((entry) => `- ${entry.menu} > ${entry.item} (${entry.reason ?? "unknown"})`));
  lines.push("");
  lines.push("## Command IDs");
  lines.push(...commandIds.map((commandId) => `- ${commandId}`));

  fs.writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
}

test("menu click-through parity (safe enabled actions)", async ({ page }) => {
  const results: RunEntry[] = [];

  await gotoLayoutMode(page);
  await clearMenuCommandHistory(page);
  for (const menuLabel of MENU_SEQUENCE.filter((label) => label !== "Records")) {
    const menuButton = page.locator(`.fm-layout-menubar .fm-layout-menubar-button:has-text("${menuLabel}")`).first();
    if ((await menuButton.count()) === 0) {
      continue;
    }
    await clickEnabledMenuItems(page, menuLabel, results);
  }

  await gotoBrowseMode(page);
  for (const menuLabel of MENU_SEQUENCE) {
    const menuButton = page.locator(`.fm-layout-menubar .fm-layout-menubar-button:has-text("${menuLabel}")`).first();
    if ((await menuButton.count()) === 0) {
      continue;
    }
    await clickEnabledMenuItems(page, menuLabel, results);
  }

  const commandHistory = await getMenuCommandHistory(page);
  const commandIds = commandHistory.map((entry) => entry.commandId);
  writeMenuParityReport(results, commandIds);

  expect(results.some((entry) => entry.status === "executed")).toBeTruthy();
  expect(commandIds.length).toBeGreaterThan(0);
  expect(commandIds.some((commandId) => /workspace/i.test(commandId))).toBeFalsy();
});

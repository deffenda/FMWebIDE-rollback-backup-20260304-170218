import fs from "node:fs/promises";
import path from "node:path";
import { REQUIRED_UI_COVERAGE, type NativeCommand, type UiMode } from "./commandRegistry.mts";

export type CommandResultStatus = "tested" | "skipped" | "not-found" | "error";

export type CommandResult = {
  id: string;
  label: string;
  mode: UiMode;
  status: CommandResultStatus;
  reason?: string;
};

function escapeTextForHasText(value: string): string {
  return value.replace(/'/g, "\\'");
}

export async function noteLastAction(page: any, commandId: string, errorMessage?: string): Promise<void> {
  await page.evaluate(
    ({ id, error }) => {
      const recordInput = document.querySelector<HTMLInputElement>(\"input[aria-label='Current record']\");
      const recordId = recordInput?.value?.trim();
      if (recordId) {
        window.__FMWEB_NATIVE_UI_TEST__?.setRecordId?.(recordId);
      }
      window.__FMWEB_NATIVE_UI_TEST__?.setLastAction?.(id, error);
    },
    { id: commandId, error: errorMessage }
  );
}

async function clickVisible(locator: any): Promise<void> {
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible()) {
      await candidate.click();
      return;
    }
  }
  throw new Error("No visible target to click");
}

async function findEnabled(locator: any): Promise<{ found: boolean; enabled: boolean; target: any | null }> {
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (!(await candidate.isVisible())) {
      continue;
    }
    const disabled = await candidate.isDisabled().catch(() => false);
    const ariaDisabled = ((await candidate.getAttribute("aria-disabled")) ?? "").toLowerCase() === "true";
    return {
      found: true,
      enabled: !disabled && !ariaDisabled,
      target: candidate
    };
  }
  return { found: false, enabled: false, target: null };
}

async function openTopMenu(page: any, menuLabel: string): Promise<boolean> {
  const buttonLocator = page.locator(`.fm-layout-menubar .fm-layout-menubar-button:has-text('${escapeTextForHasText(menuLabel)}')`);
  const candidate = await findEnabled(buttonLocator);
  if (!candidate.found || !candidate.target) {
    return false;
  }
  await candidate.target.click();
  return true;
}

export async function runNativeCommand(page: any, command: NativeCommand, mode: UiMode): Promise<CommandResult> {
  if (!command.modes.includes(mode)) {
    return {
      id: command.id,
      label: command.label,
      mode,
      status: "skipped",
      reason: `Not applicable in ${mode} mode`
    };
  }

  try {
    await noteLastAction(page, command.id);

    if (command.menuButtonText) {
      const opened = await openTopMenu(page, command.menuButtonText);
      if (!opened) {
        return {
          id: command.id,
          label: command.label,
          mode,
          status: "not-found",
          reason: `Menu button '${command.menuButtonText}' not found`
        };
      }

      if (command.itemText) {
        const menuItemLocator = page.locator(`.fm-view-menu button:has-text('${escapeTextForHasText(command.itemText)}')`);
        const menuItem = await findEnabled(menuItemLocator);
        if (!menuItem.found || !menuItem.target) {
          await page.keyboard.press("Escape").catch(() => {});
          return {
            id: command.id,
            label: command.label,
            mode,
            status: "not-found",
            reason: `Menu item '${command.itemText}' not found`
          };
        }

        if (!menuItem.enabled && !command.allowDisabled) {
          await page.keyboard.press("Escape").catch(() => {});
          return {
            id: command.id,
            label: command.label,
            mode,
            status: "skipped",
            reason: "Command disabled"
          };
        }

        if (!menuItem.enabled && command.allowDisabled) {
          await page.keyboard.press("Escape").catch(() => {});
          return {
            id: command.id,
            label: command.label,
            mode,
            status: "skipped",
            reason: "Command intentionally disabled in this context"
          };
        }

        await menuItem.target.click();
        await page.keyboard.press("Escape").catch(() => {});
      }

      return {
        id: command.id,
        label: command.label,
        mode,
        status: "tested"
      };
    }

    if (!command.selector) {
      return {
        id: command.id,
        label: command.label,
        mode,
        status: "skipped",
        reason: "No selector configured"
      };
    }

    const locator = page.locator(command.selector);
    const target = await findEnabled(locator);
    if (!target.found || !target.target) {
      return {
        id: command.id,
        label: command.label,
        mode,
        status: "not-found",
        reason: `Selector not found: ${command.selector}`
      };
    }

    if (!target.enabled && !command.allowDisabled) {
      return {
        id: command.id,
        label: command.label,
        mode,
        status: "skipped",
        reason: "Command disabled"
      };
    }

    if (!target.enabled && command.allowDisabled) {
      return {
        id: command.id,
        label: command.label,
        mode,
        status: "skipped",
        reason: "Command intentionally disabled in this context"
      };
    }

    await clickVisible(locator);

    return {
      id: command.id,
      label: command.label,
      mode,
      status: "tested"
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await noteLastAction(page, command.id, reason).catch(() => {});
    return {
      id: command.id,
      label: command.label,
      mode,
      status: "error",
      reason
    };
  }
}

export function computeCoverage(results: CommandResult[]): {
  tested: number;
  skipped: number;
  notFound: number;
  error: number;
  discoveredEnabled: number;
  coverage: number;
} {
  const tested = results.filter((entry) => entry.status === "tested").length;
  const skipped = results.filter((entry) => entry.status === "skipped").length;
  const notFound = results.filter((entry) => entry.status === "not-found").length;
  const error = results.filter((entry) => entry.status === "error").length;
  const discoveredEnabled = tested + error;
  const coverage = discoveredEnabled > 0 ? tested / discoveredEnabled : 0;
  return { tested, skipped, notFound, error, discoveredEnabled, coverage };
}

export async function writeCoverageReport(results: CommandResult[]): Promise<void> {
  const summary = computeCoverage(results);
  const lines = [
    "# UI Command Coverage Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `- Tested: ${summary.tested}`,
    `- Skipped: ${summary.skipped}`,
    `- Not Found: ${summary.notFound}`,
    `- Errors: ${summary.error}`,
    `- Coverage (tested / discovered-enabled): ${(summary.coverage * 100).toFixed(1)}%`,
    `- Threshold: ${(REQUIRED_UI_COVERAGE * 100).toFixed(0)}%`,
    "",
    "| Command ID | Mode | Status | Reason |",
    "| --- | --- | --- | --- |",
    ...results.map((entry) => `| ${entry.id} | ${entry.mode} | ${entry.status} | ${entry.reason ?? ""} |`)
  ];

  const reportPath = path.join(process.cwd(), "docs", "audit", "UI_Command_Coverage_Report.md");
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, `${lines.join("\n")}\n`, "utf8");

  const machinePath = path.join(process.cwd(), "test-results", "ui-native-parity", "command-results.json");
  await fs.mkdir(path.dirname(machinePath), { recursive: true });
  await fs.writeFile(
    machinePath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        summary,
        results
      },
      null,
      2
    )}\n`,
    "utf8"
  );
}

export function assertCoverageThreshold(results: CommandResult[]): void {
  const summary = computeCoverage(results);
  if (summary.coverage < REQUIRED_UI_COVERAGE) {
    throw new Error(
      `UI command coverage ${Math.round(summary.coverage * 100)}% is below required ${Math.round(
        REQUIRED_UI_COVERAGE * 100
      )}%`
    );
  }
}

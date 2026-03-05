import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";

const REPORT_PATH = path.join(process.cwd(), "docs", "audit", "UI_Command_Coverage_Report.md");
const MENU_PARITY_REPORT_PATH = path.join(process.cwd(), "docs", "audit", "Menu_Parity_Test_Report.md");
const WEBDIRECT_RUNTIME_REPORT_PATH = path.join(process.cwd(), "docs", "audit", "WebDirectLike_Test_Report.md");

type Mode = "headless" | "headed" | "trace";

function parseMode(args: string[]): Mode {
  if (args.includes("--headed")) {
    return "headed";
  }
  if (args.includes("--trace")) {
    return "trace";
  }
  return "headless";
}

function parsePlaywrightArgs(args: string[]): string[] {
  return args.filter((arg) => arg !== "--headed" && arg !== "--trace");
}

async function writeSkippedCoverageReport(reason: string): Promise<void> {
  const lines = [
    "# UI Command Coverage Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Status: skipped",
    `Reason: ${reason}`,
    "",
    "No Playwright execution occurred in this environment. Install `@playwright/test` and browser binaries to run the click-everything suite."
  ];
  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, `${lines.join("\n")}\n`, "utf8");
}

async function writeSkippedMenuParityReport(reason: string): Promise<void> {
  const lines = [
    "# Menu Parity Test Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Status: skipped",
    `Reason: ${reason}`,
    "",
    "No Playwright execution occurred in this environment. Install `@playwright/test` and browser binaries to run menu parity UI tests."
  ];
  await fs.mkdir(path.dirname(MENU_PARITY_REPORT_PATH), { recursive: true });
  await fs.writeFile(MENU_PARITY_REPORT_PATH, `${lines.join("\n")}\n`, "utf8");
}

async function writeSkippedWebDirectRuntimeReport(reason: string): Promise<void> {
  const lines = [
    "# WebDirect-like Runtime Test Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Status: skipped",
    `Reason: ${reason}`,
    "",
    "No Playwright execution occurred in this environment. Install `@playwright/test` and browser binaries to run WebDirect-like runtime UI tests."
  ];
  await fs.mkdir(path.dirname(WEBDIRECT_RUNTIME_REPORT_PATH), { recursive: true });
  await fs.writeFile(WEBDIRECT_RUNTIME_REPORT_PATH, `${lines.join("\n")}\n`, "utf8");
}

function resolvePlaywrightCli(): string | null {
  const localBin = path.join(process.cwd(), "node_modules", ".bin", process.platform === "win32" ? "playwright.cmd" : "playwright");
  if (existsSync(localBin)) {
    return localBin;
  }
  return null;
}

function runPlaywright(mode: Mode, passthroughArgs: string[]): Promise<number> {
  const cli = resolvePlaywrightCli();
  if (!cli) {
    return Promise.resolve(0);
  }

  const args = ["test", "--config", "playwright.ui.config.mts", ...passthroughArgs];
  if (mode === "headed") {
    args.push("--headed");
  }
  if (mode === "trace") {
    args.push("--trace", "on");
  }

  return new Promise((resolve) => {
    const child = spawn(cli, args, {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: false,
      env: {
        ...process.env
      }
    });
    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const mode = parseMode(argv);
  const passthroughArgs = parsePlaywrightArgs(argv);
  const cli = resolvePlaywrightCli();

  if (!cli) {
    const reason = "Playwright CLI not installed (node_modules/.bin/playwright missing).";
    await writeSkippedCoverageReport(reason);
    await writeSkippedMenuParityReport(reason);
    await writeSkippedWebDirectRuntimeReport(reason);
    console.log(`UI tests skipped: ${reason}`);
    return;
  }

  const exitCode = await runPlaywright(mode, passthroughArgs);
  if (exitCode !== 0) {
    process.exitCode = exitCode;
  }
}

void main();

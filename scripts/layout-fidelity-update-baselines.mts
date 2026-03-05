import { spawn } from "node:child_process";
import path from "node:path";

function run(): Promise<number> {
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), "scripts", "layout-fidelity.mts");
    const child = spawn(process.execPath, ["--experimental-strip-types", scriptPath, "--update-baselines"], {
      stdio: "inherit",
      env: process.env
    });
    child.on("exit", (code) => {
      resolve(typeof code === "number" ? code : 1);
    });
  });
}

const exitCode = await run();
if (exitCode !== 0) {
  process.exitCode = exitCode;
}

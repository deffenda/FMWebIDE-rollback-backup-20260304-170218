import { promises as fs } from "node:fs";
import path from "node:path";

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeJson(filePath: string, payload: unknown): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export async function writeText(filePath: string, content: string): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content.endsWith("\n") ? content : `${content}\n`, "utf8");
}

export function csvEscape(value: unknown): string {
  const token = String(value ?? "");
  if (/[",\n]/.test(token)) {
    return `"${token.replace(/"/g, '""')}"`;
  }
  return token;
}

export async function walkFiles(
  rootDir: string,
  options?: {
    includeExtensions?: Set<string>;
    ignoreDirs?: Set<string>;
    maxFileBytes?: number;
  }
): Promise<string[]> {
  const includeExtensions =
    options?.includeExtensions ?? new Set([".ts", ".tsx", ".mts", ".mjs", ".js", ".jsx", ".json", ".md", ".yml", ".yaml", ".css"]);
  const ignoreDirs = options?.ignoreDirs ?? new Set(["node_modules", ".next", ".git", "dist", "coverage"]);
  const files: string[] = [];

  async function visit(current: string): Promise<void> {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) {
        if (entry.name === ".github") {
          // keep
        } else {
          continue;
        }
      }
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (ignoreDirs.has(entry.name)) {
          continue;
        }
        await visit(fullPath);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (!includeExtensions.has(ext)) {
        continue;
      }
      if (options?.maxFileBytes != null) {
        try {
          const stat = await fs.stat(fullPath);
          if (stat.size > options.maxFileBytes) {
            continue;
          }
        } catch {
          continue;
        }
      }
      files.push(fullPath);
    }
  }

  await visit(rootDir);
  files.sort((a, b) => a.localeCompare(b));
  return files;
}

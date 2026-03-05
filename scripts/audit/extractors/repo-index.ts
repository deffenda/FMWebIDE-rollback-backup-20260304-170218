import path from "node:path";
import { promises as fs } from "node:fs";
import type { EvidenceHit } from "../models/types";
import { walkFiles } from "../utils/fs-utils.ts";

export type RepoIndexedFile = {
  absPath: string;
  relPath: string;
  content: string;
  contentLower: string;
  lines: string[];
  linesLower: string[];
};

export type RepoIndex = {
  repoRoot: string;
  files: RepoIndexedFile[];
};

const INDEX_ROOTS = ["app", "components", "src", "scripts", "docs", ".github", "README.md", "package.json", "tsconfig.json", "next.config.ts", "middleware.ts"];

export async function buildRepoIndex(repoRoot: string): Promise<RepoIndex> {
  const files: RepoIndexedFile[] = [];

  for (const root of INDEX_ROOTS) {
    const abs = path.join(repoRoot, root);
    try {
      const stat = await fs.stat(abs);
      if (stat.isDirectory()) {
        const paths = await walkFiles(abs, {
          maxFileBytes: 512_000,
          ignoreDirs: new Set(["node_modules", ".next", ".git", "dist", "coverage", "audit", "filemaker-themes"])
        });
        for (const filePath of paths) {
          const content = await fs.readFile(filePath, "utf8");
          const relPath = path.relative(repoRoot, filePath).replace(/\\/g, "/");
          const lines = content.split(/\r?\n/);
          files.push({
            absPath: filePath,
            relPath,
            content,
            contentLower: content.toLowerCase(),
            lines,
            linesLower: lines.map((line) => line.toLowerCase())
          });
        }
      } else if (stat.isFile()) {
        const content = await fs.readFile(abs, "utf8");
        const relPath = path.relative(repoRoot, abs).replace(/\\/g, "/");
        const lines = content.split(/\r?\n/);
        files.push({
          absPath: abs,
          relPath,
          content,
          contentLower: content.toLowerCase(),
          lines,
          linesLower: lines.map((line) => line.toLowerCase())
        });
      }
    } catch {
      // Optional root might not exist.
    }
  }

  files.sort((a, b) => a.relPath.localeCompare(b.relPath));
  return {
    repoRoot,
    files
  };
}

export function findEvidence(
  index: RepoIndex,
  options: {
    keywords: string[];
    pathHints: string[];
    maxHits?: number;
  }
): EvidenceHit[] {
  const maxHits = options.maxHits ?? 6;
  const keywordTokens = options.keywords.map((entry) => entry.trim().toLowerCase()).filter(Boolean);
  const pathTokens = options.pathHints.map((entry) => entry.trim().toLowerCase()).filter(Boolean);

  const hits: EvidenceHit[] = [];
  const seen = new Set<string>();
  const pathMatched = new Set<string>();

  function pushHit(hit: EvidenceHit): void {
    const key = `${hit.file}:${hit.line}:${hit.reason}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    hits.push(hit);
  }

  for (const file of index.files) {
    const relLower = file.relPath.toLowerCase();
    for (const token of pathTokens) {
      if (relLower.includes(token)) {
        pathMatched.add(file.relPath);
        pushHit({
          file: file.relPath,
          line: 1,
          excerpt: "Path hint match",
          reason: "pathHint"
        });
        break;
      }
    }
  }

  if (hits.length >= maxHits || keywordTokens.length === 0) {
    hits.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
    return hits.slice(0, maxHits);
  }

  const preferred = index.files.filter((file) => pathMatched.has(file.relPath));
  const fallback = index.files.filter((file) => !pathMatched.has(file.relPath));

  function collectKeywordHits(files: RepoIndexedFile[]): void {
    for (const file of files) {
      if (hits.length >= maxHits) {
        break;
      }
      if (file.relPath.startsWith("docs/audit/")) {
        continue;
      }
      for (let lineIndex = 0; lineIndex < file.linesLower.length; lineIndex += 1) {
        const line = file.linesLower[lineIndex];
        let keywordMatch: string | null = null;
        for (const token of keywordTokens) {
          if (token && line.includes(token)) {
            keywordMatch = token;
            break;
          }
        }
        if (!keywordMatch) {
          continue;
        }
        pushHit({
          file: file.relPath,
          line: lineIndex + 1,
          excerpt: file.lines[lineIndex].trim().slice(0, 200) || `keyword:${keywordMatch}`,
          reason: "keyword"
        });
        if (hits.length >= maxHits) {
          break;
        }
      }
    }
  }

  collectKeywordHits(preferred);
  if (hits.length < maxHits) {
    collectKeywordHits(fallback);
  }

  hits.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  return hits.slice(0, maxHits);
}

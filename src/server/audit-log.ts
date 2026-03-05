import { promises as fs } from "node:fs";
import path from "node:path";
import { getEnterpriseConfig } from "./enterprise-config.ts";

export type AuditEvent = {
  eventType:
    | "auth.login"
    | "auth.logout"
    | "layout.access"
    | "record.create"
    | "record.update"
    | "record.delete"
    | "script.execute"
    | "workspace.route"
    | "workspace.manage";
  status: "success" | "failure";
  userId: string;
  workspaceId?: string;
  tenantId?: string;
  fileId?: string;
  databaseName?: string;
  layoutName?: string;
  tableOccurrence?: string;
  recordId?: string;
  scriptName?: string;
  correlationId?: string;
  message?: string;
  details?: Record<string, unknown>;
};

const auditRoot = path.join(process.cwd(), "data", "audit");
let lastPruneAt = 0;

function todayFileName(): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return path.join(auditRoot, `${stamp}.ndjson`);
}

function shouldRedactKey(key: string): boolean {
  const token = key.trim().toLowerCase();
  return (
    token.includes("password") ||
    token.includes("secret") ||
    token.includes("token") ||
    token.includes("ssn") ||
    token.includes("social") ||
    token.includes("creditcard")
  );
}

function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    if (value.length <= 4) {
      return "****";
    }
    return `${value.slice(0, 2)}***${value.slice(-2)}`;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry));
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  const next: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    if (shouldRedactKey(key)) {
      next[key] = "****";
      continue;
    }
    next[key] = redactValue(nestedValue);
  }
  return next;
}

function sanitizeAuditDetails(details: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!details) {
    return undefined;
  }
  const config = getEnterpriseConfig();
  if (config.audit.redactionMode === "none") {
    return details;
  }
  return redactValue(details) as Record<string, unknown>;
}

async function pruneAuditLogsIfNeeded(): Promise<void> {
  const config = getEnterpriseConfig();
  if (!config.audit.enabled) {
    return;
  }
  const now = Date.now();
  if (now - lastPruneAt < 6 * 60 * 60 * 1000) {
    return;
  }
  lastPruneAt = now;
  await fs.mkdir(auditRoot, { recursive: true });
  const entries = await fs.readdir(auditRoot, { withFileTypes: true });
  const threshold = now - config.audit.retentionDays * 24 * 60 * 60 * 1000;
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".ndjson")) {
      continue;
    }
    const filePath = path.join(auditRoot, entry.name);
    const stat = await fs.stat(filePath);
    if (stat.mtimeMs < threshold) {
      await fs.rm(filePath, { force: true });
    }
  }
}

export async function appendAuditEvent(event: AuditEvent): Promise<void> {
  const config = getEnterpriseConfig();
  if (!config.audit.enabled) {
    return;
  }
  await fs.mkdir(auditRoot, { recursive: true });
  const payload = {
    timestamp: new Date().toISOString(),
    ...event,
    details: sanitizeAuditDetails(event.details)
  };
  await fs.appendFile(todayFileName(), `${JSON.stringify(payload)}\n`, "utf8");
  await pruneAuditLogsIfNeeded();
}

type ReadAuditOptions = {
  userId?: string;
  limit?: number;
};

export async function readAuditTrail(options: ReadAuditOptions): Promise<Array<Record<string, unknown>>> {
  await fs.mkdir(auditRoot, { recursive: true });
  const entries = await fs.readdir(auditRoot, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ndjson"))
    .map((entry) => path.join(auditRoot, entry.name))
    .sort((a, b) => b.localeCompare(a));

  const result: Array<Record<string, unknown>> = [];
  const limit = Math.min(Math.max(options.limit ?? 200, 1), 5_000);
  for (const filePath of files) {
    if (result.length >= limit) {
      break;
    }
    const raw = await fs.readFile(filePath, "utf8");
    for (const line of raw.split("\n")) {
      if (!line.trim()) {
        continue;
      }
      try {
        const parsed = JSON.parse(line) as Record<string, unknown>;
        if (options.userId && String(parsed.userId ?? "") !== options.userId) {
          continue;
        }
        result.push(parsed);
        if (result.length >= limit) {
          break;
        }
      } catch {
        // Skip malformed lines.
      }
    }
  }
  return result;
}

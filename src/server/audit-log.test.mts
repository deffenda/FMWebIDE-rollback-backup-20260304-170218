import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { appendAuditEvent, readAuditTrail } from "./audit-log.ts";
import { resetEnterpriseConfigForTests } from "./enterprise-config.ts";

const auditDir = path.join(process.cwd(), "data", "audit");

test("audit logger writes and reads per-user trail", async () => {
  process.env.WEBIDE_AUDIT_ENABLED = "true";
  process.env.WEBIDE_AUDIT_REDACTION_MODE = "hipaa-basic";
  resetEnterpriseConfigForTests();
  await fs.mkdir(auditDir, { recursive: true });

  await appendAuditEvent({
    eventType: "record.update",
    status: "success",
    userId: "audit-user",
    correlationId: "corr-audit",
    details: {
      field: "PasswordHash",
      before: "abcdef",
      after: "ghijkl"
    }
  });

  const events = await readAuditTrail({ userId: "audit-user", limit: 20 });
  assert.ok(events.length >= 1);
  const found = events.find((entry) => String(entry.userId ?? "") === "audit-user");
  assert.ok(found);
});

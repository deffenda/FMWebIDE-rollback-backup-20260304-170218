# Audit Logging (Phase 9)

Audit logging is implemented as structured JSON-lines files under:
- `/Users/deffenda/Code/FMWebIDE/data/audit/*.ndjson`

Core module:
- `/Users/deffenda/Code/FMWebIDE/src/server/audit-log.ts`

## Event model

Supported event categories:
- `auth.login`
- `auth.logout`
- `layout.access`
- `record.create`
- `record.update`
- `record.delete`
- `script.execute`
- `workspace.route`
- `workspace.manage`

Common event fields:
- `timestamp`
- `eventType`
- `status`
- `userId`
- `tenantId`
- `workspaceId`
- `fileId`
- `databaseName`
- `layoutName`
- `tableOccurrence`
- `recordId`
- `scriptName`
- `correlationId`
- `message`
- `details`

## Retention and redaction

Configuration:
- `WEBIDE_AUDIT_ENABLED`
- `WEBIDE_AUDIT_RETENTION_DAYS`
- `WEBIDE_AUDIT_REDACTION_MODE` (`none` or `hipaa-basic`)

Retention:
- old `.ndjson` files are pruned according to retention days.

Redaction:
- `hipaa-basic` masks sensitive keys in `details` (password/secret/token/ssn/social/creditcard patterns).

## API export

Admin endpoint:
- `GET /api/admin/audit`

Query parameters:
- `userId=<id>` filter by user
- `limit=<n>` max events (default 500, capped)
- `format=json|ndjson`

## Test coverage

File:
- `/Users/deffenda/Code/FMWebIDE/src/server/audit-log.test.mts`

Run:
```bash
npm run test:security
```

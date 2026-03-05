# Governance RBAC

Date: 2026-03-02

## Roles

Governance roles:
- `admin`
- `developer`
- `power-user`
- `runtime-user`

Primary module:
- `/Users/deffenda/Code/FMWebIDE/src/lib/governance-rbac.ts`

## Capabilities and actions

RBAC governs:
- workspace versioning actions
- promote/rollback actions
- admin console access
- app-layer capability usage for governance surfaces

Examples:
- `runtime-user` cannot access `manageDatabase`, `workspaceVersioning`, `publishPromote`, `adminConsole`
- `power-user` can promote but cannot access `adminConsole`

## Server-side enforcement

Dangerous operations are enforced on API routes (not just UI):
- `/api/workspaces/[workspaceId]/governance`
- `/api/admin/console`

Role is derived by:
- enterprise claims in secured mode
- controlled simulation header in auth-disabled local mode

## Testing

- `npm run test:governance`

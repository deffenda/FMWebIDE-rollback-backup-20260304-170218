# Multi-tenancy (Phase 9, Optional)

Multi-tenancy is introduced as a configurable foundation and remains feature-flag oriented.

## Current implementation state

Implemented:
- Tenant-awareness in auth/session context:
  - `tenantId` captured from identity headers/claims.
- Tenant header config:
  - `WEBIDE_MULTI_TENANT_ENABLED`
  - `WEBIDE_TENANT_HEADER` (default `x-tenant-id`)
- Tenant id propagation through request security context:
  - `/Users/deffenda/Code/FMWebIDE/src/server/security/request-context.ts`
- Tenant metadata included in audit events where available.

Not yet fully implemented:
- Hard workspace partitioning by tenant in storage/index APIs.
- Per-tenant schema/value-list overlays.
- Cross-tenant hard deny on all storage routes.

## Operational guidance

For strict enterprise deployments today:
- Run isolated FM Web IDE instances per tenant/environment.
- Use upstream SSO/reverse-proxy policies to enforce tenant segmentation.
- Enable audit logging and correlation IDs.

## Phase 10 candidate work

- Workspace config-level `tenantId` ownership.
- Mandatory tenant match checks in all workspace CRUD routes.
- Per-tenant saved searches/value lists/schema overlays.

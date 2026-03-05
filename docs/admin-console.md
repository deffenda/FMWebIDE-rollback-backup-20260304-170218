# Admin Console

Date: 2026-03-02

## Overview

Admin Console is the operations hub for workspace governance state.

Primary modules:
- `/Users/deffenda/Code/FMWebIDE/src/server/admin-console.ts`
- `/Users/deffenda/Code/FMWebIDE/app/api/admin/console/route.ts`
- `/Users/deffenda/Code/FMWebIDE/components/layout-mode.tsx` (Manage > Admin Console)

## Payload sections

- `workspaces`
  - workspace id/name
  - active environment
  - environment versions
  - current version pointer
  - dependency health
  - file list and dependency metadata
- `audit`
  - count and recent events
- `metrics`
  - route counters and runtime telemetry snapshot

## Access control

- Admin only (`resolveGovernanceRoleFromClaims(...) === admin`)
- non-admin requests receive `403 Forbidden`

## Operational use

Use Admin Console to quickly answer:
- which workspace/version is active in each environment
- whether cross-file dependencies are healthy
- whether audit activity and route metrics indicate instability

## Testing

- `npm run test:admin-console`

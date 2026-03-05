# Publish / Promote Workflow

Date: 2026-03-02

## Overview

Phase 15 adds workspace governance promotion flow for environment pointers:
- `dev`
- `test`
- `prod`

Primary modules:
- `/Users/deffenda/Code/FMWebIDE/src/server/workspace-governance-storage.ts`
- `/Users/deffenda/Code/FMWebIDE/app/api/workspaces/[workspaceId]/governance/route.ts`
- `/Users/deffenda/Code/FMWebIDE/components/layout-mode.tsx` (Manage > Publish / Promote)

## Promotion behavior

`promoteVersion` updates target environment pointer after:
- role authorization (`admin`/`power-user`)
- checklist validation:
  - `dependencyHealthChecked`
  - `migrationReviewComplete`
  - `releaseNotesReviewed`
- dependency health validation for workspace files/dependencies

Release metadata includes:
- actor
- environment transition
- version id
- generated release notes summary

## Rollback behavior

`rollbackPromotion` re-points an environment to a specified version and records a rollback promotion entry.

## Scope

- Promotion workflow manages FM Web IDE workspace release metadata and environment pointers.
- It does not directly deploy or mutate live FileMaker server schema/layout structures.

## Testing

- `npm run test:governance`
- `npm run test:admin-console`

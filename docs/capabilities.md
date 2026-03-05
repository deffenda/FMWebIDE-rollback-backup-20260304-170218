# Capabilities

Date: 2026-03-02

## Overview

FM Web IDE uses centralized capability gating for app-layer surfaces.

Primary registry:
- `/Users/deffenda/Code/FMWebIDE/src/config/appLayerCapabilities.ts`

Runtime usage:
- `/Users/deffenda/Code/FMWebIDE/components/layout-mode.tsx`

## Status model

Each capability declares:
- id (`APP-*` / `APPX-*`)
- menu path
- status (`implemented`, `partial`, `missing`, `not-feasible`)
- default enabled flag
- rationale and alternative guidance when disabled
- docs link to parity matrix anchor
- required modules/prerequisites

## Governance additions (Phase 15)

- `APP-119` App Layer Capabilities
- `APP-120` Workspace Version History
- `APP-121` Publish / Promote
- `APP-122` Admin Console
- `APP-123` Recovery / Safe Mode

## Single source of truth

All disabled actions must:
- remain visible when appropriate
- resolve through capability checks
- show rationale dialog with parity doc link

See:
- `/Users/deffenda/Code/FMWebIDE/docs/app-layer-parity-matrix.md`

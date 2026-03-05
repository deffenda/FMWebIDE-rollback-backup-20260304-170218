# Recovery / Safe Mode

Date: 2026-03-02

## Overview

Safe Mode is a recovery UX for unstable sessions. It is intended to let teams recover from plugin/experimental feature instability without losing access to workspace tools.

Primary surfaces:
- `/Users/deffenda/Code/FMWebIDE/components/layout-mode.tsx`
- `/Users/deffenda/Code/FMWebIDE/app/globals.css` (`layout-safe-mode-banner`)

## Behavior

Safe Mode can be enabled by:
- query string: `?safeMode=1`
- local persistence key: `fmweb-safe-mode=1`
- Manage > Recovery / Safe Mode panel toggle

When enabled, governance-capability execution blocks:
- Plugin Manager (`APPX-210`)
- Workspace Version History (`APP-120`)
- Publish/Promote (`APP-121`)

Blocked actions open capability rationale, never silent-fail.

## Recovery tools

Recovery panel provides:
- safe mode toggle
- reload action
- diagnostics export action

## Notes

- Safe Mode is browser-session/profile scoped.
- It does not mutate workspace metadata directly.

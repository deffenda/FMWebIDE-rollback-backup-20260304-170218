# Script Bridge (Client + Server)

## Purpose
FM Script-lite executes a local subset of script steps. For steps requiring server-side behavior or unavailable local parity, runtime bridges to existing server routes.

## Current Bridge Points
- Browse runtime still uses:
  - `POST /api/fm/scripts`
- Script engine supports:
  - `Perform Script On Server` via adapter action

## Behavior
- If runtime script execution succeeds, the script is marked complete in kernel state.
- If runtime execution fails, browse runtime can fall back to server execution for continuity.

## Error Handling
- local engine keeps deterministic `lastError/lastMessage`
- server failures propagate through existing error banner/status UX
- debug overlay snapshots include active script run status and script history summary

# Container Fields Runtime

## Core Files
- Runtime rendering and interactions:
  - `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`
- Render-model normalization:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/container-runtime.ts`
- Server proxy routes:
  - `/Users/deffenda/Code/FMWebIDE/app/api/fm/container/route.ts`
  - `/Users/deffenda/Code/FMWebIDE/app/api/fm/container/upload/route.ts`

## Implemented Behavior
- Runtime detects container payload shape and URL-like values.
- Render model supports:
  - image
  - pdf
  - interactive/file fallback
  - empty state
- Container URLs are served through server proxy routes to avoid exposing credentials/client auth paths.
- Context-menu style actions route through upload/download handlers where supported.

## Notes
- This is parity-oriented MVP behavior, not full FileMaker media feature parity.
- Advanced playback and PDF option toggles are still partial.

## Tests
- `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-parity.test.mts`

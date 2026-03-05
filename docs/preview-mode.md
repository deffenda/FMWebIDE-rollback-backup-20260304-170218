# Preview Mode Parity (Phase 6)

## Implemented
- Runtime supports Browse/Find/Preview mode routing token (`mode=preview`).
- Preview mode uses a dedicated preview render class and print-friendly surface styling.
- Preview mode is read-only:
  - field controls, buttons, container hit-areas, and column menu triggers are disabled.
- Preview mode preserves found set, record pointer, and active layout.
- Status area includes a `Preview` toggle and `Print` action while in preview.
- Menubar supports `View > Preview Mode` and `File > Print...`.

## Feature flag
- `NEXT_PUBLIC_RUNTIME_ENABLE_PREVIEW_RENDERER` (default: enabled)

## Notes
- Browser print engines are used for output and PDF generation.
- Exact native FileMaker pagination and page-part fidelity remains best-effort.

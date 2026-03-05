# Layout Fidelity Harness (Phase 16)

## Purpose
Phase 16 adds a deterministic fidelity harness for DDR layout import/render validation. It measures how closely imported layout JSON matches DDR layout/object metadata and optionally captures screenshot baselines for regression checks.

## Inputs
- Fixture manifest:
  - `/Users/deffenda/Code/FMWebIDE/docs/layout-fidelity-fixtures.json`
- DDR importer:
  - `/Users/deffenda/Code/FMWebIDE/scripts/import-ddr-layouts.mjs`

The manifest supports multiple path candidates per fixture (`/mnt/data/...` and local absolute paths). The first available file is used.

## Commands
- Fidelity engine unit tests (anchors/styles/interaction routing):
  - `npm run test:layout-fidelity-engines`
- Metrics-only run:
  - `npm run test:layout-fidelity`
- Optional visual capture run (requires a running app and Playwright):
  - `LAYOUT_FIDELITY_VISUAL=1 LAYOUT_FIDELITY_BASE_URL=http://localhost:3000 npm run test:layout-fidelity`
- Update screenshot baselines:
  - `LAYOUT_FIDELITY_VISUAL=1 LAYOUT_FIDELITY_BASE_URL=http://localhost:3000 npm run test:layout-fidelity:update-baselines`

## Outputs
- JSON report:
  - `/Users/deffenda/Code/FMWebIDE/data/layout-fidelity/report-latest.json`
- Optional screenshots:
  - current captures: `/Users/deffenda/Code/FMWebIDE/data/layout-fidelity/current`
  - baselines: `/Users/deffenda/Code/FMWebIDE/data/layout-fidelity/baselines`

## Metrics
Each measured layout reports:
- `objectCountMatch`
- `boundsCoverage`
- `styleCoverage`
- `zOrderCoverage`
- `objectTypeCoverage`
- `portalFidelity`
- `unknownObjects`
- `warningCount`

Failure thresholds are configured in `docs/layout-fidelity-fixtures.json`:
- `minimumObjectCountMatch`
- `minimumStyleCoverage`

`npm run test:layout-fidelity` exits non-zero if any measured layout is below thresholds.

## Visual Regression Notes
- We do not compare against native FileMaker screenshots in CI.
- Baselines are generated from FM Web IDE output and used to detect regressions.
- Known variation sources:
  - font fallback differences by OS/browser
  - antialiasing/subpixel text differences
  - missing Playwright/runtime browser availability

## Graceful Degradation and Debugging
- Unknown DDR object types:
  - dev mode can show placeholders when `layoutFidelityUnknownObjectsEnabled` is on.
  - production can hide unknown object placeholders by capability flag.
- Unsupported dynamic conditional formatting:
  - static first-rule fallback can be applied.
  - dynamic evaluation is controlled by `layoutFidelityDynamicConditionalFormattingEnabled`.
- Browse debug overlay (`?debugRuntime=1`) includes fidelity warnings:
  - unknown type count
  - style parse fallback count
  - static conditional-format fallback count
  - importer warning count
- Browse debug overlay also includes Phase 17 fidelity diagnostics:
  - active object interaction + objectId routing event
  - active object frame/container/anchor summary
  - resolved style stack layers (theme default -> variant -> local overrides -> fallback)

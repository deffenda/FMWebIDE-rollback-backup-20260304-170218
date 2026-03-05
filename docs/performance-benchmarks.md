# Performance Benchmarks (Phase 14)

Date: 2026-03-02

## Purpose
Phase 14 introduces a deterministic performance harness so regressions can be detected early for large-runtime paths (found sets, list/table pipelines, portal virtualization).

## Command

```bash
npm run bench:perf
```

Output:
- console summary with pass/fail per metric
- JSON report written to:
  - `/Users/deffenda/Code/FMWebIDE/data/perf/bench-latest.json`

## Default Dataset Sizes
- found set size: `100000`
- table sample size: `25000`
- portal row size: `10000`

## Default Budgets
- `virtual-window-sweep-100k`: `120ms`
- `table-display-build`: `2000ms`
- `find-and-sort-100k`: `1600ms`
- `portal-virtual-window-sweep-10k`: `100ms`

## Current Baseline Results (Latest Run)
From `/Users/deffenda/Code/FMWebIDE/data/perf/bench-latest.json`:

- `virtual-window-sweep-100k`: `0.99ms` (PASS)
- `table-display-build`: `104.51ms` (PASS)
- `find-and-sort-100k`: `118.88ms` (PASS)
- `portal-virtual-window-sweep-10k`: `0.15ms` (PASS)

Summary:
- passed: `true`
- failed metrics: `0`

## Environment Overrides
You can tune sizes and budgets:

- `PERF_BENCH_FOUNDSET_SIZE`
- `PERF_BENCH_TABLE_SAMPLE_SIZE`
- `PERF_BENCH_PORTAL_SIZE`
- `PERF_BENCH_SWEEP_STEPS`
- `PERF_BENCH_BUDGET_VIRTUAL_SWEEP_MS`
- `PERF_BENCH_BUDGET_TABLE_BUILD_MS`
- `PERF_BENCH_BUDGET_FIND_SORT_MS`
- `PERF_BENCH_BUDGET_PORTAL_VIRTUAL_MS`

## CI Gate Behavior
The benchmark exits non-zero when any budget fails only when gate mode is enabled:
- `CI=true`, or
- `PERF_BENCH_ENFORCE=1`

This allows local exploratory runs without hard failures while still enforcing thresholds in CI.


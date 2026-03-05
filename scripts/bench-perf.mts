import { performance } from "node:perf_hooks";
import { promises as fs } from "node:fs";
import path from "node:path";
import { computeVirtualWindow } from "../src/lib/performance/virtual-window.ts";
import { buildTableDisplayRows, sortRecordRows } from "../src/lib/sort-reporting.ts";
import { applyFindRequestsOnRecords } from "../src/lib/find-mode.ts";

type RecordRow = {
  recordId: string;
  Name: string;
  Status: string;
  Priority: number;
  Amount: number;
  CreatedAt: string;
};

type BenchMetric = {
  name: string;
  durationMs: number;
  budgetMs: number;
  passed: boolean;
  notes?: string;
};

function envNumber(name: string, fallback: number): number {
  const raw = Number.parseFloat(String(process.env[name] ?? ""));
  if (!Number.isFinite(raw)) {
    return fallback;
  }
  return raw;
}

function now(): number {
  return performance.now();
}

function runTimed(name: string, budgetMs: number, task: () => void, notes?: string): BenchMetric {
  const startedAt = now();
  task();
  const durationMs = now() - startedAt;
  return {
    name,
    durationMs,
    budgetMs,
    passed: durationMs <= budgetMs,
    notes
  };
}

function buildDataset(size: number): RecordRow[] {
  const rows: RecordRow[] = new Array<RecordRow>(size);
  for (let index = 0; index < size; index += 1) {
    const recordNumber = index + 1;
    rows[index] = {
      recordId: String(recordNumber),
      Name: `Asset ${recordNumber}`,
      Status: recordNumber % 5 === 0 ? "Inactive" : recordNumber % 3 === 0 ? "Pending" : "Active",
      Priority: (recordNumber % 7) + 1,
      Amount: (recordNumber * 13.37) % 250_000,
      CreatedAt: `2026-01-${String((recordNumber % 28) + 1).padStart(2, "0")}`
    };
  }
  return rows;
}

async function main(): Promise<void> {
  const foundSetSize = Math.max(10_000, Math.round(envNumber("PERF_BENCH_FOUNDSET_SIZE", 100_000)));
  const tableSampleSize = Math.max(5_000, Math.round(envNumber("PERF_BENCH_TABLE_SAMPLE_SIZE", 25_000)));
  const portalSize = Math.max(2_000, Math.round(envNumber("PERF_BENCH_PORTAL_SIZE", 10_000)));
  const virtualSweepSteps = Math.max(200, Math.round(envNumber("PERF_BENCH_SWEEP_STEPS", 1_500)));
  const results: BenchMetric[] = [];

  const virtualSweepBudgetMs = envNumber("PERF_BENCH_BUDGET_VIRTUAL_SWEEP_MS", 120);
  const tableBuildBudgetMs = envNumber("PERF_BENCH_BUDGET_TABLE_BUILD_MS", 2_000);
  const findSortBudgetMs = envNumber("PERF_BENCH_BUDGET_FIND_SORT_MS", 1_600);
  const portalVirtualBudgetMs = envNumber("PERF_BENCH_BUDGET_PORTAL_VIRTUAL_MS", 100);

  const records = buildDataset(foundSetSize);
  const tableRecords = records.slice(0, tableSampleSize);
  const portalRows = records.slice(0, portalSize);

  results.push(
    runTimed(
      "virtual-window-sweep-100k",
      virtualSweepBudgetMs,
      () => {
        const maxScroll = foundSetSize * 34;
        for (let step = 0; step < virtualSweepSteps; step += 1) {
          const ratio = step / Math.max(1, virtualSweepSteps - 1);
          const scrollTop = Math.round(maxScroll * ratio);
          computeVirtualWindow({
            totalCount: foundSetSize,
            scrollTop,
            viewportHeight: 860,
            rowHeight: 34,
            overscan: 12
          });
        }
      },
      `steps=${virtualSweepSteps}`
    )
  );

  results.push(
    runTimed(
      "table-display-build",
      tableBuildBudgetMs,
      () => {
        buildTableDisplayRows({
          records: tableRecords,
          fieldNames: ["Name", "Status", "Priority", "Amount"],
          sort: [{ field: "Name", direction: "asc", mode: "standard" }],
          leadingGrandSummary: true,
          trailingGrandSummary: true,
          leadingGroupField: "Status",
          trailingGroupField: "Priority",
          leadingSubtotals: {
            Amount: ["sum", "avg"]
          },
          trailingSubtotals: {
            Amount: ["sum", "max"]
          },
          resolveValue: (record, fieldName) => record[fieldName as keyof RecordRow]
        });
      },
      `rows=${tableSampleSize}`
    )
  );

  results.push(
    runTimed(
      "find-and-sort-100k",
      findSortBudgetMs,
      () => {
        const found = applyFindRequestsOnRecords(
          records as unknown as Array<Record<string, unknown>>,
          [
            {
              id: "req-1",
              omit: false,
              criteria: {
                Status: "Active",
                Name: "Asset 1*"
              }
            }
          ]
        ).records;
        sortRecordRows(found as unknown as Array<Record<string, unknown>>, [
          { field: "Priority", direction: "desc", mode: "standard" },
          { field: "Amount", direction: "asc", mode: "standard" }
        ]);
      },
      `rows=${foundSetSize}`
    )
  );

  results.push(
    runTimed(
      "portal-virtual-window-sweep-10k",
      portalVirtualBudgetMs,
      () => {
        const maxScroll = portalRows.length * 34;
        for (let step = 0; step < 500; step += 1) {
          const ratio = step / 499;
          computeVirtualWindow({
            totalCount: portalRows.length,
            scrollTop: Math.round(maxScroll * ratio),
            viewportHeight: 280,
            rowHeight: 34,
            overscan: 6
          });
        }
      },
      `rows=${portalSize}`
    )
  );

  const passed = results.every((entry) => entry.passed);
  const report = {
    generatedAt: new Date().toISOString(),
    dataset: {
      foundSetSize,
      tableSampleSize,
      portalSize
    },
    metrics: results,
    summary: {
      passed,
      failedCount: results.filter((entry) => !entry.passed).length
    }
  };

  const reportDir = path.join(process.cwd(), "data", "perf");
  await fs.mkdir(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, "bench-latest.json");
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");

  const summaryLines = [
    "Phase 14 Benchmark Summary",
    "--------------------------",
    ...results.map((entry) => {
      const status = entry.passed ? "PASS" : "FAIL";
      return `${status} ${entry.name}: ${entry.durationMs.toFixed(2)}ms (budget ${entry.budgetMs.toFixed(2)}ms)${
        entry.notes ? ` [${entry.notes}]` : ""
      }`;
    }),
    `Report: ${reportPath}`
  ];
  // eslint-disable-next-line no-console
  console.log(summaryLines.join("\n"));

  const gateEnabled = String(process.env.CI ?? "").toLowerCase() === "true" || String(process.env.PERF_BENCH_ENFORCE ?? "") === "1";
  if (gateEnabled && !passed) {
    process.exitCode = 1;
  }
}

void main();


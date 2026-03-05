import assert from "node:assert/strict";
import test from "node:test";
import {
  createParityMatrixReport,
  isParityMatrixReport,
  PARITY_MATRIX_REPORT_SCHEMA,
  toParitySupportStatus,
  type ParityStatusSourceItem
} from "./parity-matrix-report.ts";

test("toParitySupportStatus maps raw parity statuses deterministically", () => {
  assert.equal(toParitySupportStatus("Implemented"), "supported");
  assert.equal(toParitySupportStatus("Partial"), "partial");
  assert.equal(toParitySupportStatus("Missing"), "unsupported");
  assert.equal(toParitySupportStatus("Unknown"), "unknown");
});

test("createParityMatrixReport sorts features and computes summary counts", () => {
  const sourceItems: ParityStatusSourceItem[] = [
    {
      id: "A-002",
      category: "Browse Mode",
      subcategory: "Find",
      capability_name: "Perform find",
      expected_filemaker_behavior: "Runs find and updates found set",
      suggested_validation_test: "run find flow",
      uncertainty_level: "med",
      status: "Partial",
      evidence: [
        {
          file: "components/browse-mode.tsx",
          line: 99
        }
      ]
    },
    {
      id: "A-001",
      category: "Layout Mode",
      subcategory: "Geometry",
      capability_name: "Bounds rendering",
      expected_filemaker_behavior: "Object bounds map to canvas coordinates",
      suggested_validation_test: "render bounding boxes",
      uncertainty_level: "low",
      status: "Implemented",
      evidence: [
        {
          file: "components/layout-mode.tsx",
          line: 120
        },
        {
          file: "src/lib/layout-model.ts",
          line: 12
        }
      ]
    },
    {
      id: "A-003",
      category: "Security",
      subcategory: "Privileges",
      capability_name: "Field privilege parity",
      expected_filemaker_behavior: "Field visibility/editability follows privileges",
      suggested_validation_test: "privilege tests",
      uncertainty_level: "high",
      status: "Missing",
      evidence: []
    }
  ];

  const report = createParityMatrixReport(sourceItems, {
    generatedAt: "2026-03-03T00:00:00.000Z",
    sourceFingerprint: "fp-123"
  });

  assert.equal(report.version, 1);
  assert.equal(report.generatedAt, "2026-03-03T00:00:00.000Z");
  assert.equal(report.sourceFingerprint, "fp-123");
  assert.equal(report.features.length, 3);
  assert.equal(report.features[0].id, "A-001");
  assert.equal(report.features[1].id, "A-002");
  assert.equal(report.features[2].id, "A-003");
  assert.deepEqual(report.summary, {
    total: 3,
    supported: 1,
    partial: 1,
    unsupported: 1,
    unknown: 0
  });
});

test("isParityMatrixReport accepts valid report shape and schema object is defined", () => {
  const report = createParityMatrixReport([], {
    generatedAt: "2026-03-03T00:00:00.000Z",
    sourceFingerprint: "fp-empty"
  });
  assert.equal(isParityMatrixReport(report), true);
  assert.equal(PARITY_MATRIX_REPORT_SCHEMA.properties.version.const, 1);
});

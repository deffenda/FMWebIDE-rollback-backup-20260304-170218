import assert from "node:assert/strict";
import test from "node:test";
import {
  readLayoutFoundationDiagnostics,
  readPhase1ParityDiagnostics
} from "./parity-diagnostics.ts";

test("readLayoutFoundationDiagnostics always returns at least one renderable object set", async () => {
  const diagnostics = await readLayoutFoundationDiagnostics("phase1-diagnostics-test-workspace");
  assert.ok(diagnostics.layoutId.length > 0);
  assert.ok(diagnostics.layoutName.length > 0);
  assert.ok(diagnostics.canvas.width > 0);
  assert.ok(diagnostics.canvas.height > 0);
  assert.ok(Array.isArray(diagnostics.objects));
});

test("readPhase1ParityDiagnostics returns parity summary and layout bounds payload", async () => {
  const payload = await readPhase1ParityDiagnostics("phase1-diagnostics-test-workspace");

  assert.equal(payload.parityReport.version, 1);
  assert.ok(payload.parityReport.summary.total >= 0);
  assert.ok(payload.layout.objectCount >= 0);
  if (payload.layout.objectCount > 0) {
    const first = payload.layout.objects[0];
    assert.ok(first.width > 0);
    assert.ok(first.height > 0);
  }
});

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const cssPath = path.resolve(process.cwd(), "app/globals.css");
const browseModePath = path.resolve(process.cwd(), "components/browse-mode.tsx");
const layoutModePath = path.resolve(process.cwd(), "components/layout-mode.tsx");

function readCss(): string {
  return fs.readFileSync(cssPath, "utf8");
}

function readBrowseMode(): string {
  return fs.readFileSync(browseModePath, "utf8");
}

function readLayoutMode(): string {
  return fs.readFileSync(layoutModePath, "utf8");
}

function cssBlock(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const expression = new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`, "m");
  const match = source.match(expression);
  return (match?.[1] ?? "").trim();
}

test("runtime date inputs use a single icon path (native picker indicator)", () => {
  const css = readCss();
  const block = cssBlock(css, "input.runtime-date-input:not(.runtime-date-no-icon)");
  assert.ok(block.includes("background-image: none"), "Expected date inputs to disable custom background icon");
  assert.equal(
    block.includes("data:image/svg+xml"),
    false,
    "Date input CSS should not embed a custom SVG calendar icon"
  );
});

test("runtime-date-no-icon hides native date picker indicator", () => {
  const css = readCss();
  const noIconBlock = cssBlock(css, "input.runtime-date-no-icon::-webkit-calendar-picker-indicator");
  assert.ok(noIconBlock.includes("display: none"), "Expected no-icon variant to hide picker indicator");
});

test("browse mode applies runtime-date-no-icon based on inspector calendar icon setting", () => {
  const source = readBrowseMode();
  const token = 'runtime-date-input ${dateSettings.includeIcon ? "" : "runtime-date-no-icon"}';
  const count = source.split(token).length - 1;
  assert.ok(count >= 4, "Expected date icon toggle token to be used across field + portal render paths");
});

test("layout mode preview still honors calendarIncludeIcon visibility", () => {
  const source = readLayoutMode();
  assert.ok(source.includes("layout-preview-date"), "Expected layout preview date class token");
  assert.ok(
    source.includes("layout-preview-date-hide-icon"),
    "Expected layout preview no-icon class token"
  );
  assert.ok(
    source.includes("component.props.calendarIncludeIcon === false"),
    "Expected layout preview date icon visibility to follow inspector setting"
  );
});

test("portal cell edits stage qualified field changes before blur-save", () => {
  const source = readBrowseMode();
  assert.ok(
    source.includes("field: portalFieldToken"),
    "Expected portal edit staging to use qualified TO::Field token"
  );
  assert.ok(
    source.includes("setStatus(`Staged ${portalFieldToken}`)"),
    "Expected portal edit path to surface staged status messaging"
  );
  assert.ok(
    source.includes("setFieldIndicatorWithTimeout(\n                                      fieldSaveKey(activeRecordId, portalFieldToken),\n                                      \"dirty\""),
    "Expected portal edit path to mark portal field dirty before commit on blur"
  );
});

test("container fallback renders file-type metadata instead of raw server URLs", () => {
  const source = readBrowseMode();
  assert.ok(
    source.includes("resolveContainerFallbackMeta"),
    "Expected browse runtime to resolve container fallback metadata"
  );
  assert.ok(
    source.includes("runtime-container-fallback-badge"),
    "Expected container fallback UI to show file-type badge"
  );
  assert.equal(
    source.includes('{String(currentValue ?? "") || "No container data"}'),
    false,
    "Container fallback should not print raw URL/value strings directly"
  );
});

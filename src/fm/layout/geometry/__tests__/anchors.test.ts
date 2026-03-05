import assert from "node:assert/strict";
import test from "node:test";
import { applyAnchors } from "../applyAnchors.ts";

const baseContainer = {
  x: 0,
  y: 0,
  w: 1000,
  h: 700
};

test("left only keeps x and width stable", () => {
  const next = applyAnchors({
    baselineObjectRect: { x: 100, y: 80, w: 220, h: 40 },
    baselineContainerRect: baseContainer,
    currentContainerRect: { ...baseContainer, w: 1200 },
    anchors: { left: true, right: false, top: true, bottom: false }
  });
  assert.deepEqual(next, { x: 100, y: 80, w: 220, h: 40 });
});

test("right only keeps width and shifts x with container delta", () => {
  const next = applyAnchors({
    baselineObjectRect: { x: 100, y: 80, w: 220, h: 40 },
    baselineContainerRect: baseContainer,
    currentContainerRect: { ...baseContainer, w: 1200 },
    anchors: { left: false, right: true, top: true, bottom: false }
  });
  assert.deepEqual(next, { x: 300, y: 80, w: 220, h: 40 });
});

test("left+right grows width with container delta", () => {
  const next = applyAnchors({
    baselineObjectRect: { x: 100, y: 80, w: 220, h: 40 },
    baselineContainerRect: baseContainer,
    currentContainerRect: { ...baseContainer, w: 1200 },
    anchors: { left: true, right: true, top: true, bottom: false }
  });
  assert.deepEqual(next, { x: 100, y: 80, w: 420, h: 40 });
});

test("top+bottom grows height with container delta", () => {
  const next = applyAnchors({
    baselineObjectRect: { x: 100, y: 80, w: 220, h: 40 },
    baselineContainerRect: baseContainer,
    currentContainerRect: { ...baseContainer, h: 900 },
    anchors: { left: true, right: false, top: true, bottom: true }
  });
  assert.deepEqual(next, { x: 100, y: 80, w: 220, h: 240 });
});

test("bottom only shifts y by vertical delta", () => {
  const next = applyAnchors({
    baselineObjectRect: { x: 100, y: 80, w: 220, h: 40 },
    baselineContainerRect: baseContainer,
    currentContainerRect: { ...baseContainer, h: 900 },
    anchors: { left: true, right: false, top: false, bottom: true }
  });
  assert.deepEqual(next, { x: 100, y: 280, w: 220, h: 40 });
});

test("none anchors keeps deterministic baseline x/y", () => {
  const next = applyAnchors({
    baselineObjectRect: { x: 100, y: 80, w: 220, h: 40 },
    baselineContainerRect: baseContainer,
    currentContainerRect: { ...baseContainer, w: 1200, h: 900 },
    anchors: { left: false, right: false, top: false, bottom: false }
  });
  assert.deepEqual(next, { x: 100, y: 80, w: 220, h: 40 });
});

test("combined horizontal+vertical anchor behavior remains deterministic", () => {
  const next = applyAnchors({
    baselineObjectRect: { x: 40, y: 50, w: 120, h: 30 },
    baselineContainerRect: baseContainer,
    currentContainerRect: { ...baseContainer, w: 1120, h: 620 },
    anchors: { left: false, right: true, top: true, bottom: true }
  });
  assert.deepEqual(next, { x: 160, y: 50, w: 120, h: 1 });
});

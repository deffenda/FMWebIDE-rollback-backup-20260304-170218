import assert from "node:assert/strict";
import test from "node:test";
import { cssFromTokens } from "../cssFromTokens.ts";
import type { ResolvedTokenBundle } from "../tokens.ts";

const tokenFixture: ResolvedTokenBundle = {
  typography: {
    fontFamily: "Helvetica, Arial, sans-serif",
    fontSizePx: 14,
    fontWeight: "bold",
    fontStyle: "italic",
    textColor: "#123456",
    textAlign: "center",
    verticalAlign: "middle",
    wrap: "none",
    lineHeightPx: 18,
    letterSpacingPx: 0.5
  },
  fill: {
    backgroundColor: "#f1f5f9"
  },
  border: {
    borderColor: "#475569",
    borderWidthPx: 2,
    borderStyle: "dashed",
    cornerRadiusPx: 6
  },
  padding: {
    pt: 2,
    pr: 3,
    pb: 4,
    pl: 5
  },
  effect: {
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.2)"
  }
};

test("cssFromTokens maps token bundle to stable wrapper/text css", () => {
  const first = cssFromTokens(tokenFixture);
  const second = cssFromTokens(tokenFixture);
  assert.deepEqual(first, second);
  assert.equal(first.css.backgroundColor, "#f1f5f9");
  assert.equal(first.css.borderStyle, "dashed");
  assert.equal(first.css.alignItems, "center");
  assert.equal(first.textCss.whiteSpace, "nowrap");
  assert.equal(first.textCss.textOverflow, "ellipsis");
  assert.equal(first.textCss.textAlign, "center");
  assert.equal(first.textCss.paddingLeft, 5);
});


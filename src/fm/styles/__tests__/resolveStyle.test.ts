import assert from "node:assert/strict";
import test from "node:test";
import { resolveStyle } from "../resolveStyle.ts";
import type { StyleDefinition } from "../tokens.ts";

test("resolveStyle applies precedence: theme default -> style -> object override", () => {
  const resolved = resolveStyle({
    nodeType: "field",
    themeName: "Universal Touch",
    styleName: "Fill | Secondary",
    objectOverrides: {
      typography: {
        textColor: "#ff0000"
      },
      border: {
        borderWidthPx: 3
      }
    }
  });

  assert.equal(resolved.tokens.typography.textColor, "#ff0000");
  assert.equal(resolved.tokens.border.borderWidthPx, 3);
  assert.equal(resolved.debug.sources["typography.textColor"], "objectOverride");
  assert.equal(resolved.debug.sources["border.borderWidthPx"], "objectOverride");
});

test("resolveStyle applies basedOn chain with leaf precedence", () => {
  const customStyles: Record<string, StyleDefinition> = {
    default: {
      id: "default",
      name: "Default",
      tokens: {
        typography: {
          textColor: "#111111"
        }
      }
    },
    parent: {
      id: "parent",
      name: "Parent",
      basedOn: "default",
      tokens: {
        typography: {
          textColor: "#222222",
          textAlign: "left"
        }
      }
    },
    child: {
      id: "child",
      name: "Child",
      basedOn: "parent",
      tokens: {
        typography: {
          textColor: "#333333"
        }
      }
    }
  };
  const resolved = resolveStyle({
    nodeType: "label",
    themeName: "Default",
    styleId: "child",
    styleName: "Child",
    styleDefinitions: customStyles
  });
  assert.equal(resolved.tokens.typography.textColor, "#333333");
  assert.equal(resolved.tokens.typography.textAlign, "left");
  assert.deepEqual(resolved.debug.chain, ["default", "parent", "child"]);
});

test("resolveStyle detects basedOn cycles and returns warnings", () => {
  const cycleStyles: Record<string, StyleDefinition> = {
    a: {
      id: "a",
      name: "A",
      basedOn: "b",
      tokens: {
        typography: {
          textColor: "#111111"
        }
      }
    },
    b: {
      id: "b",
      name: "B",
      basedOn: "a",
      tokens: {
        typography: {
          textColor: "#222222"
        }
      }
    }
  };
  const resolved = resolveStyle({
    nodeType: "field",
    styleId: "a",
    styleName: "A",
    styleDefinitions: cycleStyles
  });
  assert.equal(resolved.debug.warnings.length > 0, true);
});


import assert from "node:assert/strict";
import test from "node:test";

import type { LayoutComponent } from "../layout-model";
import { resolveComponentStyleStack } from "./style-resolver.ts";

function buildComponent(overrides?: Partial<LayoutComponent>): LayoutComponent {
  return {
    id: "cmp-1",
    type: "field",
    position: {
      x: 0,
      y: 0,
      width: 180,
      height: 24,
      z: 1
    },
    binding: {
      field: "Name",
      tableOccurrence: "Assets"
    },
    props: {
      styleTheme: "Universal Touch",
      styleName: "Default",
      ...(overrides?.props ?? {})
    },
    ...overrides
  };
}

test("style resolver returns deterministic layer order", () => {
  const stack = resolveComponentStyleStack(buildComponent());

  assert.equal(stack.componentId, "cmp-1");
  assert.deepEqual(
    stack.layers.map((layer) => layer.id),
    ["themeDefault", "styleVariant", "localOverrides"]
  );
});

test("style resolver applies local overrides over theme defaults", () => {
  const stack = resolveComponentStyleStack(
    buildComponent({
      props: {
        styleTheme: "Universal Touch",
        styleName: "Secondary",
        fontFamily: "Helvetica",
        fontSize: 13,
        textColor: "#112233",
        fillType: "solid",
        fillColor: "#abcdef",
        lineStyle: "dashed",
        lineWidth: 2,
        lineColor: "#223344",
        cornerRadius: 7,
        opacity: 0.72
      }
    })
  );

  assert.equal(stack.finalStyle.fontFamily, "Helvetica");
  assert.equal(stack.finalStyle.fontSize, 13);
  assert.equal(stack.finalStyle.color, "#112233");
  assert.equal(stack.finalStyle.backgroundColor, "#abcdef");
  assert.equal(stack.finalStyle.borderStyle, "dashed");
  assert.equal(stack.finalStyle.borderWidth, 2);
  assert.equal(stack.finalStyle.borderColor, "#223344");
  assert.equal(stack.finalStyle.borderRadius, 7);
  assert.equal(stack.finalStyle.opacity, 0.72);
});

test("style resolver includes conditional formatting fallback layer when static rule exists", () => {
  const stack = resolveComponentStyleStack(
    buildComponent({
      props: {
        styleTheme: "Universal Touch",
        ddrConditionalFormattingStatic: true
      }
    })
  );

  assert.deepEqual(
    stack.layers.map((layer) => layer.id),
    ["themeDefault", "styleVariant", "localOverrides", "conditionalFallback"]
  );
  assert.equal(typeof stack.finalStyle.outline, "string");
});

test("style variant layer marks inverted style token", () => {
  const stack = resolveComponentStyleStack(
    buildComponent({
      props: {
        styleTheme: "Universal Touch",
        styleName: "Fill | Inverted"
      }
    })
  );

  const variantLayer = stack.layers.find((layer) => layer.id === "styleVariant");
  assert.ok(variantLayer);
  assert.equal(typeof variantLayer?.style.filter, "string");
});

test("gradient local override emits linear-gradient background image", () => {
  const stack = resolveComponentStyleStack(
    buildComponent({
      props: {
        styleTheme: "Universal Touch",
        fillType: "gradient",
        fillGradientStartColor: "#111111",
        fillGradientEndColor: "#eeeeee",
        fillGradientAngle: 45
      }
    })
  );

  assert.equal(
    stack.finalStyle.backgroundImage,
    "linear-gradient(45deg, #111111, #eeeeee)"
  );
});

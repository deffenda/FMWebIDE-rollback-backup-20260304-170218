import type { CSSProperties } from "react";

import type { LayoutComponent } from "../layout-model.ts";
import { resolveRuntimeThemePalette } from "../theme-palettes.ts";

export type StyleLayer = {
  id: "themeDefault" | "styleVariant" | "localOverrides" | "conditionalFallback";
  label: string;
  style: CSSProperties;
};

export type ResolvedStyleStack = {
  componentId: string;
  layers: StyleLayer[];
  finalStyle: CSSProperties;
};

function toLowerToken(value: string | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function styleDefaultsForComponent(component: LayoutComponent): CSSProperties {
  const palette = resolveRuntimeThemePalette(component.props.styleTheme);
  if (component.type === "field") {
    return {
      backgroundColor: palette.inputBackground,
      borderColor: palette.inputBorder,
      color: palette.inputText
    };
  }
  if (component.type === "button") {
    return {
      backgroundColor: palette.buttonBackground,
      borderColor: palette.buttonBorder,
      color: palette.buttonText
    };
  }
  if (component.type === "portal") {
    return {
      backgroundColor: palette.portalBackground,
      borderColor: palette.portalBorder,
      color: palette.text
    };
  }
  return {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    color: palette.text
  };
}

function styleVariantForName(styleName: string | undefined): CSSProperties {
  const token = toLowerToken(styleName);
  if (!token) {
    return {};
  }
  const style: CSSProperties = {};
  if (token.includes("inverted")) {
    style.filter = "invert(1) hue-rotate(180deg)";
  } else if (token.includes("secondary")) {
    style.opacity = 0.94;
  } else if (token.includes("knockout")) {
    style.backgroundColor = "#ffffff";
  }
  return style;
}

function localStyleOverrides(component: LayoutComponent): CSSProperties {
  const style: CSSProperties = {};
  if (component.props.fontFamily?.trim()) {
    style.fontFamily = component.props.fontFamily;
  }
  if (Number.isFinite(component.props.fontSize)) {
    style.fontSize = Number(component.props.fontSize);
  }
  if (component.props.textColor?.trim()) {
    style.color = component.props.textColor;
  }
  if (component.props.fillType === "solid" && component.props.fillColor?.trim()) {
    style.backgroundColor = component.props.fillColor;
  }
  if (component.props.fillType === "gradient") {
    const start = component.props.fillGradientStartColor?.trim() || component.props.fillColor?.trim() || "#f8fafc";
    const end = component.props.fillGradientEndColor?.trim() || component.props.fillColor?.trim() || "#e2e8f0";
    const angle = Number.isFinite(component.props.fillGradientAngle) ? Number(component.props.fillGradientAngle) : 180;
    style.backgroundImage = `linear-gradient(${Math.round(angle)}deg, ${start}, ${end})`;
  }
  if (component.props.lineStyle && component.props.lineStyle !== "none") {
    style.borderStyle = component.props.lineStyle;
  }
  if (Number.isFinite(component.props.lineWidth) && Number(component.props.lineWidth) > 0) {
    style.borderWidth = Number(component.props.lineWidth);
  }
  if (component.props.lineColor?.trim()) {
    style.borderColor = component.props.lineColor;
  }
  if (Number.isFinite(component.props.cornerRadius)) {
    style.borderRadius = Number(component.props.cornerRadius);
  }
  if (Number.isFinite(component.props.opacity)) {
    style.opacity = Number(component.props.opacity);
  }
  return style;
}

function conditionalFallbackStyle(component: LayoutComponent): CSSProperties {
  if (component.props.ddrConditionalFormattingStatic !== true) {
    return {};
  }
  return {
    outline: "1px dashed color-mix(in srgb, var(--runtime-theme-accent, #2563eb) 60%, transparent)"
  };
}

function mergeLayers(layers: StyleLayer[]): CSSProperties {
  const output: CSSProperties = {};
  for (const layer of layers) {
    Object.assign(output, layer.style);
  }
  return output;
}

export function resolveComponentStyleStack(component: LayoutComponent): ResolvedStyleStack {
  const layers: StyleLayer[] = [
    {
      id: "themeDefault",
      label: "Theme default",
      style: styleDefaultsForComponent(component)
    },
    {
      id: "styleVariant",
      label: `Style variant (${component.props.styleName ?? "default"})`,
      style: styleVariantForName(component.props.styleName)
    },
    {
      id: "localOverrides",
      label: "Local overrides",
      style: localStyleOverrides(component)
    }
  ];
  if (component.props.ddrConditionalFormattingStatic === true) {
    layers.push({
      id: "conditionalFallback",
      label: "Conditional formatting fallback",
      style: conditionalFallbackStyle(component)
    });
  }
  return {
    componentId: component.id,
    layers,
    finalStyle: mergeLayers(layers)
  };
}

import type { LayoutComponent } from "../../lib/layout-model.ts";
import { resolveRuntimeThemePalette } from "../../lib/theme-palettes.ts";
import { resolveFmFontStack } from "./fmFontMap.ts";
import type { StyleDefinition, StyleTokens, ThemeDefinition } from "./tokens.ts";
import { normalizeStyleId } from "./tokens.ts";

export type RuntimeStyleContext = {
  nodeType?: string;
  themeName?: string;
  themeId?: string;
  styleName?: string;
  styleId?: string;
  hasStyleMapping?: boolean;
  objectOverrides?: StyleTokens;
  runtimeOverrides?: StyleTokens;
  styleDefinitions?: Record<string, StyleDefinition>;
};

function normalizeThemeId(value: string | undefined): string {
  const token = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return token || "default-theme";
}

function styleTokensFromLabel(label: string, objectType: string, themeName: string | undefined): StyleTokens {
  const palette = resolveRuntimeThemePalette(themeName);
  const token = String(label ?? "").trim().toLowerCase();
  const output: StyleTokens = {};

  if (token.includes("fill") || token.includes("colored")) {
    output.fill = {
      backgroundColor: palette.surfaceAlt
    };
    output.border = {
      borderColor: palette.border,
      borderWidthPx: 1,
      borderStyle: "solid"
    };
  }

  if (token.includes("line") || token.includes("border")) {
    output.border = {
      ...(output.border ?? {}),
      borderColor: palette.border,
      borderWidthPx: Math.max(1, output.border?.borderWidthPx ?? 1),
      borderStyle: "solid"
    };
  }

  if (token.includes("transparent")) {
    output.fill = {
      ...(output.fill ?? {}),
      backgroundColor: "transparent"
    };
  }

  if (token.includes("secondary")) {
    output.fill = {
      ...(output.fill ?? {}),
      backgroundColor: objectType === "button" ? palette.surfaceAlt : output.fill?.backgroundColor ?? palette.surface
    };
  }

  if (token.includes("inverted")) {
    output.fill = {
      ...(output.fill ?? {}),
      backgroundColor: "#1f2937"
    };
    output.typography = {
      ...(output.typography ?? {}),
      textColor: "#f8fafc"
    };
    output.border = {
      ...(output.border ?? {}),
      borderColor: "#111827",
      borderWidthPx: Math.max(1, output.border?.borderWidthPx ?? 1),
      borderStyle: "solid"
    };
  }

  if (token.includes("shadow")) {
    output.effect = {
      boxShadow: "0 2px 6px rgba(15, 23, 42, 0.2)"
    };
  }

  if (token.includes("knockout")) {
    output.fill = {
      ...(output.fill ?? {}),
      backgroundColor: "#ffffff"
    };
  }

  if (token.includes("center")) {
    output.typography = {
      ...(output.typography ?? {}),
      textAlign: "center"
    };
  } else if (token.includes("right")) {
    output.typography = {
      ...(output.typography ?? {}),
      textAlign: "right"
    };
  }

  return output;
}

function buildStyleChainDefinitions(
  styleName: string | undefined,
  objectType: string,
  themeName: string | undefined
): Record<string, StyleDefinition> {
  const defs: Record<string, StyleDefinition> = {};
  const defaultId = normalizeStyleId("default");
  defs[defaultId] = {
    id: defaultId,
    name: "Default",
    tokens: {}
  };

  const rawName = String(styleName ?? "").trim();
  if (!rawName) {
    return defs;
  }

  const segments = rawName
    .split("|")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  let parentId = defaultId;
  for (const segment of segments) {
    const id = normalizeStyleId(segment);
    if (!defs[id]) {
      defs[id] = {
        id,
        name: segment,
        basedOn: parentId,
        tokens: styleTokensFromLabel(segment, objectType, themeName)
      };
    } else {
      defs[id] = {
        ...defs[id],
        basedOn: defs[id].basedOn ?? parentId
      };
    }
    parentId = id;
  }

  const finalId = normalizeStyleId(rawName);
  defs[finalId] = {
    id: finalId,
    name: rawName,
    basedOn: parentId,
    tokens: styleTokensFromLabel(rawName, objectType, themeName)
  };
  return defs;
}

export function buildThemeDefinition(options: {
  objectType: string;
  themeName?: string;
  styleName?: string;
  styleDefinitions?: Record<string, StyleDefinition>;
}): ThemeDefinition {
  const palette = resolveRuntimeThemePalette(options.themeName);
  const objectType = String(options.objectType ?? "").trim().toLowerCase();
  const defaults: StyleTokens = {
    typography: {
      fontFamily: resolveFmFontStack("Helvetica"),
      fontSizePx: 13,
      fontWeight: "normal",
      fontStyle: "normal",
      textColor: palette.text,
      textAlign: "left",
      verticalAlign: "top",
      wrap: objectType === "label" || objectType === "text" ? "word" : "none",
      lineHeightPx: 16
    },
    fill: {
      backgroundColor:
        objectType === "field"
          ? palette.inputBackground
          : objectType === "portal"
            ? palette.portalBackground
            : objectType === "button"
              ? palette.buttonBackground
              : "transparent"
    },
    border: {
      borderColor:
        objectType === "field"
          ? palette.inputBorder
          : objectType === "portal"
            ? palette.portalBorder
            : objectType === "button"
              ? palette.buttonBorder
              : "transparent",
      borderWidthPx: objectType === "field" || objectType === "portal" || objectType === "button" ? 1 : 0,
      borderStyle: objectType === "field" || objectType === "portal" || objectType === "button" ? "solid" : "none",
      cornerRadiusPx: objectType === "button" ? 4 : 0
    },
    padding: {
      pt: objectType === "field" || objectType === "button" ? 4 : 0,
      pr: objectType === "field" || objectType === "button" ? 6 : 0,
      pb: objectType === "field" || objectType === "button" ? 4 : 0,
      pl: objectType === "field" || objectType === "button" ? 6 : 0
    },
    effect: {}
  };

  const builtStyles = buildStyleChainDefinitions(options.styleName, objectType, options.themeName);
  const stylesById: Record<string, StyleDefinition> = {
    ...builtStyles,
    ...(options.styleDefinitions ?? {})
  };

  return {
    id: normalizeThemeId(options.themeName),
    name: options.themeName || "Default",
    defaults,
    stylesById
  };
}

export function resolveStyleChain(options: {
  stylesById: Record<string, StyleDefinition>;
  styleId: string;
}): {
  chain: StyleDefinition[];
  warnings: string[];
} {
  const stylesById = options.stylesById ?? {};
  const styleId = normalizeStyleId(options.styleId);
  const warnings: string[] = [];
  const chain: StyleDefinition[] = [];
  const visited = new Set<string>();

  let cursor = stylesById[styleId];
  while (cursor) {
    if (visited.has(cursor.id)) {
      warnings.push(`Cycle detected in style basedOn chain at "${cursor.id}".`);
      break;
    }
    visited.add(cursor.id);
    chain.unshift(cursor);
    if (!cursor.basedOn) {
      break;
    }
    const nextId = normalizeStyleId(cursor.basedOn);
    cursor = stylesById[nextId];
  }

  return {
    chain,
    warnings
  };
}

function cleanColor(value: string | undefined): string | undefined {
  const token = String(value ?? "").trim();
  return token || undefined;
}

export function styleTokensFromComponentProps(props: Partial<LayoutComponent["props"]>): StyleTokens {
  const tokens: StyleTokens = {};

  if (
    props.fontFamily ||
    Number.isFinite(props.fontSize) ||
    props.fontWeight ||
    props.textColor ||
    props.textAlign ||
    Number.isFinite(props.lineSpacingHeight)
  ) {
    tokens.typography = {
      fontFamily: props.fontFamily ? resolveFmFontStack(props.fontFamily) : undefined,
      fontSizePx: Number.isFinite(props.fontSize) ? Math.max(1, Number(props.fontSize)) : undefined,
      fontWeight:
        props.fontWeight === "bold" || props.fontWeight === "boldItalic"
          ? "bold"
          : props.fontWeight === "regular"
            ? "normal"
            : undefined,
      fontStyle:
        props.fontWeight === "italic" || props.fontWeight === "boldItalic"
          ? "italic"
          : props.fontWeight === "regular" || props.fontWeight === "bold"
            ? "normal"
            : undefined,
      textColor: cleanColor(props.textColor),
      textAlign:
        props.textAlign === "left" || props.textAlign === "center" || props.textAlign === "right"
          ? props.textAlign
          : undefined,
      lineHeightPx: Number.isFinite(props.lineSpacingHeight) ? Math.max(1, Number(props.lineSpacingHeight)) : undefined
    };
  }

  if (props.fillType || props.fillColor || props.fillGradientStartColor || props.fillGradientEndColor) {
    if (props.fillType === "solid") {
      tokens.fill = {
        backgroundColor: cleanColor(props.fillColor)
      };
    } else if (props.fillType === "gradient") {
      const start = cleanColor(props.fillGradientStartColor) || cleanColor(props.fillColor) || "#f8fafc";
      const end = cleanColor(props.fillGradientEndColor) || cleanColor(props.fillColor) || "#e2e8f0";
      const angle = Number.isFinite(props.fillGradientAngle) ? Math.round(Number(props.fillGradientAngle)) : 180;
      tokens.fill = {
        backgroundColor: `linear-gradient(${angle}deg, ${start}, ${end})`
      };
    } else if (props.fillType === "none") {
      tokens.fill = {
        backgroundColor: "transparent"
      };
    }
  }

  if (props.lineStyle || Number.isFinite(props.lineWidth) || props.lineColor || Number.isFinite(props.cornerRadius)) {
    tokens.border = {
      borderStyle:
        props.lineStyle === "solid" || props.lineStyle === "dashed" || props.lineStyle === "none"
          ? props.lineStyle
          : undefined,
      borderWidthPx: Number.isFinite(props.lineWidth) ? Math.max(0, Number(props.lineWidth)) : undefined,
      borderColor: cleanColor(props.lineColor),
      cornerRadiusPx: Number.isFinite(props.cornerRadius) ? Math.max(0, Number(props.cornerRadius)) : undefined
    };
  }

  if (
    Number.isFinite(props.paddingTop) ||
    Number.isFinite(props.paddingRight) ||
    Number.isFinite(props.paddingBottom) ||
    Number.isFinite(props.paddingLeft)
  ) {
    tokens.padding = {
      pt: Number.isFinite(props.paddingTop) ? Math.max(0, Number(props.paddingTop)) : 0,
      pr: Number.isFinite(props.paddingRight) ? Math.max(0, Number(props.paddingRight)) : 0,
      pb: Number.isFinite(props.paddingBottom) ? Math.max(0, Number(props.paddingBottom)) : 0,
      pl: Number.isFinite(props.paddingLeft) ? Math.max(0, Number(props.paddingLeft)) : 0
    };
  }

  if (props.effectOuterShadow === true) {
    tokens.effect = {
      boxShadow: "0 2px 6px rgba(15, 23, 42, 0.22)"
    };
  }

  return tokens;
}

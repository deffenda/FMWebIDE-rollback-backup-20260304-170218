import type { CSSProperties } from "react";
import { cssFromTokens } from "./cssFromTokens.ts";
import { buildThemeDefinition, resolveStyleChain, type RuntimeStyleContext } from "./resolveStyleStack.ts";
import type {
  EffectToken,
  FillToken,
  PaddingToken,
  ResolvedTokenBundle,
  StyleDefinition,
  StyleTokens,
  TypographyToken
} from "./tokens.ts";
import {
  DEFAULT_BORDER_TOKEN,
  DEFAULT_EFFECT_TOKEN,
  DEFAULT_FILL_TOKEN,
  DEFAULT_PADDING_TOKEN,
  DEFAULT_TYPOGRAPHY_TOKEN,
  normalizeStyleId
} from "./tokens.ts";

export type StyleSource = "themeDefault" | "style" | "basedOn" | "objectOverride" | "runtime";

export type ResolvedStyle = {
  tokens: ResolvedTokenBundle;
  css: CSSProperties;
  textCss: CSSProperties;
  debug: {
    styleId?: string;
    styleName?: string;
    themeId?: string;
    themeName?: string;
    chain: string[];
    warnings: string[];
    sources: Record<string, StyleSource>;
    missingStyleMapping: boolean;
  };
};

function copyTokens(bundle: ResolvedTokenBundle): ResolvedTokenBundle {
  return {
    typography: { ...bundle.typography },
    fill: { ...bundle.fill },
    border: { ...bundle.border },
    padding: { ...bundle.padding },
    effect: { ...bundle.effect }
  };
}

function newResolvedBundle(): ResolvedTokenBundle {
  return {
    typography: { ...DEFAULT_TYPOGRAPHY_TOKEN },
    fill: { ...DEFAULT_FILL_TOKEN },
    border: { ...DEFAULT_BORDER_TOKEN },
    padding: { ...DEFAULT_PADDING_TOKEN },
    effect: { ...DEFAULT_EFFECT_TOKEN }
  };
}

function assignTypography(
  target: TypographyToken,
  patch: Partial<TypographyToken> | undefined,
  source: StyleSource,
  sources: Record<string, StyleSource>
): void {
  if (!patch) {
    return;
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value == null) {
      continue;
    }
    const typedKey = key as keyof TypographyToken;
    target[typedKey] = value as never;
    sources[`typography.${typedKey}`] = source;
  }
}

function assignFill(
  target: FillToken,
  patch: Partial<FillToken> | undefined,
  source: StyleSource,
  sources: Record<string, StyleSource>
): void {
  if (!patch) {
    return;
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value == null) {
      continue;
    }
    const typedKey = key as keyof FillToken;
    target[typedKey] = value as never;
    sources[`fill.${typedKey}`] = source;
  }
}

function assignBorder(
  target: ResolvedTokenBundle["border"],
  patch: Partial<ResolvedTokenBundle["border"]> | undefined,
  source: StyleSource,
  sources: Record<string, StyleSource>
): void {
  if (!patch) {
    return;
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value == null) {
      continue;
    }
    const typedKey = key as keyof ResolvedTokenBundle["border"];
    target[typedKey] = value as never;
    sources[`border.${typedKey}`] = source;
  }
}

function assignPadding(
  target: PaddingToken,
  patch: Partial<PaddingToken> | undefined,
  source: StyleSource,
  sources: Record<string, StyleSource>
): void {
  if (!patch) {
    return;
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value == null) {
      continue;
    }
    const typedKey = key as keyof PaddingToken;
    target[typedKey] = value as never;
    sources[`padding.${typedKey}`] = source;
  }
}

function assignEffect(
  target: EffectToken,
  patch: Partial<EffectToken> | undefined,
  source: StyleSource,
  sources: Record<string, StyleSource>
): void {
  if (!patch) {
    return;
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value == null) {
      continue;
    }
    const typedKey = key as keyof EffectToken;
    target[typedKey] = value as never;
    sources[`effect.${typedKey}`] = source;
  }
}

function applyTokens(
  target: ResolvedTokenBundle,
  patch: StyleTokens | undefined,
  source: StyleSource,
  sources: Record<string, StyleSource>
): void {
  if (!patch) {
    return;
  }
  assignTypography(target.typography, patch.typography, source, sources);
  assignFill(target.fill, patch.fill, source, sources);
  assignBorder(target.border, patch.border, source, sources);
  assignPadding(target.padding, patch.padding, source, sources);
  assignEffect(target.effect, patch.effect, source, sources);
}

export function resolveStyle(options: RuntimeStyleContext): ResolvedStyle {
  const styleId = normalizeStyleId(options.styleId || options.styleName || "default");
  const styleName = String(options.styleName ?? "").trim() || "Default";
  const theme = buildThemeDefinition({
    objectType: String(options.nodeType ?? "shape"),
    themeName: options.themeName,
    styleName,
    styleDefinitions: options.styleDefinitions
  });
  const base = newResolvedBundle();
  const sources: Record<string, StyleSource> = {};
  applyTokens(base, theme.defaults, "themeDefault", sources);

  const chainResult = resolveStyleChain({
    stylesById: theme.stylesById,
    styleId
  });
  const chainIds = chainResult.chain.map((entry) => entry.id);
  const missingStyleMapping =
    options.hasStyleMapping === false ||
    (chainResult.chain.length === 0 && styleId !== "default");

  const applyStyleNode = (style: StyleDefinition): void => {
    const source: StyleSource = style.basedOn ? "basedOn" : "style";
    applyTokens(base, style.tokens, source, sources);
  };
  for (const style of chainResult.chain) {
    applyStyleNode(style);
  }

  applyTokens(base, options.objectOverrides, "objectOverride", sources);
  applyTokens(base, options.runtimeOverrides, "runtime", sources);

  const tokens = copyTokens(base);
  const cssLayers = cssFromTokens(tokens);
  return {
    tokens,
    css: cssLayers.css,
    textCss: cssLayers.textCss,
    debug: {
      styleId,
      styleName,
      themeId: options.themeId || theme.id,
      themeName: options.themeName || theme.name,
      chain: chainIds,
      warnings: chainResult.warnings,
      sources,
      missingStyleMapping
    }
  };
}

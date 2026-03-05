export type TypographyToken = {
  fontFamily: string;
  fontSizePx: number;
  fontWeight: number | "normal" | "bold";
  fontStyle: "normal" | "italic";
  textColor: string;
  textAlign: "left" | "center" | "right";
  verticalAlign: "top" | "middle" | "bottom";
  wrap: "none" | "word" | "char";
  lineHeightPx?: number;
  letterSpacingPx?: number;
};

export type FillToken = {
  backgroundColor?: string;
};

export type BorderToken = {
  borderColor?: string;
  borderWidthPx?: number;
  borderStyle?: "solid" | "dashed" | "dotted" | "none";
  cornerRadiusPx?: number;
};

export type PaddingToken = {
  pt: number;
  pr: number;
  pb: number;
  pl: number;
};

export type EffectToken = {
  boxShadow?: string;
};

export type StyleTokens = {
  typography?: Partial<TypographyToken>;
  fill?: Partial<FillToken>;
  border?: Partial<BorderToken>;
  padding?: Partial<PaddingToken>;
  effect?: Partial<EffectToken>;
};

export type ResolvedTokenBundle = {
  typography: TypographyToken;
  fill: FillToken;
  border: BorderToken;
  padding: PaddingToken;
  effect: EffectToken;
};

export type StyleDefinition = {
  id: string;
  name: string;
  basedOn?: string;
  tokens: StyleTokens;
};

export type ThemeDefinition = {
  id: string;
  name: string;
  defaults: StyleTokens;
  stylesById: Record<string, StyleDefinition>;
};

export const DEFAULT_TYPOGRAPHY_TOKEN: TypographyToken = {
  fontFamily: "Helvetica, Arial, sans-serif",
  fontSizePx: 13,
  fontWeight: "normal",
  fontStyle: "normal",
  textColor: "#111827",
  textAlign: "left",
  verticalAlign: "top",
  wrap: "word",
  lineHeightPx: 16
};

export const DEFAULT_FILL_TOKEN: FillToken = {
  backgroundColor: "transparent"
};

export const DEFAULT_BORDER_TOKEN: BorderToken = {
  borderColor: "transparent",
  borderWidthPx: 0,
  borderStyle: "none",
  cornerRadiusPx: 0
};

export const DEFAULT_PADDING_TOKEN: PaddingToken = {
  pt: 0,
  pr: 0,
  pb: 0,
  pl: 0
};

export const DEFAULT_EFFECT_TOKEN: EffectToken = {};

export function normalizeStyleId(value: string): string {
  const token = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s|/]+/g, "-")
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return token || "default";
}


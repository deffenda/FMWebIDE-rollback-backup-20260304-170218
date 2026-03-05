import type { CSSProperties } from "react";
import type { ResolvedTokenBundle } from "./tokens.ts";

function toAlignItems(value: "top" | "middle" | "bottom"): CSSProperties["alignItems"] {
  if (value === "middle") {
    return "center";
  }
  if (value === "bottom") {
    return "flex-end";
  }
  return "flex-start";
}

function toWrapStyles(
  wrap: "none" | "word" | "char"
): Pick<CSSProperties, "whiteSpace" | "overflow" | "textOverflow" | "wordBreak"> {
  if (wrap === "none") {
    return {
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      wordBreak: "normal"
    };
  }
  if (wrap === "char") {
    return {
      whiteSpace: "normal",
      overflow: "hidden",
      textOverflow: "clip",
      wordBreak: "break-all"
    };
  }
  return {
    whiteSpace: "normal",
    overflow: "hidden",
    textOverflow: "clip",
    wordBreak: "break-word"
  };
}

export function cssFromTokens(tokens: ResolvedTokenBundle): {
  css: CSSProperties;
  textCss: CSSProperties;
} {
  const fillToken = String(tokens.fill.backgroundColor ?? "").trim();
  const isGradientFill = fillToken.startsWith("linear-gradient(");
  const css: CSSProperties = {
    boxSizing: "border-box",
    backgroundColor: isGradientFill ? undefined : tokens.fill.backgroundColor,
    background: isGradientFill ? fillToken : undefined,
    borderColor: tokens.border.borderColor,
    borderWidth: tokens.border.borderWidthPx,
    borderStyle: tokens.border.borderStyle,
    borderRadius: tokens.border.cornerRadiusPx,
    boxShadow: tokens.effect.boxShadow,
    display: "flex",
    alignItems: toAlignItems(tokens.typography.verticalAlign),
    justifyContent: "stretch",
    overflow: "hidden"
  };
  const wrapStyles = toWrapStyles(tokens.typography.wrap);
  const textCss: CSSProperties = {
    fontFamily: tokens.typography.fontFamily,
    fontSize: tokens.typography.fontSizePx,
    fontWeight: tokens.typography.fontWeight,
    fontStyle: tokens.typography.fontStyle,
    color: tokens.typography.textColor,
    textAlign: tokens.typography.textAlign,
    lineHeight: tokens.typography.lineHeightPx ? `${tokens.typography.lineHeightPx}px` : undefined,
    letterSpacing: tokens.typography.letterSpacingPx != null ? `${tokens.typography.letterSpacingPx}px` : undefined,
    paddingTop: tokens.padding.pt,
    paddingRight: tokens.padding.pr,
    paddingBottom: tokens.padding.pb,
    paddingLeft: tokens.padding.pl,
    width: "100%",
    boxSizing: "border-box",
    ...wrapStyles
  };
  return {
    css,
    textCss
  };
}

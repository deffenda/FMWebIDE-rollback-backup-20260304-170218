"use client";

import type { CSSProperties } from "react";

type FmTextProps = {
  text: string;
  textCss: CSSProperties;
  className?: string;
};

export function FmText({ text, textCss, className }: FmTextProps) {
  return (
    <span className={className ?? "fm-object-text"} style={textCss}>
      {text}
    </span>
  );
}


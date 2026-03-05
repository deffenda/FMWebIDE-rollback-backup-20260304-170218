"use client";

import type { CSSProperties } from "react";
import { FmText } from "@/components/fm/FmText";

type FmTextObjectProps = {
  objectId: string;
  text: string;
  style: CSSProperties;
  textStyle: CSSProperties;
  role?: string;
  ariaLabel?: string;
  title?: string;
};

export function FmTextObject({ objectId, text, style, textStyle, role, ariaLabel, title }: FmTextObjectProps) {
  return (
    <div data-objid={objectId} role={role ?? "note"} aria-label={ariaLabel} style={style} title={title} className="fm-text-object">
      <FmText text={text} textCss={textStyle} />
    </div>
  );
}


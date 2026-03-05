"use client";

import type { CSSProperties } from "react";

type FmRectangleProps = {
  objectId: string;
  style: CSSProperties;
  role?: string;
  ariaLabel?: string;
  title?: string;
};

export function FmRectangle({ objectId, style, role, ariaLabel, title }: FmRectangleProps) {
  return (
    <div
      data-objid={objectId}
      role={role ?? "presentation"}
      aria-label={ariaLabel}
      style={style}
      title={title}
      className="fm-rectangle-object"
    />
  );
}


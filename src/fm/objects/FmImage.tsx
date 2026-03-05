"use client";

import type { CSSProperties } from "react";

type FmImageProps = {
  objectId: string;
  src?: string;
  alt: string;
  style: CSSProperties;
  title?: string;
};

export function FmImage({ objectId, src, alt, style, title }: FmImageProps) {
  if (!src) {
    return (
      <div data-objid={objectId} role="img" aria-label={alt} style={style} title={title} className="fm-image-placeholder">
        <span>{alt}</span>
      </div>
    );
  }
  return (
    <img
      data-objid={objectId}
      role="img"
      aria-label={alt}
      src={src}
      alt={alt}
      title={title}
      style={{
        ...style,
        objectFit: "cover"
      }}
      className="fm-image-object"
    />
  );
}


"use client";

import type { CSSProperties, ReactNode, UIEvent } from "react";

type FmObjectProps = {
  tag?: "div" | "section";
  role?: string;
  ariaLabel?: string;
  dataObjectId: string;
  title?: string;
  style: CSSProperties;
  className?: string;
  onClick?: () => void;
  onFocus?: () => void;
  onMouseEnter?: () => void;
  onScroll?: (event: UIEvent<HTMLElement>) => void;
  children?: ReactNode;
};

export function FmObject({
  tag = "div",
  role,
  ariaLabel,
  dataObjectId,
  title,
  style,
  className,
  onClick,
  onFocus,
  onMouseEnter,
  onScroll,
  children
}: FmObjectProps) {
  if (tag === "section") {
    return (
      <section
        data-objid={dataObjectId}
        role={role}
        aria-label={ariaLabel}
        title={title}
        style={style}
        className={className}
        onClick={onClick}
        onFocus={onFocus}
        onMouseEnter={onMouseEnter}
        onScroll={onScroll}
      >
        {children}
      </section>
    );
  }
  return (
    <div
      data-objid={dataObjectId}
      role={role}
      aria-label={ariaLabel}
      title={title}
      style={style}
      className={className}
      onClick={onClick}
      onFocus={onFocus}
      onMouseEnter={onMouseEnter}
      onScroll={onScroll}
    >
      {children}
    </div>
  );
}

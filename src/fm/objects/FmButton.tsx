"use client";

import type { CSSProperties, KeyboardEvent } from "react";
import { FmText } from "@/components/fm/FmText";

type FmButtonProps = {
  objectId: string;
  text: string;
  role?: string;
  ariaLabel?: string;
  disabled?: boolean;
  title?: string;
  style: CSSProperties;
  textStyle: CSSProperties;
  onClick: () => void;
  onFocus: () => void;
};

export function FmButton({
  objectId,
  text,
  role,
  ariaLabel,
  disabled,
  title,
  style,
  textStyle,
  onClick,
  onFocus
}: FmButtonProps) {
  return (
    <button
      type="button"
      data-objid={objectId}
      role={role}
      aria-label={ariaLabel}
      disabled={disabled}
      title={title}
      style={{
        ...style,
        ...textStyle
      }}
      className="fm-object-button"
      onClick={onClick}
      onFocus={onFocus}
      onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <FmText text={text} textCss={textStyle} />
    </button>
  );
}


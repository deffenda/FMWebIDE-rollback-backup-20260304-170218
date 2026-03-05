"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent, KeyboardEvent } from "react";

export type FmFieldKind = "text" | "number" | "date" | "time" | "multiline" | "container";

export type FmFieldProps = {
  objectId: string;
  recordId: string;
  fieldName: string;
  kind: FmFieldKind;
  value: unknown;
  placeholder?: string;
  disabled?: boolean;
  style: CSSProperties;
  textStyle: CSSProperties;
  errorMessage?: string;
  onFocus: () => void;
  onBlur: (options: { commitOnBlur: boolean }) => void;
  onInput: (nextValue: string) => void;
  onKeyDown: (payload: {
    key: string;
    shiftKey: boolean;
    metaKey: boolean;
    ctrlKey: boolean;
    altKey: boolean;
    commitOnEnter: boolean;
  }) => void;
};

function stringifyValue(value: unknown): string {
  if (value == null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function formatDateToken(value: string): string {
  if (!value.trim()) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  const month = `${parsed.getMonth() + 1}`.padStart(2, "0");
  const day = `${parsed.getDate()}`.padStart(2, "0");
  const year = `${parsed.getFullYear()}`;
  return `${month}/${day}/${year}`;
}

function formatTimeToken(value: string): string {
  if (!value.trim()) {
    return "";
  }
  const parsed = new Date(`1970-01-01T${value}`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatDisplayValue(kind: FmFieldKind, value: string): string {
  if (!value) {
    return "";
  }
  if (kind === "number") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 8
      }).format(parsed);
    }
    return value;
  }
  if (kind === "date") {
    return formatDateToken(value);
  }
  if (kind === "time") {
    return formatTimeToken(value);
  }
  return value;
}

function fileExtension(value: string): string {
  const token = value.trim().toLowerCase();
  if (!token) {
    return "";
  }
  const clean = token.split("?")[0] ?? token;
  const segments = clean.split(".");
  if (segments.length < 2) {
    return "";
  }
  return segments[segments.length - 1] ?? "";
}

function isPreviewableImage(extension: string): boolean {
  return ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tiff"].includes(extension);
}

function containerPreview(value: string): { mode: "empty" | "image" | "icon"; src?: string; label?: string } {
  const token = value.trim();
  if (!token) {
    return { mode: "empty", label: "No file" };
  }
  const ext = fileExtension(token);
  if (ext && isPreviewableImage(ext)) {
    return {
      mode: "image",
      src: token,
      label: ext.toUpperCase()
    };
  }
  return {
    mode: "icon",
    label: ext ? ext.toUpperCase() : "FILE"
  };
}

function keyPayload(event: KeyboardEvent<HTMLElement>) {
  return {
    key: event.key,
    shiftKey: event.shiftKey,
    metaKey: event.metaKey,
    ctrlKey: event.ctrlKey,
    altKey: event.altKey
  };
}

export function FmField({
  objectId,
  recordId,
  fieldName,
  kind,
  value,
  placeholder,
  disabled,
  style,
  textStyle,
  errorMessage,
  onFocus,
  onBlur,
  onInput,
  onKeyDown
}: FmFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(() => stringifyValue(value));
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!editing) {
      setDraftValue(stringifyValue(value));
    }
  }, [editing, value]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select?.();
    }
  }, [editing]);

  const effectiveValue = stringifyValue(value);
  const displayValue = useMemo(() => formatDisplayValue(kind, effectiveValue), [effectiveValue, kind]);

  const shellStyle: CSSProperties = {
    ...style,
    outline: errorMessage ? "1px solid #ef4444" : style.outline
  };

  if (kind === "container") {
    const preview = containerPreview(effectiveValue);
    return (
      <div
        data-objid={objectId}
        role="group"
        aria-label={`${fieldName} container`}
        className="fm-field fm-field-container"
        style={shellStyle}
        title={errorMessage ?? placeholder ?? fieldName}
      >
        {preview.mode === "image" && preview.src ? (
          <img src={preview.src} alt={preview.label ?? fieldName} className="fm-field-container-preview" />
        ) : preview.mode === "icon" ? (
          <div className="fm-field-container-icon">{preview.label}</div>
        ) : (
          <div className="fm-field-placeholder">{preview.label ?? placeholder ?? "Container"}</div>
        )}
      </div>
    );
  }

  if (!editing || disabled) {
    return (
      <div
        data-objid={objectId}
        role="textbox"
        aria-label={fieldName}
        tabIndex={disabled ? -1 : 0}
        className={`fm-field fm-field-display ${errorMessage ? "has-error" : ""}`}
        style={shellStyle}
        onFocus={() => {
          if (disabled) {
            return;
          }
          setEditing(true);
          onFocus();
        }}
        onKeyDown={(event) => {
          if (disabled) {
            return;
          }
          if (event.key === "Tab" || event.key === "Escape") {
            event.preventDefault();
            onKeyDown({
              ...keyPayload(event),
              commitOnEnter: false
            });
            return;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            setEditing(true);
            onFocus();
            return;
          }
          if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
            event.preventDefault();
            const next = event.key;
            setDraftValue(next);
            setEditing(true);
            onFocus();
            onInput(next);
          }
        }}
        title={errorMessage ?? placeholder ?? fieldName}
      >
        <span className="fm-field-display-value" style={textStyle}>
          {displayValue || placeholder || ""}
        </span>
      </div>
    );
  }

  const sharedProps = {
    "data-objid": objectId,
    "aria-label": fieldName,
    className: `fm-field fm-field-input ${errorMessage ? "has-error" : ""}`,
    style: {
      ...shellStyle,
      ...textStyle
    } as CSSProperties,
    title: errorMessage ?? placeholder ?? fieldName,
    value: draftValue,
    onFocus: () => {
      onFocus();
    },
    onBlur: () => {
      setEditing(false);
      onBlur({ commitOnBlur: true });
    },
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const next = event.currentTarget.value;
      setDraftValue(next);
      onInput(next);
    },
    onKeyDown: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (event.key === "Tab" || event.key === "Escape" || event.key === "Enter") {
        event.preventDefault();
      }
      if (event.key === "Escape") {
        setDraftValue(effectiveValue);
        setEditing(false);
      }
      onKeyDown({
        ...keyPayload(event),
        commitOnEnter: kind !== "multiline"
      });
    },
    disabled
  } as const;

  if (kind === "multiline") {
    return (
      <textarea
        {...sharedProps}
        ref={(node) => {
          inputRef.current = node;
        }}
      />
    );
  }

  return (
    <input
      {...sharedProps}
      ref={(node) => {
        inputRef.current = node;
      }}
      type={kind === "number" ? "number" : kind === "date" ? "date" : kind === "time" ? "time" : "text"}
    />
  );
}

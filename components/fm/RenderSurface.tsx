"use client";

import { useCallback, useMemo, useState } from "react";
import type { CSSProperties, ReactElement } from "react";
import type { RuntimeClientEventType, RuntimeRenderTreeNode } from "@/src/server/runtime/types";
import { resolveStyle, type ResolvedStyle } from "@/src/fm/styles/resolveStyle";
import type { RuntimeStyleContext } from "@/src/fm/styles/resolveStyleStack";
import { FmButton, FmField, FmImage, FmRectangle, FmTextObject, type FmFieldKind } from "@/src/fm/objects";
import { DiagnosticsOverlay } from "./DiagnosticsOverlay";
import { FmObject } from "./FmObject";
import { FmText } from "./FmText";

type RenderSurfaceProps = {
  renderTree: RuntimeRenderTreeNode | null;
  diagnosticsEnabled: boolean;
  onEvent: (eventType: RuntimeClientEventType, objectId: string, payload?: Record<string, unknown>) => void;
  onFieldInput: (objectId: string, nextValue: string) => void;
  resolveFieldValue: (objectId: string, nodeValue: unknown) => string;
  fieldErrorsByObjectId?: Map<string, string>;
};

function resolveFieldKind(node: RuntimeRenderTreeNode): FmFieldKind {
  const rawMeta = (node.meta ?? {}) as Record<string, unknown>;
  const fieldBehavior = (rawMeta.fieldBehavior ?? {}) as Record<string, unknown>;
  const token = String(fieldBehavior.kind ?? "").trim().toLowerCase();
  if (
    token === "text" ||
    token === "number" ||
    token === "date" ||
    token === "time" ||
    token === "multiline" ||
    token === "container"
  ) {
    return token;
  }
  if (node.type.includes("number")) {
    return "number";
  }
  if (node.type.includes("date")) {
    return "date";
  }
  if (node.type.includes("time")) {
    return "time";
  }
  if (node.type.includes("multiline")) {
    return "multiline";
  }
  if (node.type.includes("container")) {
    return "container";
  }
  return "text";
}

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

export function RenderSurface({
  renderTree,
  diagnosticsEnabled,
  onEvent,
  onFieldInput,
  resolveFieldValue,
  fieldErrorsByObjectId
}: RenderSurfaceProps) {
  const [hoveredObjectId, setHoveredObjectId] = useState<string | null>(null);
  const [wireframeOnly, setWireframeOnly] = useState(false);
  const [highlightMissingMappings, setHighlightMissingMappings] = useState(false);

  const resolvedStylesByObjectId = useMemo(() => {
    const map = new Map<string, ResolvedStyle>();
    const walk = (node: RuntimeRenderTreeNode) => {
      const rawMeta = (node.meta ?? {}) as Record<string, unknown>;
      const rawStyleContext = (rawMeta.styleContext ?? {}) as Record<string, unknown>;
      const objectOverrides = rawStyleContext.objectOverrides as RuntimeStyleContext["objectOverrides"] | undefined;

      const runtimeOverrides = wireframeOnly
        ? ({
            fill: {
              backgroundColor: "transparent"
            },
            border: {
              borderColor: "rgba(16, 185, 129, 0.9)",
              borderStyle: "dashed",
              borderWidthPx: 1
            }
          } satisfies RuntimeStyleContext["runtimeOverrides"])
        : undefined;

      const resolved = resolveStyle({
        nodeType: String(rawStyleContext.nodeType ?? node.type),
        themeName: String(rawStyleContext.themeName ?? ""),
        themeId: String(rawStyleContext.themeId ?? ""),
        styleName: String(rawStyleContext.styleName ?? ""),
        styleId: String(rawStyleContext.styleId ?? ""),
        hasStyleMapping: rawStyleContext.hasStyleMapping === true,
        objectOverrides,
        runtimeOverrides
      });

      if (highlightMissingMappings && resolved.debug.missingStyleMapping) {
        const highlighted = resolveStyle({
          nodeType: String(rawStyleContext.nodeType ?? node.type),
          themeName: String(rawStyleContext.themeName ?? ""),
          themeId: String(rawStyleContext.themeId ?? ""),
          styleName: String(rawStyleContext.styleName ?? ""),
          styleId: String(rawStyleContext.styleId ?? ""),
          hasStyleMapping: rawStyleContext.hasStyleMapping === true,
          objectOverrides,
          runtimeOverrides: {
            border: {
              borderStyle: "dashed",
              borderColor: "#f43f5e",
              borderWidthPx: 1
            }
          }
        });
        map.set(node.objectId, highlighted);
      } else {
        map.set(node.objectId, resolved);
      }

      for (const child of node.children ?? []) {
        walk(child);
      }
    };
    if (renderTree) {
      walk(renderTree);
    }
    return map;
  }, [highlightMissingMappings, renderTree, wireframeOnly]);

  const renderNode = useCallback(
    (node: RuntimeRenderTreeNode): ReactElement | null => {
      if (node.hidden) {
        return null;
      }
      const style = (node.style ?? {}) as CSSProperties;
      const resolvedStyle = resolvedStylesByObjectId.get(node.objectId);
      const resolvedWrapperStyle = resolvedStyle?.css ?? {};
      const resolvedTextStyle = resolvedStyle?.textCss ?? {};
      const mergedStyle = {
        ...resolvedWrapperStyle,
        ...style
      } as CSSProperties;
      const commonProps = {
        key: node.nodeId,
        role: node.role,
        ariaLabel: node.ariaLabel,
        dataObjectId: node.objectId,
        style: mergedStyle,
        title: diagnosticsEnabled ? node.objectId : undefined,
        onMouseEnter: () => {
          if (diagnosticsEnabled) {
            setHoveredObjectId(node.objectId);
          }
        }
      } as const;
      const children = (node.children ?? []).map((child) => renderNode(child)).filter(Boolean) as ReactElement[];

      if (node.tag === "input") {
        const value = resolveFieldValue(node.objectId, node.value);
        const fieldKind = resolveFieldKind(node);
        const rawMeta = (node.meta ?? {}) as Record<string, unknown>;
        const fieldBehavior = (rawMeta.fieldBehavior ?? {}) as Record<string, unknown>;
        const fieldName = String(fieldBehavior.fieldName ?? node.ariaLabel ?? node.objectId);
        const recordId = String(fieldBehavior.recordId ?? "");
        const placeholder = String(fieldBehavior.placeholder ?? "");
        const disabled = node.disabled || fieldBehavior.readOnly === true;
        const errorMessage = fieldErrorsByObjectId?.get(node.objectId);
        return (
          <FmField
            key={node.nodeId}
            objectId={node.objectId}
            recordId={recordId}
            fieldName={fieldName}
            kind={fieldKind}
            value={value}
            placeholder={placeholder}
            disabled={disabled}
            style={mergedStyle}
            textStyle={resolvedTextStyle}
            errorMessage={errorMessage}
            onFocus={() => onEvent("focus", node.objectId)}
            onBlur={() => onEvent("blur", node.objectId, { commitOnBlur: true })}
            onInput={(nextValue) => onFieldInput(node.objectId, nextValue)}
            onKeyDown={(payload) => {
              onEvent("keydown", node.objectId, payload);
            }}
          />
        );
      }

      if (node.tag === "button") {
        return (
          <FmButton
            key={node.nodeId}
            objectId={node.objectId}
            text={stringifyValue(node.text || "Button")}
            role={node.role}
            aria-label={node.ariaLabel}
            style={mergedStyle}
            textStyle={resolvedTextStyle}
            title={commonProps.title}
            disabled={node.disabled}
            onClick={() => onEvent("click", node.objectId)}
            onFocus={() => onEvent("focus", node.objectId)}
          />
        );
      }

      if (node.type === "text" || node.type === "static-text" || node.objectId.startsWith("label")) {
        return (
          <FmTextObject
            key={node.nodeId}
            objectId={node.objectId}
            role={node.role}
            ariaLabel={node.ariaLabel}
            title={commonProps.title}
            text={stringifyValue(node.text)}
            style={mergedStyle}
            textStyle={resolvedTextStyle}
          />
        );
      }

      if (node.type === "rectangle" || node.type === "shape") {
        return (
          <FmRectangle
            key={node.nodeId}
            objectId={node.objectId}
            role={node.role}
            ariaLabel={node.ariaLabel}
            title={commonProps.title}
            style={mergedStyle}
          />
        );
      }

      if (node.type === "image" || node.tag === "img") {
        const rawMeta = (node.meta ?? {}) as Record<string, unknown>;
        const imageSrc = String(rawMeta.imageSrc ?? "");
        return (
          <FmImage
            key={node.nodeId}
            objectId={node.objectId}
            src={imageSrc || undefined}
            alt={node.ariaLabel || node.text || "Image"}
            title={commonProps.title}
            style={mergedStyle}
          />
        );
      }

      const Tag = node.tag === "section" ? "section" : "div";
      return (
        <FmObject
          {...commonProps}
          tag={Tag}
          className="fm-object"
          onClick={() => {
            if (node.eventBindings?.includes("click")) {
              onEvent("click", node.objectId);
            }
          }}
          onFocus={() => {
            if (node.eventBindings?.includes("focus")) {
              onEvent("focus", node.objectId);
            }
          }}
          onScroll={(event) => {
            if (node.eventBindings?.includes("portalScroll")) {
              const target = event.currentTarget as HTMLElement;
              onEvent("portalScroll", node.objectId, {
                offset: Math.floor(target.scrollTop / 26)
              });
            }
          }}
        >
          {node.text ? (
            <FmText
              text={stringifyValue(node.text)}
              textCss={resolvedTextStyle}
              className="fm-object-text"
            />
          ) : null}
          {children}
        </FmObject>
      );
    },
    [diagnosticsEnabled, fieldErrorsByObjectId, onEvent, onFieldInput, resolveFieldValue, resolvedStylesByObjectId]
  );

  const renderedTree = useMemo(() => (renderTree ? renderNode(renderTree) : null), [renderNode, renderTree]);

  return (
    <div className="fm-render-surface" data-testid="fm-render-surface">
      {diagnosticsEnabled ? (
        <div className="fm-style-debug-controls">
          <label>
            <input
              type="checkbox"
              checked={wireframeOnly}
              onChange={(event) => setWireframeOnly(event.currentTarget.checked)}
            />
            Wireframe
          </label>
          <label>
            <input
              type="checkbox"
              checked={highlightMissingMappings}
              onChange={(event) => setHighlightMissingMappings(event.currentTarget.checked)}
            />
            Highlight missing mappings
          </label>
        </div>
      ) : null}
      {renderedTree}
      <DiagnosticsOverlay
        visible={diagnosticsEnabled}
        renderTree={renderTree}
        hoveredObjectId={hoveredObjectId}
        resolvedStylesByObjectId={resolvedStylesByObjectId}
      />
    </div>
  );
}

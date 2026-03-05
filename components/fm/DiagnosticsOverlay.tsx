"use client";

import { useMemo } from "react";
import type { RuntimeRenderTreeNode } from "@/src/server/runtime/types";
import type { ResolvedStyle } from "@/src/fm/styles/resolveStyle";

type DiagnosticsOverlayProps = {
  visible: boolean;
  renderTree: RuntimeRenderTreeNode | null;
  hoveredObjectId: string | null;
  resolvedStylesByObjectId: Map<string, ResolvedStyle>;
};

type FlatNode = {
  objectId: string;
  type: string;
  bounds: RuntimeRenderTreeNode["bounds"];
  meta: RuntimeRenderTreeNode["meta"];
};

function flattenNodes(node: RuntimeRenderTreeNode | null): FlatNode[] {
  if (!node) {
    return [];
  }
  const out: FlatNode[] = [];
  const walk = (entry: RuntimeRenderTreeNode) => {
    out.push({
      objectId: entry.objectId,
      type: entry.type,
      bounds: entry.bounds,
      meta: entry.meta
    });
    for (const child of entry.children ?? []) {
      walk(child);
    }
  };
  walk(node);
  return out;
}

export function DiagnosticsOverlay({
  visible,
  renderTree,
  hoveredObjectId,
  resolvedStylesByObjectId
}: DiagnosticsOverlayProps) {
  const nodes = useMemo(() => flattenNodes(renderTree), [renderTree]);
  const hovered = useMemo(
    () => nodes.find((entry) => entry.objectId === hoveredObjectId) ?? null,
    [hoveredObjectId, nodes]
  );
  const hoveredStyle = useMemo(
    () => (hoveredObjectId ? resolvedStylesByObjectId.get(hoveredObjectId) ?? null : null),
    [hoveredObjectId, resolvedStylesByObjectId]
  );

  if (!visible || !renderTree?.bounds) {
    return null;
  }

  return (
    <>
      <div
        className="fm-geometry-diagnostics-grid"
        style={{
          width: renderTree.bounds.width,
          height: renderTree.bounds.height
        }}
      />
      <aside className="fm-geometry-diagnostics-panel">
        <h3>Geometry Diagnostics</h3>
        <p>
          Nodes: <strong>{nodes.length}</strong>
        </p>
        <p>
          Canvas:{" "}
          <strong>
            {renderTree.bounds.width} × {renderTree.bounds.height}
          </strong>
        </p>
        {hovered ? (
          <div className="fm-geometry-diagnostics-hover">
            <h4>Hover</h4>
            <p>
              <code>{hovered.objectId}</code>
            </p>
            <p>Type: {hovered.type}</p>
            <p>
              Bounds:{" "}
              {hovered.bounds
                ? `${hovered.bounds.x}, ${hovered.bounds.y}, ${hovered.bounds.width}, ${hovered.bounds.height}`
                : "—"}
            </p>
            {hovered.meta ? <pre>{JSON.stringify(hovered.meta, null, 2)}</pre> : null}
            {hoveredStyle ? (
              <>
                <h4>Style Stack</h4>
                <p>
                  Theme: <strong>{hoveredStyle.debug.themeName || "Default"}</strong>
                </p>
                <p>
                  Style: <strong>{hoveredStyle.debug.styleName || "Default"}</strong>
                </p>
                <p>
                  Chain:{" "}
                  <code>
                    {hoveredStyle.debug.chain.length > 0
                      ? hoveredStyle.debug.chain.join(" -> ")
                      : "(default only)"}
                  </code>
                </p>
                {hoveredStyle.debug.warnings.length > 0 ? (
                  <p>
                    Warnings: <code>{hoveredStyle.debug.warnings.join(" | ")}</code>
                  </p>
                ) : null}
                <pre>{JSON.stringify(hoveredStyle.tokens, null, 2)}</pre>
                <pre>{JSON.stringify(hoveredStyle.debug.sources, null, 2)}</pre>
              </>
            ) : null}
          </div>
        ) : (
          <p>Hover any object to inspect bounds and anchors.</p>
        )}
      </aside>
    </>
  );
}

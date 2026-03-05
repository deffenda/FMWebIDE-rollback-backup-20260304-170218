import { createHash } from "node:crypto";

import type { LayoutComponent, LayoutDefinition } from "../../lib/layout-model.ts";
import type { RuntimeLayoutObjectMap } from "./types.ts";

function sanitizeToken(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._:-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function stableComponentFingerprint(layout: LayoutDefinition, component: LayoutComponent, index: number): string {
  return JSON.stringify({
    layoutId: layout.id,
    layoutName: layout.name,
    tableOccurrence: layout.defaultTableOccurrence,
    componentType: component.type,
    index,
    position: component.position,
    binding: component.binding ?? null,
    ddrObjectPath: component.props.ddrObjectPath ?? null,
    ddrArrangeOrder: component.props.ddrArrangeOrder ?? null,
    label: component.props.label ?? "",
    placeholder: component.props.placeholder ?? ""
  });
}

function preferredObjectId(layout: LayoutDefinition, component: LayoutComponent, index: number): string {
  const ddrPath = String(component.props.ddrObjectPath ?? "").trim();
  if (ddrPath) {
    const safePath = sanitizeToken(ddrPath);
    if (safePath) {
      return `obj:${sanitizeToken(layout.id) || "layout"}:${safePath}`;
    }
  }

  const existingComponentId = sanitizeToken(component.id);
  if (existingComponentId) {
    return `obj:${sanitizeToken(layout.id) || "layout"}:${existingComponentId}`;
  }

  const fingerprint = stableComponentFingerprint(layout, component, index);
  const hash = createHash("sha1").update(fingerprint).digest("hex").slice(0, 12);
  return `obj:${sanitizeToken(layout.id) || "layout"}:${hash}`;
}

export function buildDeterministicObjectMap(layout: LayoutDefinition): RuntimeLayoutObjectMap {
  const sorted = [...layout.components].sort((left, right) => {
    const leftOrder = Number.isFinite(left.props.ddrArrangeOrder)
      ? Number(left.props.ddrArrangeOrder)
      : Number.isFinite(left.position.z)
        ? Number(left.position.z)
        : Number.MAX_SAFE_INTEGER;
    const rightOrder = Number.isFinite(right.props.ddrArrangeOrder)
      ? Number(right.props.ddrArrangeOrder)
      : Number.isFinite(right.position.z)
        ? Number(right.position.z)
        : Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    if (left.position.y !== right.position.y) {
      return left.position.y - right.position.y;
    }
    if (left.position.x !== right.position.x) {
      return left.position.x - right.position.x;
    }
    return left.id.localeCompare(right.id);
  });

  const componentIdToObjectId: Record<string, string> = {};
  const objectIdToComponentId: Record<string, string> = {};
  const usedObjectIds = new Map<string, number>();

  for (let index = 0; index < sorted.length; index += 1) {
    const component = sorted[index];
    const base = preferredObjectId(layout, component, index);
    const seenCount = usedObjectIds.get(base) ?? 0;
    usedObjectIds.set(base, seenCount + 1);
    const objectId = seenCount === 0 ? base : `${base}#${seenCount + 1}`;
    componentIdToObjectId[component.id] = objectId;
    objectIdToComponentId[objectId] = component.id;
  }

  return {
    componentIdToObjectId,
    objectIdToComponentId
  };
}

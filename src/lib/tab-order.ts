import type { LayoutComponent, LayoutDefinition } from "./layout-model.ts";
import { sortComponentsByArrangeOrder } from "./layout-arrange.ts";

const TAB_ORDERABLE_TYPES = new Set<LayoutComponent["type"]>(["field", "button", "portal", "panel"]);

function normalizeId(value: unknown): string {
  return String(value ?? "").trim();
}

function componentHasLegacyTabOrder(component: LayoutComponent): boolean {
  return (
    typeof component.props.tabOrder === "number" && Number.isFinite(component.props.tabOrder) && component.props.tabOrder > 0
  );
}

function byReadingOrder(left: LayoutComponent, right: LayoutComponent): number {
  const rowTolerance = 6;
  const yDelta = left.position.y - right.position.y;
  if (Math.abs(yDelta) > rowTolerance) {
    return yDelta;
  }
  const xDelta = left.position.x - right.position.x;
  if (Math.abs(xDelta) > 0.5) {
    return xDelta;
  }
  return left.position.z - right.position.z;
}

export function isTabOrderableComponent(component: LayoutComponent): boolean {
  if (!TAB_ORDERABLE_TYPES.has(component.type)) {
    return false;
  }
  if (component.props.tabStopEnabled === false) {
    return false;
  }
  if (component.props.includeInTabOrder === false) {
    return false;
  }
  return true;
}

export function inferDefaultTabOrderIds(components: LayoutComponent[]): string[] {
  return [...components]
    .filter((component) => isTabOrderableComponent(component))
    .sort((left, right) => {
      const readingOrder = byReadingOrder(left, right);
      if (readingOrder !== 0) {
        return readingOrder;
      }
      return left.id.localeCompare(right.id);
    })
    .map((component) => component.id);
}

export function inferLegacyTabOrderIds(components: LayoutComponent[]): string[] {
  const focusable = components.filter((component) => isTabOrderableComponent(component));
  if (focusable.length === 0) {
    return [];
  }
  const arranged = sortComponentsByArrangeOrder(focusable);
  const arrangeIndexById = new Map(arranged.map((component, index) => [component.id, index]));
  const explicit = arranged
    .filter((component) => componentHasLegacyTabOrder(component))
    .sort((left, right) => {
      const leftOrder = Number(left.props.tabOrder ?? Number.POSITIVE_INFINITY);
      const rightOrder = Number(right.props.tabOrder ?? Number.POSITIVE_INFINITY);
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      return (arrangeIndexById.get(left.id) ?? 0) - (arrangeIndexById.get(right.id) ?? 0);
    })
    .map((component) => component.id);

  if (explicit.length > 0) {
    return explicit;
  }
  return inferDefaultTabOrderIds(components);
}

export function sanitizeTabOrderIds(
  requestedIds: ReadonlyArray<string>,
  components: LayoutComponent[]
): { ids: string[]; missing: string[] } {
  const validIds = new Set(components.filter((component) => isTabOrderableComponent(component)).map((component) => component.id));
  const deduped: string[] = [];
  const missing: string[] = [];
  const seen = new Set<string>();

  for (const rawId of requestedIds) {
    const id = normalizeId(rawId);
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    if (!validIds.has(id)) {
      missing.push(id);
      continue;
    }
    deduped.push(id);
  }

  return { ids: deduped, missing };
}

export function resolveLayoutTabOrderIds(layout: LayoutDefinition): string[] {
  const canonicalRequested = Array.isArray(layout.tabOrder) ? layout.tabOrder : [];
  const canonical = sanitizeTabOrderIds(canonicalRequested, layout.components).ids;
  if (canonical.length > 0) {
    return canonical;
  }

  const legacy = inferLegacyTabOrderIds(layout.components);
  if (legacy.length > 0) {
    return legacy;
  }

  return inferDefaultTabOrderIds(layout.components);
}

export function normalizeLayoutTabOrder(layout: LayoutDefinition): LayoutDefinition {
  const resolved = resolveLayoutTabOrderIds(layout);
  const nextTabOrder = resolved.length > 0 ? resolved : undefined;
  const layoutHasSameOrder =
    Array.isArray(layout.tabOrder) &&
    layout.tabOrder.length === resolved.length &&
    layout.tabOrder.every((entry, index) => entry === resolved[index]);
  const nextComponents = layout.components.map((component) => {
    if (!isTabOrderableComponent(component)) {
      if (component.props.tabOrder == null) {
        return component;
      }
      const nextProps = { ...component.props };
      delete nextProps.tabOrder;
      return {
        ...component,
        props: nextProps
      };
    }
    const nextOrder = resolved.indexOf(component.id);
    const canonicalOrder = nextOrder >= 0 ? nextOrder + 1 : undefined;
    if (component.props.tabOrder === canonicalOrder) {
      return component;
    }
    const nextProps = { ...component.props };
    if (canonicalOrder) {
      nextProps.tabOrder = canonicalOrder;
    } else {
      delete nextProps.tabOrder;
    }
    return {
      ...component,
      props: nextProps
    };
  });

  const componentChanged = nextComponents.some((component, index) => component !== layout.components[index]);
  if (!componentChanged && layoutHasSameOrder) {
    return layout;
  }

  const nextLayout: LayoutDefinition = {
    ...layout,
    components: nextComponents
  };
  if (nextTabOrder && nextTabOrder.length > 0) {
    nextLayout.tabOrder = nextTabOrder;
  } else {
    delete nextLayout.tabOrder;
  }
  return nextLayout;
}

export function resolveNextTabOrderId(
  orderedIds: ReadonlyArray<string>,
  currentId: string | null | undefined,
  direction: 1 | -1
): string | null {
  if (orderedIds.length === 0) {
    return null;
  }
  const currentToken = normalizeId(currentId);
  if (!currentToken) {
    return direction === -1 ? orderedIds[orderedIds.length - 1] ?? null : orderedIds[0] ?? null;
  }
  const currentIndex = orderedIds.indexOf(currentToken);
  if (currentIndex < 0) {
    return direction === -1 ? orderedIds[orderedIds.length - 1] ?? null : orderedIds[0] ?? null;
  }
  const nextIndex = (currentIndex + direction + orderedIds.length) % orderedIds.length;
  return orderedIds[nextIndex] ?? null;
}

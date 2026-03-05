import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { FMRecord, LayoutComponent, LayoutDefinition, LayoutPartDefinition } from "../../lib/layout-model.ts";
import { evaluateFMCalcBoolean } from "../../lib/fmcalc/index.ts";
import { normalizeStyleId } from "../../fm/styles/tokens.ts";
import { styleTokensFromComponentProps } from "../../fm/styles/resolveStyleStack.ts";
import type { RuntimeObjectBinding, RuntimePortalRow, RuntimeRenderTreeNode, RuntimeSession } from "./types.ts";
import {
  buildLayoutRenderTree,
  type AnchorOverrideByObjectId,
  type AnchorOverridesByLayoutId
} from "../../fm/layout/geometry/index.ts";

type LayoutPartFrame = {
  part: {
    id: string;
    type: string;
    label?: string;
    height: number;
  };
  topPx: number;
  heightPx: number;
};

function cleanToken(value: unknown): string {
  return String(value ?? "").trim();
}

function sanitizeObjectSegment(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._:-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function currentRecord(session: RuntimeSession): Record<string, unknown> {
  const candidate = session.records[session.currentRecordIndex];
  if (!candidate || typeof candidate !== "object") {
    return {};
  }
  return candidate;
}

function resolveFieldValue(record: Record<string, unknown>, component: LayoutComponent): unknown {
  const field = cleanToken(component.binding?.field);
  if (!field) {
    return "";
  }
  if (record[field] != null) {
    return record[field];
  }
  const loweredField = field.toLowerCase();
  const unqualified = loweredField.includes("::") ? loweredField.split("::").pop() ?? loweredField : loweredField;
  for (const [name, value] of Object.entries(record)) {
    const loweredName = name.trim().toLowerCase();
    if (loweredName === loweredField) {
      return value;
    }
    const loweredUnqualified = loweredName.includes("::") ? loweredName.split("::").pop() ?? loweredName : loweredName;
    if (loweredUnqualified === unqualified) {
      return value;
    }
  }
  return "";
}

function hideObjectWhen(component: LayoutComponent, record: Record<string, unknown>, layout: LayoutDefinition): boolean {
  const expression = cleanToken(component.props.hideObjectWhen);
  if (!expression) {
    return false;
  }
  const result = evaluateFMCalcBoolean(expression, {
    currentRecord: record,
    currentTableOccurrence: layout.defaultTableOccurrence
  });
  if (!result.ok) {
    return false;
  }
  return result.value;
}

let anchorOverrideCache: AnchorOverridesByLayoutId | null = null;
let anchorOverrideCachePath = "";

function defaultAnchorOverridePath(): string {
  return path.join(process.cwd(), "data", "anchorsOverride.json");
}

function loadAnchorOverrides(): AnchorOverridesByLayoutId {
  const targetPath = defaultAnchorOverridePath();
  if (anchorOverrideCache && anchorOverrideCachePath === targetPath) {
    return anchorOverrideCache;
  }
  anchorOverrideCachePath = targetPath;
  if (!existsSync(targetPath)) {
    anchorOverrideCache = {};
    return anchorOverrideCache;
  }
  try {
    const raw = readFileSync(targetPath, "utf8");
    const parsed = JSON.parse(raw) as AnchorOverridesByLayoutId;
    if (!parsed || typeof parsed !== "object") {
      anchorOverrideCache = {};
      return anchorOverrideCache;
    }
    anchorOverrideCache = parsed;
    return anchorOverrideCache;
  } catch {
    anchorOverrideCache = {};
    return anchorOverrideCache;
  }
}

function styleContextForComponent(component: LayoutComponent): Record<string, unknown> {
  const styleTheme = cleanToken(component.props.styleTheme);
  const styleName = cleanToken(component.props.styleName);
  const hasStyleMapping = styleTheme.length > 0 || styleName.length > 0;
  return {
    nodeType: component.type,
    themeName: styleTheme || "Default",
    themeId: styleTheme.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "default-theme",
    styleName: styleName || "Default",
    styleId: normalizeStyleId(component.props.styleName || "default"),
    hasStyleMapping,
    objectOverrides: styleTokensFromComponentProps(component.props)
  };
}

type RuntimeFieldKind = "text" | "number" | "date" | "time" | "multiline" | "container";

function looksLikeImageUrl(value: string): boolean {
  const token = value.trim().toLowerCase();
  if (!token) {
    return false;
  }
  if (!token.startsWith("http://") && !token.startsWith("https://") && !token.startsWith("data:image/")) {
    return false;
  }
  if (token.startsWith("data:image/")) {
    return true;
  }
  const clean = token.split("?")[0] ?? token;
  return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".tif", ".tiff"].some((suffix) =>
    clean.endsWith(suffix)
  );
}

function classifyFieldKind(component: LayoutComponent, resolvedValue: unknown): RuntimeFieldKind {
  const controlType = cleanToken(component.props.controlType).toLowerCase();
  const dataFormat = cleanToken(component.props.dataFormat).toLowerCase();
  if (component.props.containerFormat || dataFormat.includes("container")) {
    return "container";
  }
  if (typeof resolvedValue === "string" && looksLikeImageUrl(resolvedValue)) {
    return "container";
  }
  if (controlType === "date" || dataFormat.includes("date")) {
    return "date";
  }
  if (dataFormat.includes("time")) {
    return "time";
  }
  if (dataFormat.includes("number") || dataFormat.includes("numeric")) {
    return "number";
  }
  if (component.props.editShowVerticalScrollbar === true || component.position.height >= 44) {
    return "multiline";
  }
  return "text";
}

function fieldReadOnly(component: LayoutComponent): boolean {
  if (component.props.controlType === "concealed") {
    return false;
  }
  return component.props.entryBrowseMode === false || component.props.locked === true;
}

function resolvePortalRows(component: LayoutComponent, record: Record<string, unknown>): RuntimePortalRow[] {
  const tableOccurrence = cleanToken(component.binding?.tableOccurrence);
  const portalData = record.portalData;
  if (!portalData || typeof portalData !== "object" || Array.isArray(portalData)) {
    return [];
  }
  const sources = portalData as Record<string, unknown>;
  const directRows = Array.isArray(sources[tableOccurrence]) ? (sources[tableOccurrence] as unknown[]) : [];
  const fallbackRows = directRows.length > 0
    ? directRows
    : Object.values(sources).find((value) => Array.isArray(value)) ?? [];

  const rows: RuntimePortalRow[] = [];
  const rowValues = Array.isArray(fallbackRows) ? fallbackRows : [];
  for (let index = 0; index < rowValues.length; index += 1) {
    const entry = rowValues[index];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      continue;
    }
    const rowRecord = entry as Record<string, unknown>;
    const rowRecordId = cleanToken(rowRecord.recordId) || `row-${index + 1}`;
    rows.push({
      rowObjectId: `${component.id}:row:${sanitizeObjectSegment(rowRecordId)}`,
      rowRecordId,
      rowIndex: index,
      values: rowRecord
    });
  }

  return rows;
}

function resolvePortalRowFields(component: LayoutComponent, rows: RuntimePortalRow[]): string[] {
  if (Array.isArray(component.props.portalRowFields) && component.props.portalRowFields.length > 0) {
    return component.props.portalRowFields.map((field) => cleanToken(field)).filter((field) => field.length > 0);
  }
  const firstRow = rows[0]?.values ?? {};
  return Object.keys(firstRow)
    .filter((fieldName) => fieldName !== "recordId" && fieldName !== "modId")
    .slice(0, 8);
}

function portalRowValue(row: RuntimePortalRow, fieldName: string): unknown {
  if (row.values[fieldName] != null) {
    return row.values[fieldName];
  }
  const loweredField = fieldName.toLowerCase();
  const unqualified = loweredField.includes("::") ? loweredField.split("::").pop() ?? loweredField : loweredField;
  for (const [name, value] of Object.entries(row.values)) {
    const lowered = name.toLowerCase();
    if (lowered === loweredField) {
      return value;
    }
    const loweredUnqualified = lowered.includes("::") ? lowered.split("::").pop() ?? lowered : lowered;
    if (loweredUnqualified === unqualified) {
      return value;
    }
  }
  return "";
}

function registerBinding(session: RuntimeSession, binding: RuntimeObjectBinding): void {
  session.objectBindings.set(binding.objectId, binding);
}

function portalRowsForRender(session: RuntimeSession, component: LayoutComponent, rows: RuntimePortalRow[]): RuntimePortalRow[] {
  const objectId = session.objectMap.componentIdToObjectId[component.id] ?? component.id;
  const visibleRows = Math.max(1, Number(component.props.repetitionsTo) || 6);
  const offset = Math.max(0, session.portalOffsets.get(objectId) ?? 0);
  const overscan = 2;
  const start = Math.min(offset, Math.max(0, rows.length - 1));
  const end = Math.min(rows.length, start + visibleRows + overscan);
  const slice = rows.slice(start, end);
  const includePlaceholder = true;
  if (!includePlaceholder) {
    return slice;
  }
  return [
    ...slice,
    {
      rowObjectId: `${objectId}:row:new`,
      rowRecordId: "__new__",
      rowIndex: rows.length,
      values: {}
    }
  ];
}

function renderPortalNode(
  session: RuntimeSession,
  component: LayoutComponent,
  componentObjectId: string,
  bounds: { x: number; y: number; width: number; height: number },
  record: Record<string, unknown>
): RuntimeRenderTreeNode {
  const rows = resolvePortalRows(component, record);
  const tableOccurrence = cleanToken(component.binding?.tableOccurrence) || session.layout.defaultTableOccurrence;
  const rowFields = resolvePortalRowFields(component, rows);
  const rowsForRender = portalRowsForRender(session, component, rows);
  const alternateRows = component.props.portalUseAlternateRowState === true;
  const rowHeight = Math.max(26, Math.floor(bounds.height / Math.max(1, Number(component.props.repetitionsTo) || 6)));

  const rowNodes: RuntimeRenderTreeNode[] = rowsForRender.map((row, renderedIndex) => {
    const rowObjectId = `${componentObjectId}:row:${sanitizeObjectSegment(row.rowRecordId)}`;
    const rowChildren: RuntimeRenderTreeNode[] = rowFields.map((fieldName, columnIndex) => {
      const cellObjectId = `${rowObjectId}:field:${sanitizeObjectSegment(fieldName)}`;
      registerBinding(session, {
        kind: "portalField",
        objectId: cellObjectId,
        portalComponentId: component.id,
        rowRecordId: row.rowRecordId,
        rowIndex: row.rowIndex,
        fieldName,
        tableOccurrence
      });
      const value = row.rowRecordId === "__new__" ? "" : portalRowValue(row, fieldName);
      const portalFieldKind: RuntimeFieldKind =
        typeof value === "string" && looksLikeImageUrl(value) ? "container" : "text";
      return {
        nodeId: `${cellObjectId}:node`,
        objectId: cellObjectId,
        type: `field-${portalFieldKind}`,
        tag: "input",
        role: "textbox",
        ariaLabel: `${fieldName} row ${row.rowIndex + 1}`,
        value,
        disabled: portalFieldKind === "container",
        style: {
          flex: 1,
          minWidth: 60,
          border: "none",
          background: "transparent"
        },
        meta: {
          styleContext: {
            nodeType: "field",
            themeName: cleanToken(component.props.styleTheme) || "Default",
            styleName: cleanToken(component.props.styleName) || "Default",
            styleId: normalizeStyleId(component.props.styleName || "default"),
            hasStyleMapping:
              cleanToken(component.props.styleTheme).length > 0 ||
              cleanToken(component.props.styleName).length > 0
          },
          fieldBehavior: {
            kind: portalFieldKind,
            fieldName,
            recordId: row.rowRecordId,
            readOnly: portalFieldKind === "container",
            placeholder: portalFieldKind === "container" ? "Container" : ""
          }
        },
        eventBindings: ["focus", "blur", "input", "keydown"]
      };
    });

    return {
      nodeId: `${rowObjectId}:node`,
      objectId: rowObjectId,
      type: "portal-row",
      tag: "div",
      role: "row",
      style: {
        display: "flex",
        minHeight: rowHeight,
        alignItems: "stretch",
        borderBottom: "1px solid #d1d5db",
        background: alternateRows && renderedIndex % 2 === 1 ? "#f3f4f6" : "#ffffff"
      },
      meta: {
        styleContext: {
          nodeType: "portal-row",
          themeName: cleanToken(component.props.styleTheme) || "Default",
          styleName: cleanToken(component.props.styleName) || "Default",
          styleId: normalizeStyleId(component.props.styleName || "default"),
          hasStyleMapping:
            cleanToken(component.props.styleTheme).length > 0 ||
            cleanToken(component.props.styleName).length > 0
        }
      },
      children: rowChildren
    };
  });

  return {
    nodeId: `${componentObjectId}:node`,
    objectId: componentObjectId,
    type: "portal",
    tag: "div",
    role: "table",
    bounds,
    style: {
      position: "absolute",
      left: bounds.x,
      top: bounds.y,
      width: bounds.width,
      height: bounds.height,
      display: "flex",
      flexDirection: "column",
      overflow: "auto"
    },
    meta: {
      styleContext: styleContextForComponent(component)
    },
    eventBindings: ["portalScroll"],
    children: rowNodes
  };
}

export function buildRenderTree(session: RuntimeSession): RuntimeRenderTreeNode {
  session.objectBindings.clear();
  const layout = session.layout;
  const record = currentRecord(session);
  const geometryTree = buildLayoutRenderTree({
    layout,
    viewport: session.viewport,
    anchorOverrides: loadAnchorOverrides(),
    baselineCache: session.geometryBaselineCache
  });
  const geometryMeta = (geometryTree.meta ?? {}) as {
    partMetrics?: Array<{
      partId: string;
      partType: string;
      topPx: number;
      heightPx: number;
      contentRectPx: { x: number; y: number; w: number; h: number };
    }>;
    objectGeometries?: Array<{
      id: string;
      objectType: string;
      partId: string;
      rectPx: { x: number; y: number; w: number; h: number };
      zIndex: number;
      anchorSpec: Record<string, unknown>;
      baselineRectPx: Record<string, unknown>;
      baselineContainerRectPx: Record<string, unknown>;
      containerRectPx: Record<string, unknown>;
    }>;
  };

  const parts = Array.isArray(layout.parts) && layout.parts.length > 0
    ? layout.parts
    : [
        {
          id: "body",
          type: "body",
          label: "Body",
          height: layout.canvas.height
        } satisfies LayoutPartDefinition
      ];
  const partLookup = new Map(parts.map((part) => [part.id, part]));
  const partFramesFromGeometry: LayoutPartFrame[] = (geometryMeta.partMetrics ?? []).map((entry) => ({
    part: partLookup.get(entry.partId) ?? {
      id: entry.partId,
      type: entry.partType,
      label: entry.partType,
      height: entry.heightPx
    },
    topPx: entry.topPx,
    heightPx: entry.heightPx
  }));
  const partFrames: LayoutPartFrame[] =
    partFramesFromGeometry.length > 0
      ? partFramesFromGeometry
      : parts.reduce<LayoutPartFrame[]>((acc, part) => {
          const previousBottom = acc.length > 0 ? acc[acc.length - 1].topPx + acc[acc.length - 1].heightPx : 0;
          acc.push({
            part,
            topPx: previousBottom,
            heightPx: Math.max(20, Number(part.height) || 20)
          });
          return acc;
        }, []);
  const objectGeometryById = new Map(
    (geometryMeta.objectGeometries ?? []).map((entry) => [entry.id, entry])
  );

  const partChildren = new Map<string, RuntimeRenderTreeNode[]>();
  const sortedComponents = [...layout.components].sort((left, right) => {
    const leftGeometry = objectGeometryById.get(left.id);
    const rightGeometry = objectGeometryById.get(right.id);
    const leftOrder = Number.isFinite(leftGeometry?.zIndex)
      ? Number(leftGeometry?.zIndex)
      : Number.isFinite(left.props.ddrArrangeOrder)
        ? Number(left.props.ddrArrangeOrder)
        : Number(left.position.z);
    const rightOrder = Number.isFinite(rightGeometry?.zIndex)
      ? Number(rightGeometry?.zIndex)
      : Number.isFinite(right.props.ddrArrangeOrder)
        ? Number(right.props.ddrArrangeOrder)
        : Number(right.position.z);
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return left.id.localeCompare(right.id);
  });

  for (const component of sortedComponents) {
    const componentObjectId = session.objectMap.componentIdToObjectId[component.id] ?? component.id;
    const geometry = objectGeometryById.get(component.id);
    const frame = geometry
      ? {
          x: geometry.rectPx.x,
          y: geometry.rectPx.y,
          width: geometry.rectPx.w,
          height: geometry.rectPx.h
        }
      : {
          x: component.position.x,
          y: component.position.y,
          width: component.position.width,
          height: component.position.height
        };
    const hidden = hideObjectWhen(component, record, layout);
    const partFrame =
      partFrames.find((entry) => entry.part.id === geometry?.partId) ??
      partFrames.find((entry) => frame.y >= entry.topPx && frame.y < entry.topPx + entry.heightPx) ??
      partFrames[0];
    if (!partFrame) {
      continue;
    }
    const partNodeId = `part:${partFrame.part.id}`;
    const nodes = partChildren.get(partNodeId) ?? [];

    if (component.type === "field" && component.binding?.field) {
      registerBinding(session, {
        kind: "layoutField",
        objectId: componentObjectId,
        componentId: component.id,
        fieldName: component.binding.field,
        tableOccurrence: cleanToken(component.binding.tableOccurrence) || layout.defaultTableOccurrence
      });
    } else if (component.type === "button" && component.events?.onClick?.action) {
      registerBinding(session, {
        kind: "button",
        objectId: componentObjectId,
        componentId: component.id,
        action: component.events.onClick.action,
        script: component.events.onClick.script,
        parameter: component.events.onClick.parameter,
        layoutName: component.events.onClick.layoutName
      });
    }

    let node: RuntimeRenderTreeNode;
    if (component.type === "portal") {
      node = renderPortalNode(
        session,
        component,
        componentObjectId,
        {
          x: frame.x,
          y: frame.y - partFrame.topPx,
          width: frame.width,
          height: frame.height
        },
        record
      );
    } else {
      const text = component.props.label ?? "";
      const value = component.type === "field" ? resolveFieldValue(record, component) : undefined;
      const resolvedFieldKind = component.type === "field" ? classifyFieldKind(component, value) : null;
      const nodeType =
        component.type === "field"
          ? `field-${resolvedFieldKind}`
          : component.type === "label"
            ? "text"
            : component.type === "shape"
              ? "rectangle"
              : component.type === "image"
                ? "image"
                : String(component.type);
      const tag =
        component.type === "field"
          ? "input"
          : component.type === "button"
            ? "button"
            : component.type === "image"
              ? "img"
              : "div";
      const role = component.type === "field" ? "textbox" : component.type === "button" ? "button" : "group";
      const isReadOnlyField = component.type === "field" ? fieldReadOnly(component) || resolvedFieldKind === "container" : false;
      node = {
        nodeId: `${componentObjectId}:node`,
        objectId: componentObjectId,
        type: nodeType,
        tag,
        role,
        ariaLabel: component.props.tooltip ?? component.binding?.field ?? component.props.label ?? component.id,
        text,
        value,
        hidden,
        disabled: isReadOnlyField,
        bounds: {
          x: frame.x,
          y: frame.y - partFrame.topPx,
          width: frame.width,
          height: frame.height
        },
        style: {
          position: "absolute",
          left: frame.x,
          top: frame.y - partFrame.topPx,
          width: frame.width,
          height: frame.height,
          zIndex: geometry?.zIndex ?? component.position.z
        } as Record<string, unknown>,
        meta: {
          partId: partFrame.part.id,
          anchorSpec: geometry?.anchorSpec ?? null,
          baselineRectPx: geometry?.baselineRectPx ?? null,
          baselineContainerRectPx: geometry?.baselineContainerRectPx ?? null,
          containerRectPx: geometry?.containerRectPx ?? null,
          styleContext: styleContextForComponent(component),
          fieldBehavior:
            component.type === "field"
              ? {
                  kind: resolvedFieldKind,
                  fieldName: cleanToken(component.binding?.field),
                  recordId: cleanToken(record.recordId),
                  readOnly: isReadOnlyField,
                  placeholder: cleanToken(component.props.placeholder) || (resolvedFieldKind === "container" ? "Container" : "")
                }
              : undefined,
          imageSrc:
            component.type === "image"
              ? cleanToken(component.props.fillImageUrl) || cleanToken(component.props.webViewerUrlTemplate)
              : undefined
        },
        eventBindings:
          component.type === "field"
            ? ["focus", "blur", "input", "keydown"]
            : component.type === "button"
              ? ["click", "focus", "keydown"]
              : ["click"]
      };
    }
    nodes.push(node);
    partChildren.set(partNodeId, nodes);
  }

  const partNodes: RuntimeRenderTreeNode[] = partFrames.map((partFrame) => {
    const partNodeId = `part:${partFrame.part.id}`;
    const partHeight = Math.max(20, partFrame.heightPx);
    return {
      nodeId: `${partNodeId}:node`,
      objectId: partNodeId,
      type: "part",
      tag: "section",
      role: "region",
      ariaLabel: partFrame.part.label ?? partFrame.part.type,
      bounds: {
        x: 0,
        y: partFrame.topPx,
        width: geometryTree.rectPx.w,
        height: partHeight
      },
      style: {
        position: "relative",
        width: geometryTree.rectPx.w,
        height: partHeight,
        overflow: "hidden"
      },
      meta: {
        partId: partFrame.part.id,
        partType: partFrame.part.type,
        topPx: partFrame.topPx,
        heightPx: partHeight,
        styleContext: {
          nodeType: "part",
          themeName: "Default",
          styleName: "Default",
          styleId: "default",
          hasStyleMapping: true
        }
      },
      children: partChildren.get(partNodeId) ?? []
    };
  });

  return {
    nodeId: `layout:${layout.id}`,
    objectId: `layout:${layout.id}`,
    type: "layout-root",
    tag: "div",
    role: "application",
    ariaLabel: layout.name,
    bounds: {
      x: 0,
      y: 0,
      width: geometryTree.rectPx.w,
      height: geometryTree.rectPx.h
    },
    style: {
      position: "relative",
      width: geometryTree.rectPx.w,
      height: geometryTree.rectPx.h
    },
    meta: {
      viewport: session.viewport,
      geometrySummary: {
        partCount: partNodes.length,
        objectCount: layout.components.length
      },
      styleContext: {
        nodeType: "layout",
        themeName: "Default",
        styleName: "Default",
        styleId: "default",
        hasStyleMapping: true
      }
    },
    children: partNodes
  };
}

export function buildTabOrderObjectIds(session: RuntimeSession): string[] {
  const layout = session.layout;
  const byComponentId = session.objectMap.componentIdToObjectId;
  const tabOrderIds: string[] = [];
  const explicitIds = Array.isArray(layout.tabOrder) ? layout.tabOrder : [];
  for (const componentId of explicitIds) {
    const objectId = byComponentId[componentId];
    if (!objectId || tabOrderIds.includes(objectId)) {
      continue;
    }
    tabOrderIds.push(objectId);
  }

  const fallback = [...layout.components]
    .filter((component) => component.type === "field" || component.type === "button")
    .sort((left, right) => {
      const leftOrder = Number.isFinite(left.props.tabOrder)
        ? Number(left.props.tabOrder)
        : Number.isFinite(left.props.ddrArrangeOrder)
          ? Number(left.props.ddrArrangeOrder)
          : Number.MAX_SAFE_INTEGER;
      const rightOrder = Number.isFinite(right.props.tabOrder)
        ? Number(right.props.tabOrder)
        : Number.isFinite(right.props.ddrArrangeOrder)
          ? Number(right.props.ddrArrangeOrder)
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
    })
    .map((component) => byComponentId[component.id])
    .filter((token): token is string => Boolean(token));

  for (const objectId of fallback) {
    if (!tabOrderIds.includes(objectId)) {
      tabOrderIds.push(objectId);
    }
  }

  return tabOrderIds;
}

export function stringifyRecordId(record: Record<string, unknown>): string {
  return cleanToken(record.recordId ?? "");
}

export function asFMRecord(record: Record<string, unknown>): FMRecord {
  return record as FMRecord;
}

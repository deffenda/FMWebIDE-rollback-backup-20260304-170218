export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type LayoutViewport = {
  widthPx: number;
  heightPx: number;
  zoom: number;
};

export type AnchorSpec = {
  left: boolean;
  right: boolean;
  top: boolean;
  bottom: boolean;
};

export type PartMetrics = {
  partId: string;
  partType: string;
  topPx: number;
  heightPx: number;
  contentRectPx: Rect;
};

export type ObjectGeometry = {
  id: string;
  objectType: string;
  partId: string;
  rectPx: Rect;
  zIndex: number;
  anchorSpec: AnchorSpec;
  baselineRectPx: Rect;
  baselineContainerRectPx: Rect;
  containerRectPx: Rect;
};

export type RenderNode = {
  id: string;
  kind: "part" | "object";
  objectType?: string;
  rectPx: Rect;
  zIndex: number;
  partId?: string;
  meta?: Record<string, unknown>;
  children?: RenderNode[];
};

export type LayoutRenderTree = {
  id: string;
  kind: "layout";
  rectPx: Rect;
  children: RenderNode[];
  meta?: Record<string, unknown>;
};

export type AnchorOverrideByObjectId = Record<string, Partial<AnchorSpec>>;
export type AnchorOverridesByLayoutId = Record<string, AnchorOverrideByObjectId>;

export type GeometryBaselineEntry = {
  objectRectPx: Rect;
  containerRectPx: Rect;
};

export type GeometryBaselineCache = {
  byObjectKey: Map<string, GeometryBaselineEntry>;
};

export type InternalPartMetrics = PartMetrics & {
  index: number;
  topUnits: number;
  heightUnits: number;
  contentRectUnits: Rect;
  baselineTopUnits: number;
  baselineHeightUnits: number;
};

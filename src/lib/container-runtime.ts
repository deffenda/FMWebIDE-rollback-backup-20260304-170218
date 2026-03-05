export type ContainerOptimizeFor = "images" | "interactive";

export type ContainerRenderKind = "empty" | "image" | "pdf" | "interactive";

export type ContainerRenderModel = {
  kind: ContainerRenderKind;
  sourceUrl: string;
};

export function extractContainerSource(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (!value || typeof value !== "object") {
    return "";
  }
  const record = value as Record<string, unknown>;
  const candidates = [record.url, record.src, record.href, record.value];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return "";
}

function stripQueryAndHash(url: string): string {
  return url.split("#")[0]?.split("?")[0] ?? url;
}

function extensionFor(url: string): string {
  const base = stripQueryAndHash(url);
  const dotIndex = base.lastIndexOf(".");
  if (dotIndex < 0 || dotIndex === base.length - 1) {
    return "";
  }
  return base.slice(dotIndex + 1).trim().toLowerCase();
}

function isImageExtension(ext: string): boolean {
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tif", "tiff", "heic", "svg"].includes(ext);
}

function isPdfExtension(ext: string): boolean {
  return ext === "pdf";
}

function looksLikeInteractiveExtension(ext: string): boolean {
  return ["mp3", "mp4", "mov", "wav", "m4a", "json", "html", "htm"].includes(ext);
}

export function resolveContainerRenderModel(
  value: unknown,
  options?: {
    optimizeFor?: ContainerOptimizeFor;
  }
): ContainerRenderModel {
  const sourceUrl = extractContainerSource(value);
  if (!sourceUrl) {
    return {
      kind: "empty",
      sourceUrl: ""
    };
  }
  const optimizeFor = options?.optimizeFor ?? "images";
  const ext = extensionFor(sourceUrl);
  if (isPdfExtension(ext)) {
    return {
      kind: "pdf",
      sourceUrl
    };
  }
  if (optimizeFor === "interactive" && looksLikeInteractiveExtension(ext)) {
    return {
      kind: "interactive",
      sourceUrl
    };
  }
  if (isImageExtension(ext) || optimizeFor === "images") {
    return {
      kind: "image",
      sourceUrl
    };
  }
  return {
    kind: optimizeFor === "interactive" ? "interactive" : "image",
    sourceUrl
  };
}

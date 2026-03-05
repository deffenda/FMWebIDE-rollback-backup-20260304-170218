import type { FMPlugin, PluginManifest } from "./types.ts";

export function validatePluginManifest(manifest: unknown): {
  ok: boolean;
  errors: string[];
  value?: PluginManifest;
} {
  const errors: string[] = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return {
      ok: false,
      errors: ["Manifest must be a JSON object"]
    };
  }
  const candidate = manifest as Record<string, unknown>;
  const requiredStringFields: Array<keyof PluginManifest> = [
    "id",
    "name",
    "version",
    "compatibility"
  ];
  for (const field of requiredStringFields) {
    const token = String(candidate[field] ?? "").trim();
    if (!token) {
      errors.push(`Missing required manifest field "${field}"`);
    }
  }
  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }
  const value: PluginManifest = {
    id: String(candidate.id).trim(),
    name: String(candidate.name).trim(),
    version: String(candidate.version).trim(),
    compatibility: String(candidate.compatibility).trim(),
    description: String(candidate.description ?? "").trim() || undefined,
    entry: String(candidate.entry ?? "").trim() || undefined,
    author: String(candidate.author ?? "").trim() || undefined,
    homepage: String(candidate.homepage ?? "").trim() || undefined
  };
  return {
    ok: true,
    errors: [],
    value
  };
}

export function validatePluginDefinition(
  plugin: FMPlugin,
  manifest?: PluginManifest
): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const id = String(plugin.id ?? "").trim();
  if (!id) {
    errors.push("Plugin id is required");
  }
  if (typeof plugin.activate !== "function") {
    errors.push("Plugin activate() function is required");
  }
  if (!String(plugin.version ?? "").trim()) {
    errors.push("Plugin version is required");
  }
  if (!String(plugin.compatibility ?? "").trim()) {
    errors.push("Plugin compatibility is required");
  }
  if (manifest) {
    if (manifest.id !== id) {
      errors.push(`Manifest id "${manifest.id}" does not match plugin id "${id}"`);
    }
    if (manifest.version !== plugin.version) {
      errors.push(
        `Manifest version "${manifest.version}" does not match plugin version "${plugin.version}"`
      );
    }
    if (manifest.compatibility !== plugin.compatibility) {
      errors.push(
        `Manifest compatibility "${manifest.compatibility}" does not match plugin compatibility "${plugin.compatibility}"`
      );
    }
  }
  return {
    ok: errors.length === 0,
    errors
  };
}

import { PLUGIN_SDK_VERSION, type PluginCompatibilityResult } from "./types.ts";

function parseVersion(input: string): {
  major: number;
  minor: number;
  patch: number;
} | null {
  const token = input.trim();
  const match = token.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    return null;
  }
  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10)
  };
}

function compareVersions(
  left: {
    major: number;
    minor: number;
    patch: number;
  },
  right: {
    major: number;
    minor: number;
    patch: number;
  }
): number {
  if (left.major !== right.major) {
    return left.major - right.major;
  }
  if (left.minor !== right.minor) {
    return left.minor - right.minor;
  }
  return left.patch - right.patch;
}

function checkCaretRange(sdkVersion: string, rangeToken: string): PluginCompatibilityResult {
  const lower = parseVersion(rangeToken.slice(1));
  const target = parseVersion(sdkVersion);
  if (!lower || !target) {
    return {
      compatible: false,
      reason: `Invalid semantic version in compatibility token "${rangeToken}"`
    };
  }
  if (target.major !== lower.major) {
    return {
      compatible: false,
      reason: `SDK major ${target.major} does not satisfy ${rangeToken}`
    };
  }
  if (compareVersions(target, lower) < 0) {
    return {
      compatible: false,
      reason: `SDK version ${sdkVersion} is lower than required ${rangeToken}`
    };
  }
  return {
    compatible: true
  };
}

export function checkPluginCompatibility(
  compatibility: string,
  sdkVersion: string = PLUGIN_SDK_VERSION
): PluginCompatibilityResult {
  const token = compatibility.trim();
  if (!token || token === "*") {
    return {
      compatible: true
    };
  }

  if (token.startsWith("^")) {
    return checkCaretRange(sdkVersion, token);
  }

  const requested = parseVersion(token);
  const current = parseVersion(sdkVersion);
  if (!requested || !current) {
    return {
      compatible: false,
      reason: `Unsupported compatibility token "${compatibility}"`
    };
  }

  if (requested.major !== current.major) {
    return {
      compatible: false,
      reason: `Plugin requires major ${requested.major}, SDK is ${current.major}`
    };
  }

  if (compareVersions(current, requested) < 0) {
    return {
      compatible: false,
      reason: `SDK ${sdkVersion} is older than required ${compatibility}`
    };
  }

  return {
    compatible: true
  };
}

export { PLUGIN_SDK_VERSION };

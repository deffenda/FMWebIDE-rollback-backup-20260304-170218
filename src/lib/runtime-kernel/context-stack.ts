import type { RuntimeContextFrame } from "./types";

export type ContextStacksByWindow = Record<string, RuntimeContextFrame[]>;

function nextContextFrameId(): string {
  return `ctx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function pushContextFrame(
  stacks: ContextStacksByWindow,
  input: Omit<RuntimeContextFrame, "id" | "pushedAt"> & {
    id?: string;
    pushedAt?: number;
  }
): ContextStacksByWindow {
  const windowId = input.windowId.trim();
  if (!windowId) {
    return stacks;
  }

  const nextFrame: RuntimeContextFrame = {
    ...input,
    id: input.id?.trim() || nextContextFrameId(),
    pushedAt: Number(input.pushedAt ?? Date.now())
  };
  return {
    ...stacks,
    [windowId]: [...(stacks[windowId] ?? []), nextFrame]
  };
}

export function popContextFrame(stacks: ContextStacksByWindow, windowId: string): ContextStacksByWindow {
  const normalized = windowId.trim();
  const current = stacks[normalized] ?? [];
  if (!normalized || current.length === 0) {
    return stacks;
  }

  const nextWindowFrames = current.slice(0, -1);
  return {
    ...stacks,
    [normalized]: nextWindowFrames
  };
}

export function currentContextFrame(
  stacks: ContextStacksByWindow,
  windowId: string
): RuntimeContextFrame | undefined {
  const normalized = windowId.trim();
  if (!normalized) {
    return undefined;
  }
  const current = stacks[normalized] ?? [];
  return current[current.length - 1];
}

export function resolveFieldReference(
  fieldRef: string,
  stacks: ContextStacksByWindow,
  windowId: string,
  fallbackTableOccurrence?: string
): {
  tableOccurrence: string;
  fieldName: string;
} {
  const token = fieldRef.trim();
  if (!token) {
    return {
      tableOccurrence: fallbackTableOccurrence?.trim() || "",
      fieldName: ""
    };
  }

  if (token.includes("::")) {
    const [to, ...fieldParts] = token.split("::");
    return {
      tableOccurrence: to.trim(),
      fieldName: fieldParts.join("::").trim()
    };
  }

  const context = currentContextFrame(stacks, windowId);
  return {
    tableOccurrence: context?.tableOccurrence?.trim() || fallbackTableOccurrence?.trim() || "",
    fieldName: token
  };
}

export type ScriptWorkspaceStep = {
  id: string;
  name: string;
  text: string;
  enabled: boolean;
};

export type ScriptWorkspaceInsertMode = "append" | "before" | "after";

export type ScriptWorkspaceStepMutationResult = {
  steps: ScriptWorkspaceStep[];
  selectedIndex: number;
};

function clampIndex(index: number, length: number): number {
  if (length <= 0) {
    return -1;
  }
  if (!Number.isFinite(index)) {
    return -1;
  }
  if (index < 0) {
    return -1;
  }
  return Math.max(0, Math.min(length - 1, Math.round(index)));
}

export function insertScriptWorkspaceStep(
  steps: ScriptWorkspaceStep[],
  step: ScriptWorkspaceStep,
  selectedIndex: number,
  mode: ScriptWorkspaceInsertMode
): ScriptWorkspaceStepMutationResult {
  const normalizedStep: ScriptWorkspaceStep = {
    id: String(step.id ?? "").trim() || `step-${Date.now()}`,
    name: String(step.name ?? "").trim() || "Step",
    text: String(step.text ?? "").trim() || String(step.name ?? "").trim() || "Step",
    enabled: step.enabled !== false
  };
  const current = [...steps];
  const boundedSelected = clampIndex(selectedIndex, current.length);
  let insertAt = current.length;
  if (mode === "before" && boundedSelected >= 0) {
    insertAt = boundedSelected;
  } else if (mode === "after" && boundedSelected >= 0) {
    insertAt = boundedSelected + 1;
  }
  current.splice(insertAt, 0, normalizedStep);
  return {
    steps: current,
    selectedIndex: insertAt
  };
}

export function deleteScriptWorkspaceStep(
  steps: ScriptWorkspaceStep[],
  selectedIndex: number
): ScriptWorkspaceStepMutationResult {
  const boundedSelected = clampIndex(selectedIndex, steps.length);
  if (boundedSelected < 0) {
    return {
      steps: [...steps],
      selectedIndex: -1
    };
  }
  const current = [...steps];
  current.splice(boundedSelected, 1);
  if (current.length === 0) {
    return {
      steps: current,
      selectedIndex: -1
    };
  }
  return {
    steps: current,
    selectedIndex: Math.max(0, Math.min(current.length - 1, boundedSelected))
  };
}

export function moveScriptWorkspaceStep(
  steps: ScriptWorkspaceStep[],
  selectedIndex: number,
  delta: -1 | 1
): ScriptWorkspaceStepMutationResult {
  const boundedSelected = clampIndex(selectedIndex, steps.length);
  if (boundedSelected < 0) {
    return {
      steps: [...steps],
      selectedIndex: -1
    };
  }
  const nextIndex = boundedSelected + delta;
  if (nextIndex < 0 || nextIndex >= steps.length) {
    return {
      steps: [...steps],
      selectedIndex: boundedSelected
    };
  }
  const current = [...steps];
  const [item] = current.splice(boundedSelected, 1);
  current.splice(nextIndex, 0, item);
  return {
    steps: current,
    selectedIndex: nextIndex
  };
}

export function toggleScriptWorkspaceStepEnabled(
  steps: ScriptWorkspaceStep[],
  selectedIndex: number
): ScriptWorkspaceStepMutationResult {
  const boundedSelected = clampIndex(selectedIndex, steps.length);
  if (boundedSelected < 0) {
    return {
      steps: [...steps],
      selectedIndex: -1
    };
  }
  const current = steps.map((step, index) =>
    index === boundedSelected
      ? {
          ...step,
          enabled: !step.enabled
        }
      : step
  );
  return {
    steps: current,
    selectedIndex: boundedSelected
  };
}

export function updateScriptWorkspaceStepText(
  steps: ScriptWorkspaceStep[],
  selectedIndex: number,
  text: string
): ScriptWorkspaceStepMutationResult {
  const boundedSelected = clampIndex(selectedIndex, steps.length);
  if (boundedSelected < 0) {
    return {
      steps: [...steps],
      selectedIndex: -1
    };
  }
  const current = steps.map((step, index) =>
    index === boundedSelected
      ? {
          ...step,
          text
        }
      : step
  );
  return {
    steps: current,
    selectedIndex: boundedSelected
  };
}

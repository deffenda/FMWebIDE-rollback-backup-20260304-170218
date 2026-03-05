import type { ScriptDefinition, ScriptStep, ScriptStepType } from "./types";

export type ScriptWorkspaceStepPayload = {
  id: string;
  name: string;
  text: string;
  enabled: boolean;
};

export type ScriptWorkspaceScriptPayload = {
  id: string;
  name: string;
  steps: ScriptWorkspaceStepPayload[];
};

const SUPPORTED_STEP_TYPES = new Set<ScriptStepType>([
  "Begin Transaction",
  "Commit Transaction",
  "Revert Transaction",
  "Loop",
  "Exit Loop If",
  "End Loop",
  "Go to Layout",
  "Go to Related Record",
  "Go to Record/Request/Page",
  "Enter Browse Mode",
  "Enter Preview Mode",
  "Enter Find Mode",
  "Perform Find",
  "Replace Field Contents",
  "Omit Record",
  "Show Omitted Only",
  "Show All Records",
  "Show Custom Dialog",
  "Pause/Resume Script",
  "Set Field",
  "Set Field By Name",
  "Set Variable",
  "Set Variable By Name",
  "Commit Records/Requests",
  "Revert Record/Request",
  "New Record/Request",
  "Delete Record/Request",
  "Open Record/Request",
  "Refresh Window",
  "If",
  "Else If",
  "Else",
  "End If",
  "Exit Script",
  "Perform Script",
  "Perform Script On Server",
  "Set Error Capture",
  "Comment"
]);

function stripWrappers(value: string): string {
  return value.trim().replace(/^["']|["']$/g, "").trim();
}

function parseBracketSegments(text: string): string[] {
  const match = text.match(/\[([\s\S]*?)\]/);
  if (!match) {
    return [];
  }
  return match[1]
    .split(";")
    .map((entry) => stripWrappers(entry))
    .filter((entry) => entry.length > 0);
}

export function normalizeScriptStepType(name: string): ScriptStepType {
  const token = name.trim();
  if (SUPPORTED_STEP_TYPES.has(token as ScriptStepType)) {
    return token as ScriptStepType;
  }
  if (/^(plugin::|plugin:|x-)/i.test(token)) {
    return token as ScriptStepType;
  }
  if (token === "# (comment)") {
    return "Comment";
  }
  return "Comment";
}

export function mapScriptWorkspaceStep(step: ScriptWorkspaceStepPayload): ScriptStep {
  const type = normalizeScriptStepType(step.name);
  const segments = parseBracketSegments(step.text);
  const params: Record<string, unknown> = {};

  if (type === "Go to Layout" && segments[0]) {
    params.layoutName = segments[0];
  } else if (type === "Go to Related Record") {
    if (segments[0]) {
      params.tableOccurrence = segments[0];
    }
    if (segments[1]) {
      params.layoutName = segments[1];
    }
  } else if (type === "Go to Record/Request/Page" && segments[0]) {
    const modeToken = segments[0].toLowerCase();
    if (modeToken === "first" || modeToken === "prev" || modeToken === "next" || modeToken === "last") {
      params.mode = modeToken;
    } else {
      const maybeIndex = Number.parseInt(segments[0], 10);
      if (Number.isFinite(maybeIndex)) {
        params.index = maybeIndex;
      }
    }
  } else if ((type === "Set Variable" || type === "Set Variable By Name") && segments[0]) {
    params.name = segments[0];
    if (segments[1]) {
      params.value = segments[1];
    }
  } else if ((type === "Set Field" || type === "Set Field By Name" || type === "Replace Field Contents") && segments[0]) {
    params.fieldName = segments[0];
    if (segments[1]) {
      params.value = segments[1];
    }
  } else if ((type === "Perform Script" || type === "Perform Script On Server") && segments[0]) {
    params.scriptName = segments[0];
    if (segments[1]) {
      params.parameter = segments[1];
    }
  } else if (type === "Set Error Capture") {
    if (segments[0]) {
      const normalized = segments[0].toLowerCase();
      params.on = normalized === "on" || normalized === "true" || normalized === "1";
    }
  } else if (type === "Pause/Resume Script" && segments[0]) {
    const maybeMs = Number.parseInt(segments[0], 10);
    if (Number.isFinite(maybeMs)) {
      params.durationMs = maybeMs;
    }
  } else if ((type === "If" || type === "Else If" || type === "Exit Loop If" || type === "Exit Script") && segments[0]) {
    if (type === "If" || type === "Else If" || type === "Exit Loop If") {
      params.condition = segments[0];
    } else {
      params.result = segments[0];
    }
  } else if (type === "Show Custom Dialog") {
    if (segments[0]) {
      params.title = segments[0];
    }
    if (segments[1]) {
      params.message = segments[1];
    }
    if (segments[2]) {
      params.defaultInput = segments[2];
    }
  }

  return {
    id: step.id,
    type,
    enabled: step.enabled !== false,
    comment: step.text.trim() || undefined,
    params: Object.keys(params).length > 0 ? params : undefined
  };
}

export function mapScriptWorkspaceScriptsToDefinitions(
  scripts: ScriptWorkspaceScriptPayload[]
): Record<string, ScriptDefinition> {
  const definitions: Record<string, ScriptDefinition> = {};
  for (const script of scripts) {
    const name = script.name.trim();
    if (!name) {
      continue;
    }
    definitions[name] = {
      id: script.id,
      name,
      steps: script.steps.map((step) => mapScriptWorkspaceStep(step))
    };
  }
  return definitions;
}

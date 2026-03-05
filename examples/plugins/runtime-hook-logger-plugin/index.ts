import type { FMPlugin, PluginHookName } from "../../../src/plugins";

const HOOKS: PluginHookName[] = [
  "OnRecordLoad",
  "OnRecordCommit",
  "OnLayoutEnter",
  "OnScriptStart",
  "OnScriptEnd",
  "OnTransactionStart",
  "OnTransactionEnd"
];

export const runtimeHookLoggerPlugin: FMPlugin = {
  id: "plugin.example.runtime-hook-logger",
  version: "1.0.0",
  compatibility: "^1.0.0",
  activate(context) {
    for (const hookName of HOOKS) {
      context.registerTriggerHook(hookName, (event) => {
        context.logger.log("debug", `Hook fired: ${event.name}`, {
          timestamp: event.timestamp,
          payload: event.payload
        });
      });
    }
  }
};

export default runtimeHookLoggerPlugin;

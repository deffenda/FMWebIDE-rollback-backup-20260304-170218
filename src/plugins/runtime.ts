import { PluginManager } from "./manager.ts";

const GLOBAL_PLUGIN_MANAGER_KEY = "__FM_WEB_IDE_PLUGIN_MANAGER__";

type GlobalWithPluginManager = typeof globalThis & {
  [GLOBAL_PLUGIN_MANAGER_KEY]?: PluginManager;
};

function createManager(): PluginManager {
  return new PluginManager();
}

export function getRuntimePluginManager(): PluginManager {
  const target = globalThis as GlobalWithPluginManager;
  if (!target[GLOBAL_PLUGIN_MANAGER_KEY]) {
    target[GLOBAL_PLUGIN_MANAGER_KEY] = createManager();
  }
  return target[GLOBAL_PLUGIN_MANAGER_KEY]!;
}

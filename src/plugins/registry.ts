import type {
  PluginDataAdapterDefinition,
  PluginHookHandler,
  PluginHookName,
  PluginLayoutComponentDefinition,
  PluginMenuItemDefinition,
  PluginScriptStepDefinition
} from "./types";

type RegisteredEntry<T> = T & {
  pluginId: string;
  registeredAt: number;
};

function sortByPriority<T extends { priority?: number; registeredAt: number }>(entries: T[]): T[] {
  return [...entries].sort((left, right) => {
    const leftPriority = Number(left.priority ?? 0);
    const rightPriority = Number(right.priority ?? 0);
    if (leftPriority !== rightPriority) {
      return rightPriority - leftPriority;
    }
    return left.registeredAt - right.registeredAt;
  });
}

function removeRegisteredEntry<T extends { pluginId: string }>(
  source: T[],
  matcher: (entry: T) => boolean
): T[] {
  const remaining = source.filter((entry) => !matcher(entry));
  return remaining;
}

export class PluginRegistry {
  private scriptStepsByType = new Map<string, RegisteredEntry<PluginScriptStepDefinition>[]>();
  private layoutComponentsByType = new Map<string, RegisteredEntry<PluginLayoutComponentDefinition>[]>();
  private menuItemsByMenuId = new Map<string, RegisteredEntry<PluginMenuItemDefinition>[]>();
  private hooksByName = new Map<PluginHookName, RegisteredEntry<{ handler: PluginHookHandler }>[]>();
  private dataAdapters: Array<RegisteredEntry<PluginDataAdapterDefinition>> = [];
  private customErrorCodes = new Map<string, number>();

  registerScriptStep(pluginId: string, definition: PluginScriptStepDefinition): () => void {
    const stepType = String(definition.stepType ?? "").trim();
    if (!stepType) {
      throw new Error(`Plugin "${pluginId}" attempted to register an empty script step type`);
    }
    if (typeof definition.execute !== "function") {
      throw new Error(`Plugin "${pluginId}" script step "${stepType}" must provide an execute function`);
    }
    const entry: RegisteredEntry<PluginScriptStepDefinition> = {
      ...definition,
      stepType,
      pluginId,
      registeredAt: Date.now()
    };
    const existing = this.scriptStepsByType.get(stepType) ?? [];
    this.scriptStepsByType.set(stepType, sortByPriority([...existing, entry]));

    if (definition.errorCodes) {
      for (const [token, code] of Object.entries(definition.errorCodes)) {
        const key = `${pluginId}:${token.trim()}`;
        this.customErrorCodes.set(key, Number(code));
      }
    }

    return () => {
      const current = this.scriptStepsByType.get(stepType) ?? [];
      const remaining = removeRegisteredEntry(
        current,
        (candidate) => candidate.pluginId === pluginId && candidate.registeredAt === entry.registeredAt
      );
      if (remaining.length === 0) {
        this.scriptStepsByType.delete(stepType);
      } else {
        this.scriptStepsByType.set(stepType, remaining);
      }
      if (definition.errorCodes) {
        for (const token of Object.keys(definition.errorCodes)) {
          this.customErrorCodes.delete(`${pluginId}:${token.trim()}`);
        }
      }
    };
  }

  getScriptStepDefinitions(stepType: string): Array<RegisteredEntry<PluginScriptStepDefinition>> {
    const token = stepType.trim();
    if (!token) {
      return [];
    }
    return [...(this.scriptStepsByType.get(token) ?? [])];
  }

  registerLayoutComponent(pluginId: string, definition: PluginLayoutComponentDefinition): () => void {
    const type = String(definition.type ?? "").trim();
    if (!type) {
      throw new Error(`Plugin "${pluginId}" attempted to register an empty layout component type`);
    }
    if (typeof definition.runtimeRenderer !== "function" && typeof definition.previewRenderer !== "function") {
      throw new Error(
        `Plugin "${pluginId}" layout component "${type}" must define runtimeRenderer and/or previewRenderer`
      );
    }
    const entry: RegisteredEntry<PluginLayoutComponentDefinition> = {
      ...definition,
      type,
      pluginId,
      registeredAt: Date.now()
    };
    const existing = this.layoutComponentsByType.get(type) ?? [];
    this.layoutComponentsByType.set(type, sortByPriority([...existing, entry]));
    return () => {
      const current = this.layoutComponentsByType.get(type) ?? [];
      const remaining = removeRegisteredEntry(
        current,
        (candidate) => candidate.pluginId === pluginId && candidate.registeredAt === entry.registeredAt
      );
      if (remaining.length === 0) {
        this.layoutComponentsByType.delete(type);
      } else {
        this.layoutComponentsByType.set(type, remaining);
      }
    };
  }

  getLayoutComponentDefinitions(type: string): Array<RegisteredEntry<PluginLayoutComponentDefinition>> {
    const token = type.trim();
    if (!token) {
      return [];
    }
    return [...(this.layoutComponentsByType.get(token) ?? [])];
  }

  registerMenuItem(pluginId: string, definition: PluginMenuItemDefinition): () => void {
    const menuId = String(definition.menuId ?? "").trim();
    const id = String(definition.id ?? "").trim();
    if (!menuId || !id) {
      throw new Error(`Plugin "${pluginId}" menu item must include menuId and id`);
    }
    if (typeof definition.action !== "function") {
      throw new Error(`Plugin "${pluginId}" menu item "${id}" must define an action function`);
    }
    const entry: RegisteredEntry<PluginMenuItemDefinition> = {
      ...definition,
      id,
      menuId,
      pluginId,
      registeredAt: Date.now()
    };
    const existing = this.menuItemsByMenuId.get(menuId) ?? [];
    this.menuItemsByMenuId.set(menuId, sortByPriority([...existing, entry]));
    return () => {
      const current = this.menuItemsByMenuId.get(menuId) ?? [];
      const remaining = removeRegisteredEntry(
        current,
        (candidate) => candidate.pluginId === pluginId && candidate.registeredAt === entry.registeredAt
      );
      if (remaining.length === 0) {
        this.menuItemsByMenuId.delete(menuId);
      } else {
        this.menuItemsByMenuId.set(menuId, remaining);
      }
    };
  }

  getMenuItems(menuId: string): Array<RegisteredEntry<PluginMenuItemDefinition>> {
    const token = menuId.trim();
    if (!token) {
      return [];
    }
    return [...(this.menuItemsByMenuId.get(token) ?? [])];
  }

  registerTriggerHook(pluginId: string, name: PluginHookName, handler: PluginHookHandler): () => void {
    if (typeof handler !== "function") {
      throw new Error(`Plugin "${pluginId}" trigger hook "${name}" must be a function`);
    }
    const entry: RegisteredEntry<{ handler: PluginHookHandler }> = {
      pluginId,
      handler,
      registeredAt: Date.now()
    };
    const existing = this.hooksByName.get(name) ?? [];
    this.hooksByName.set(name, sortByPriority([...existing, entry]));
    return () => {
      const current = this.hooksByName.get(name) ?? [];
      const remaining = removeRegisteredEntry(
        current,
        (candidate) => candidate.pluginId === pluginId && candidate.registeredAt === entry.registeredAt
      );
      if (remaining.length === 0) {
        this.hooksByName.delete(name);
      } else {
        this.hooksByName.set(name, remaining);
      }
    };
  }

  getHookHandlers(name: PluginHookName): Array<RegisteredEntry<{ handler: PluginHookHandler }>> {
    return [...(this.hooksByName.get(name) ?? [])];
  }

  registerDataAdapter(pluginId: string, definition: PluginDataAdapterDefinition): () => void {
    const id = String(definition.id ?? "").trim();
    if (!id) {
      throw new Error(`Plugin "${pluginId}" data adapter must include an id`);
    }
    if (typeof definition.handle !== "function") {
      throw new Error(`Plugin "${pluginId}" data adapter "${id}" must define a handle function`);
    }
    const entry: RegisteredEntry<PluginDataAdapterDefinition> = {
      ...definition,
      id,
      pluginId,
      registeredAt: Date.now()
    };
    this.dataAdapters = sortByPriority([...this.dataAdapters, entry]);
    return () => {
      this.dataAdapters = removeRegisteredEntry(
        this.dataAdapters,
        (candidate) => candidate.pluginId === pluginId && candidate.registeredAt === entry.registeredAt
      );
    };
  }

  getDataAdapters(): Array<RegisteredEntry<PluginDataAdapterDefinition>> {
    return [...this.dataAdapters];
  }

  getCustomErrorCode(pluginId: string, code: string): number | undefined {
    const token = code.trim();
    if (!token) {
      return undefined;
    }
    return this.customErrorCodes.get(`${pluginId}:${token}`);
  }
}

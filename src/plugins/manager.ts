import { PluginRegistry } from "./registry.ts";
import { checkPluginCompatibility, PLUGIN_SDK_VERSION } from "./versioning.ts";
import type {
  FMPlugin,
  PluginDataAdapterRequest,
  PluginDataAdapterDefinition,
  PluginHookHandler,
  PluginHookEvent,
  PluginHookName,
  PluginContext,
  PluginLayoutComponentDefinition,
  PluginLayoutComponentRenderContext,
  PluginLogger,
  PluginMenuItemDefinition,
  PluginRuntimeKernelBridge,
  PluginRuntimeState,
  PluginScriptStepDefinition,
  PluginScriptStepExecutionContext,
  PluginScriptStepExecutionResult
} from "./types.ts";

type ManagedPlugin = {
  plugin: FMPlugin;
  state: PluginRuntimeState;
  disposers: Array<() => void>;
};

function defaultLogger(): PluginLogger {
  return {
    log(level, message, details) {
      const payload = details ? { ...details } : undefined;
      if (level === "error") {
        console.error(`[plugins] ${message}`, payload);
        return;
      }
      if (level === "warn") {
        console.warn(`[plugins] ${message}`, payload);
        return;
      }
      if (level === "debug") {
        console.debug(`[plugins] ${message}`, payload);
        return;
      }
      console.info(`[plugins] ${message}`, payload);
    }
  };
}

export class PluginManager {
  private readonly sdkVersion: string;
  private readonly registry: PluginRegistry;
  private readonly logger: PluginLogger;
  private readonly pluginsById = new Map<string, ManagedPlugin>();
  private runtimeKernelSnapshotProvider: PluginRuntimeKernelBridge["getSnapshot"] = () => undefined;

  constructor(input?: {
    sdkVersion?: string;
    logger?: PluginLogger;
    registry?: PluginRegistry;
  }) {
    this.sdkVersion = input?.sdkVersion?.trim() || PLUGIN_SDK_VERSION;
    this.registry = input?.registry ?? new PluginRegistry();
    this.logger = input?.logger ?? defaultLogger();
  }

  setRuntimeKernelSnapshotProvider(provider: PluginRuntimeKernelBridge["getSnapshot"]): void {
    this.runtimeKernelSnapshotProvider = provider;
  }

  registerPlugin(plugin: FMPlugin): void {
    const pluginId = String(plugin.id ?? "").trim();
    if (!pluginId) {
      throw new Error("Plugin id is required");
    }
    if (this.pluginsById.has(pluginId)) {
      throw new Error(`Plugin "${pluginId}" is already registered`);
    }
    const compatibility = checkPluginCompatibility(plugin.compatibility, this.sdkVersion);
    if (!compatibility.compatible) {
      throw new Error(
        `Plugin "${pluginId}" is incompatible with SDK ${this.sdkVersion}: ${compatibility.reason ?? "Unknown reason"}`
      );
    }
    const state: PluginRuntimeState = {
      id: pluginId,
      version: String(plugin.version ?? "").trim() || "0.0.0",
      compatibility: String(plugin.compatibility ?? "").trim() || "*",
      status: "registered"
    };
    this.pluginsById.set(pluginId, {
      plugin,
      state,
      disposers: []
    });
  }

  async activatePlugin(pluginId: string): Promise<void> {
    const token = pluginId.trim();
    const managed = this.pluginsById.get(token);
    if (!managed) {
      throw new Error(`Plugin "${pluginId}" is not registered`);
    }
    if (managed.state.status === "active") {
      return;
    }

    const registerDisposer = (disposer: () => void) => {
      managed.disposers.push(disposer);
    };

    const scopedLogger: PluginLogger = {
      log: (level, message, details) => {
        this.logger.log(level, `[${token}] ${message}`, details);
      }
    };

    const context: PluginContext = Object.freeze({
      runtimeKernel: Object.freeze({
        getSnapshot: () => this.runtimeKernelSnapshotProvider()
      }),
      registerScriptStep: (definition: PluginScriptStepDefinition) => {
        const disposer = this.registry.registerScriptStep(token, definition);
        registerDisposer(disposer);
        return disposer;
      },
      registerLayoutComponent: (definition: PluginLayoutComponentDefinition) => {
        const disposer = this.registry.registerLayoutComponent(token, definition);
        registerDisposer(disposer);
        return disposer;
      },
      registerMenuItem: (definition: PluginMenuItemDefinition) => {
        const disposer = this.registry.registerMenuItem(token, definition);
        registerDisposer(disposer);
        return disposer;
      },
      registerTriggerHook: (name: PluginHookName, handler: PluginHookHandler) => {
        const disposer = this.registry.registerTriggerHook(token, name, handler);
        registerDisposer(disposer);
        return disposer;
      },
      registerDataAdapter: (definition: PluginDataAdapterDefinition) => {
        const disposer = this.registry.registerDataAdapter(token, definition);
        registerDisposer(disposer);
        return disposer;
      },
      logger: scopedLogger
    });

    try {
      await managed.plugin.activate(context);
      managed.state = {
        ...managed.state,
        status: "active",
        activatedAt: Date.now(),
        lastError: undefined
      };
      this.logger.log("info", `Activated plugin "${token}"`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error ?? "Unknown plugin activation error");
      managed.state = {
        ...managed.state,
        status: "error",
        lastError: message
      };
      this.logger.log("error", `Failed to activate plugin "${token}"`, {
        error: message
      });
    }
  }

  async deactivatePlugin(pluginId: string): Promise<void> {
    const token = pluginId.trim();
    const managed = this.pluginsById.get(token);
    if (!managed) {
      return;
    }
    try {
      if (managed.plugin.deactivate) {
        await managed.plugin.deactivate();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error ?? "Unknown plugin deactivation error");
      this.logger.log("warn", `Plugin "${token}" deactivate hook threw`, {
        error: message
      });
    }

    while (managed.disposers.length > 0) {
      const disposer = managed.disposers.pop();
      try {
        disposer?.();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error ?? "Unknown plugin disposer error");
        this.logger.log("warn", `Plugin "${token}" disposer threw`, {
          error: message
        });
      }
    }

    managed.state = {
      ...managed.state,
      status: "inactive"
    };
  }

  async deactivateAll(): Promise<void> {
    for (const pluginId of this.pluginsById.keys()) {
      await this.deactivatePlugin(pluginId);
    }
  }

  getRuntimeState(): PluginRuntimeState[] {
    return [...this.pluginsById.values()].map((entry) => ({ ...entry.state }));
  }

  getRegistry(): PluginRegistry {
    return this.registry;
  }

  async emitHook(name: PluginHookName, payload: Record<string, unknown>): Promise<void> {
    const handlers = this.registry.getHookHandlers(name);
    if (handlers.length === 0) {
      return;
    }
    const event: PluginHookEvent = {
      name,
      timestamp: Date.now(),
      payload
    };
    for (const entry of handlers) {
      try {
        await entry.handler(event);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error ?? "Unknown hook error");
        this.logger.log("warn", `Plugin hook "${name}" failed`, {
          pluginId: entry.pluginId,
          error: message
        });
      }
    }
  }

  async executeScriptStep(
    context: Omit<PluginScriptStepExecutionContext, "logger">
  ): Promise<PluginScriptStepExecutionResult> {
    const definitions = this.registry.getScriptStepDefinitions(context.step.type);
    if (definitions.length === 0) {
      return {
        handled: false
      };
    }
    for (const entry of definitions) {
      const logger: PluginLogger = {
        log: (level, message, details) => {
          this.logger.log(level, `[${entry.pluginId}] ${message}`, details);
        }
      };
      try {
        if (entry.validate) {
          const validation = await entry.validate({
            ...context,
            logger
          });
          if (!validation.ok) {
            return {
              handled: true,
              ok: false,
              lastError: Number(validation.lastError ?? this.registry.getCustomErrorCode(entry.pluginId, "VALIDATION_FAILED") ?? 17001),
              lastMessage: validation.message || "Plugin script-step validation failed"
            };
          }
        }
        const result = await entry.execute({
          ...context,
          logger
        });
        if (result.handled) {
          return result;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error ?? "Unknown plugin script-step error");
        this.logger.log("error", `Plugin script step failed`, {
          pluginId: entry.pluginId,
          stepType: context.step.type,
          error: message
        });
        return {
          handled: true,
          ok: false,
          lastError: this.registry.getCustomErrorCode(entry.pluginId, "EXECUTION_FAILED") ?? 17000,
          lastMessage: message
        };
      }
    }
    return {
      handled: false
    };
  }

  renderLayoutComponent(context: PluginLayoutComponentRenderContext): {
    handled: boolean;
    node?: unknown;
    pluginId?: string;
  } {
    const definitions = this.registry.getLayoutComponentDefinitions(context.component.type);
    if (definitions.length === 0) {
      return {
        handled: false
      };
    }
    for (const entry of definitions) {
      try {
        const renderer =
          context.mode === "preview"
            ? entry.previewRenderer ?? entry.runtimeRenderer
            : entry.runtimeRenderer ?? entry.previewRenderer;
        if (!renderer) {
          continue;
        }
        const node = renderer(context);
        if (node != null) {
          return {
            handled: true,
            node,
            pluginId: entry.pluginId
          };
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error ?? "Unknown layout renderer error");
        this.logger.log("warn", `Plugin layout component render failed`, {
          pluginId: entry.pluginId,
          componentType: context.component.type,
          error: message
        });
      }
    }
    return {
      handled: false
    };
  }

  getMenuItems(menuId: string): Array<{
    pluginId: string;
    id: string;
    menuId: string;
    label: string;
    order?: number;
    action: (context: {
      workspaceId?: string;
      layoutId?: string;
      recordId?: string;
      logger: PluginLogger;
    }) => void | Promise<void>;
  }> {
    return this.registry.getMenuItems(menuId);
  }

  async runDataAdapterPipeline<TResult>(
    request: PluginDataAdapterRequest,
    fallback: () => Promise<TResult>
  ): Promise<TResult> {
    const adapters = this.registry.getDataAdapters();
    const runAt = async (index: number): Promise<TResult> => {
      if (index >= adapters.length) {
        return fallback();
      }
      const adapter = adapters[index];
      if (adapter.supports && !adapter.supports(request)) {
        return runAt(index + 1);
      }
      const logger: PluginLogger = {
        log: (level, message, details) => {
          this.logger.log(level, `[${adapter.pluginId}] ${message}`, details);
        }
      };
      try {
        return await adapter.handle<TResult>({
          request,
          next: () => runAt(index + 1),
          logger
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error ?? "Unknown data adapter error");
        this.logger.log("warn", "Plugin data adapter failed; continuing", {
          pluginId: adapter.pluginId,
          adapterId: adapter.id,
          operation: request.operation,
          error: message
        });
        return runAt(index + 1);
      }
    };
    return runAt(0);
  }
}

import assert from "node:assert/strict";
import test from "node:test";
import { createRuntimeKernel } from "../lib/runtime-kernel/kernel.ts";
import type { LayoutComponent, LayoutDefinition } from "../lib/layout-model.ts";
import type { FMPlugin } from "./types.ts";
import { PluginManager } from "./manager.ts";

function baseLayout(): LayoutDefinition {
  return {
    id: "layout-assets",
    name: "Assets",
    defaultTableOccurrence: "Assets",
    canvas: {
      width: 1024,
      height: 768,
      gridSize: 8
    },
    components: [],
    actions: []
  };
}

function baseComponent(type: string): LayoutComponent {
  return {
    id: "component-1",
    type,
    position: {
      x: 10,
      y: 10,
      width: 200,
      height: 60,
      z: 1
    },
    props: {}
  };
}

test("plugin manager rejects incompatible plugin versions", () => {
  const manager = new PluginManager();
  const incompatible: FMPlugin = {
    id: "plugin.incompatible",
    version: "1.0.0",
    compatibility: "^99.0.0",
    activate() {}
  };
  assert.throws(() => manager.registerPlugin(incompatible), /incompatible/i);
});

test("script step plugins execute through runtime kernel", async () => {
  const manager = new PluginManager();
  const plugin: FMPlugin = {
    id: "plugin.script.increment",
    version: "1.0.0",
    compatibility: "^1.0.0",
    activate(context) {
      context.registerScriptStep({
        stepType: "Plugin::Increment Counter",
        execute(input) {
          const current = Number(input.getVariable("$$PLUGIN_COUNTER") ?? 0);
          input.setVariable("$$PLUGIN_COUNTER", current + 1);
          return {
            handled: true,
            ok: true,
            lastError: 0
          };
        }
      });
    }
  };
  manager.registerPlugin(plugin);
  await manager.activatePlugin(plugin.id);

  const kernel = createRuntimeKernel({
    workspaceId: "assets",
    initialLayoutName: "Assets",
    initialTableOccurrence: "Assets",
    pluginManager: manager,
    scriptsByName: {
      "Plugin Script": {
        id: "script-plugin",
        name: "Plugin Script",
        steps: [
          {
            id: "step-plugin",
            type: "Plugin::Increment Counter"
          },
          {
            id: "step-exit",
            type: "Exit Script",
            params: {
              result: "$$PLUGIN_COUNTER"
            }
          }
        ]
      }
    }
  });

  const run = await kernel.runScript({
    scriptName: "Plugin Script"
  });

  assert.equal(run.status, "completed");
  assert.equal(run.result?.ok, true);
  assert.equal(kernel.getVariable("$$PLUGIN_COUNTER"), 1);
  assert.equal(run.result?.returnValue, 1);
});

test("layout component plugins provide runtime render output", async () => {
  const manager = new PluginManager();
  const plugin: FMPlugin = {
    id: "plugin.layout.simple",
    version: "1.0.0",
    compatibility: "^1.0.0",
    activate(context) {
      context.registerLayoutComponent({
        type: "plugin.simple",
        runtimeRenderer() {
          return "PLUGIN_RENDERED";
        }
      });
    }
  };
  manager.registerPlugin(plugin);
  await manager.activatePlugin(plugin.id);

  const rendered = manager.renderLayoutComponent({
    component: baseComponent("plugin.simple"),
    layout: baseLayout(),
    mode: "browse"
  });

  assert.equal(rendered.handled, true);
  assert.equal(rendered.node, "PLUGIN_RENDERED");
});

test("runtime hooks are emitted through kernel lifecycle", async () => {
  const manager = new PluginManager();
  const events: string[] = [];
  const plugin: FMPlugin = {
    id: "plugin.hook.collector",
    version: "1.0.0",
    compatibility: "^1.0.0",
    activate(context) {
      context.registerTriggerHook("OnLayoutEnter", (event) => {
        events.push(event.name);
      });
      context.registerTriggerHook("OnScriptEnd", (event) => {
        events.push(event.name);
      });
    }
  };
  manager.registerPlugin(plugin);
  await manager.activatePlugin(plugin.id);

  const kernel = createRuntimeKernel({
    workspaceId: "assets",
    initialLayoutName: "Assets",
    initialTableOccurrence: "Assets",
    pluginManager: manager,
    scriptsByName: {
      "Noop Script": {
        id: "script-noop",
        name: "Noop Script",
        steps: [
          {
            id: "step-comment",
            type: "Comment",
            params: {}
          }
        ]
      }
    }
  });

  kernel.navigateLayout("Assets Detail");
  await kernel.runScript({
    scriptName: "Noop Script"
  });

  assert.equal(events.includes("OnLayoutEnter"), true);
  assert.equal(events.includes("OnScriptEnd"), true);
});

test("plugin errors are isolated in layout rendering path", async () => {
  const manager = new PluginManager();
  const plugin: FMPlugin = {
    id: "plugin.layout.crashy",
    version: "1.0.0",
    compatibility: "^1.0.0",
    activate(context) {
      context.registerLayoutComponent({
        type: "plugin.crashy",
        runtimeRenderer() {
          throw new Error("boom");
        }
      });
      context.registerLayoutComponent({
        type: "plugin.crashy",
        priority: -1,
        runtimeRenderer() {
          return "fallback";
        }
      });
    }
  };
  manager.registerPlugin(plugin);
  await manager.activatePlugin(plugin.id);

  const rendered = manager.renderLayoutComponent({
    component: baseComponent("plugin.crashy"),
    layout: baseLayout(),
    mode: "browse"
  });
  assert.equal(rendered.handled, true);
  assert.equal(rendered.node, "fallback");
});

test("data adapter pipeline can intercept operations", async () => {
  const manager = new PluginManager();
  const plugin: FMPlugin = {
    id: "plugin.adapter.intercept",
    version: "1.0.0",
    compatibility: "^1.0.0",
    activate(context) {
      context.registerDataAdapter({
        id: "virtual-read",
        supports(request) {
          return request.operation === "read" && request.tableOccurrence === "VirtualTasks";
        },
        async handle() {
          return [{ recordId: "1", Name: "Synthetic Task" }];
        }
      });
    }
  };
  manager.registerPlugin(plugin);
  await manager.activatePlugin(plugin.id);

  const intercepted = await manager.runDataAdapterPipeline<Array<{ recordId: string; Name: string }>>(
    {
      operation: "read",
      tableOccurrence: "VirtualTasks",
      workspaceId: "demo"
    },
    async () => {
      return [{ recordId: "fallback", Name: "Fallback Task" }];
    }
  );
  assert.equal(intercepted[0].recordId, "1");

  const passthrough = await manager.runDataAdapterPipeline<Array<{ recordId: string; Name: string }>>(
    {
      operation: "read",
      tableOccurrence: "Assets",
      workspaceId: "demo"
    },
    async () => {
      return [{ recordId: "fallback", Name: "Fallback Task" }];
    }
  );
  assert.equal(passthrough[0].recordId, "fallback");
});

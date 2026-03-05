# Plugin API Reference

## `PluginManager`

File:

- `/Users/deffenda/Code/FMWebIDE/src/plugins/manager.ts`

Key methods:

- `registerPlugin(plugin: FMPlugin): void`
- `activatePlugin(pluginId: string): Promise<void>`
- `deactivatePlugin(pluginId: string): Promise<void>`
- `deactivateAll(): Promise<void>`
- `getRuntimeState(): PluginRuntimeState[]`
- `emitHook(name, payload): Promise<void>`
- `executeScriptStep(context): Promise<PluginScriptStepExecutionResult>`
- `renderLayoutComponent(context): { handled: boolean; node?: unknown; pluginId?: string }`
- `runDataAdapterPipeline(request, fallback): Promise<TResult>`
- `setRuntimeKernelSnapshotProvider(provider): void`

## `PluginContext`

File:

- `/Users/deffenda/Code/FMWebIDE/src/plugins/types.ts`

Properties:

- `runtimeKernel.getSnapshot()`
- `registerScriptStep(definition)`
- `registerLayoutComponent(definition)`
- `registerMenuItem(definition)`
- `registerTriggerHook(name, handler)`
- `registerDataAdapter(definition)`
- `logger.log(level, message, details?)`

## Script-step extension contracts

- `PluginScriptStepDefinition`
- `PluginScriptStepExecutionContext`
- `PluginScriptStepExecutionResult`

Source:

- `/Users/deffenda/Code/FMWebIDE/src/plugins/types.ts`

## Layout extension contracts

- `PluginLayoutComponentDefinition`
- `PluginLayoutComponentRenderContext`

Source:

- `/Users/deffenda/Code/FMWebIDE/src/plugins/types.ts`

## Data adapter contracts

- `PluginDataAdapterDefinition`
- `PluginDataAdapterRequest`
- `PluginDataAdapterHandleContext`

Source:

- `/Users/deffenda/Code/FMWebIDE/src/plugins/types.ts`

## Hook names

- `OnRecordLoad`
- `OnRecordCommit`
- `OnLayoutEnter`
- `OnScriptStart`
- `OnScriptEnd`
- `OnTransactionStart`
- `OnTransactionEnd`

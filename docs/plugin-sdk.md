# Plugin SDK

Phase 10 introduces a versioned plugin SDK for FM Web IDE runtime extensibility.

Core entry points:

- Plugin manager:
  - `/Users/deffenda/Code/FMWebIDE/src/plugins/manager.ts`
- Registry:
  - `/Users/deffenda/Code/FMWebIDE/src/plugins/registry.ts`
- Types/interfaces:
  - `/Users/deffenda/Code/FMWebIDE/src/plugins/types.ts`
- Runtime singleton:
  - `/Users/deffenda/Code/FMWebIDE/src/plugins/runtime.ts`
- Manifest/versioning:
  - `/Users/deffenda/Code/FMWebIDE/src/plugins/manifest.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/plugins/versioning.ts`

Plugin contract:

```ts
interface FMPlugin {
  id: string;
  version: string;
  compatibility: string;
  activate(context: PluginContext): void | Promise<void>;
  deactivate?(): void | Promise<void>;
}
```

Plugin context supports:

- `registerScriptStep(...)`
- `registerLayoutComponent(...)`
- `registerMenuItem(...)`
- `registerTriggerHook(...)`
- `registerDataAdapter(...)`
- `runtimeKernel.getSnapshot()`
- `logger`

Runtime integration:

- Script engine custom steps are executed through plugin manager:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/script-engine.ts`
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/kernel.ts`
- Runtime hooks emitted from kernel lifecycle:
  - `OnRecordLoad`, `OnRecordCommit`, `OnLayoutEnter`, `OnScriptStart`, `OnScriptEnd`, `OnTransactionStart`, `OnTransactionEnd`
- Browse renderer supports plugin layout components:
  - `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`
- Server data client supports adapter interception pipeline:
  - `/Users/deffenda/Code/FMWebIDE/src/server/filemaker-client.ts`

## Quick start

1. Build a plugin object implementing `FMPlugin`.
2. Register and activate it through `PluginManager`.
3. Use extension registration calls in `activate`.
4. Optional: ship `manifest.json` and validate before load.

For generated scaffold:

- `node /Users/deffenda/Code/FMWebIDE/scripts/fmweb-plugin.mjs init my-plugin`

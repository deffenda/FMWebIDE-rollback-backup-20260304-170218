# Example Plugins

This folder includes three Phase 10 example plugins:

1. `custom-script-step-plugin/`
   - Registers `Plugin::Send Slack Message` script step.
2. `custom-layout-object-plugin/`
   - Registers `plugin.simpleChart` layout object renderer.
3. `runtime-hook-logger-plugin/`
   - Subscribes to runtime hooks and logs lifecycle events.

Each plugin includes a `manifest.json` and `index.ts` entry point.

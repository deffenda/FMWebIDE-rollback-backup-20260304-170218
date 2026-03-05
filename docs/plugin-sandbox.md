# Plugin Sandbox Model

Phase 10 sandbox strategy is capability-based and error-isolated.

Implemented controls:

1. Controlled API exposure
   - Plugins receive only `PluginContext` capabilities.
   - Context object is frozen on activation.
2. No direct secret exposure
   - No FileMaker credentials/tokens are provided in plugin context.
3. Error isolation
   - Plugin callback failures are caught and logged.
   - Runtime/script execution continues where feasible.
4. Compatibility gate
   - Incompatible plugins are rejected during registration.

Current limitation:

- Plugins execute in-process and are not VM-isolated yet.
- DOM mutation cannot be fully prevented if plugin intentionally imports browser globals.

Planned hardening (future phase):

- worker/iframe or VM boundary for untrusted plugins
- signature verification policy enforcement
- per-plugin resource quotas

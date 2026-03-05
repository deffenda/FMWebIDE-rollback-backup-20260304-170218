# Plugin Versioning

SDK version constant:

- `/Users/deffenda/Code/FMWebIDE/src/plugins/types.ts` (`PLUGIN_SDK_VERSION`)

Compatibility checks:

- `/Users/deffenda/Code/FMWebIDE/src/plugins/versioning.ts`

Supported compatibility tokens:

- `*` (any SDK version)
- exact semver (`1.0.0`)
- caret major range (`^1.0.0`)

Rules:

1. Plugin `compatibility` must be present.
2. Plugin is rejected during `registerPlugin` when compatibility fails.
3. Default SDK baseline in Phase 10 is `1.0.0`.

Recommendation:

- Use `compatibility: "^1.0.0"` for current plugin builds.
- Bump plugin version independently from compatibility when only plugin internals change.

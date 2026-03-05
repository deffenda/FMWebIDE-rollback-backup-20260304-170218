# Plugin Script Steps

Script-step extensions allow plugins to add new executable step types to FM Script-lite runtime.

Key runtime integration:

- Script engine fallback path for custom steps:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/script-engine.ts`
- Kernel bridge into plugin manager:
  - `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/kernel.ts`

Registration:

```ts
context.registerScriptStep({
  stepType: "Plugin::My Step",
  validate(input) {
    return { ok: true };
  },
  async execute(input) {
    return { handled: true, ok: true, lastError: 0 };
  },
  errorCodes: { EXECUTION_FAILED: 17000 }
});
```

Execution behavior:

1. Built-in step handling runs first.
2. Unknown step types are offered to plugin executors.
3. If plugin returns `{ handled: true }`, engine uses plugin result.
4. If plugin throws, error is isolated and converted to deterministic script error.

`Set Error Capture` behavior still applies to plugin-step failures.

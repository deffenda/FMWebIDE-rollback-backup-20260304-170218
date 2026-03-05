# Plugin Runtime Hooks

Plugins can subscribe to runtime lifecycle hooks:

- `OnRecordLoad`
- `OnRecordCommit`
- `OnLayoutEnter`
- `OnScriptStart`
- `OnScriptEnd`
- `OnTransactionStart`
- `OnTransactionEnd`

Registration:

```ts
context.registerTriggerHook("OnLayoutEnter", async (event) => {
  context.logger.log("info", "Layout entered", event.payload);
});
```

Kernel emission points:

- `/Users/deffenda/Code/FMWebIDE/src/lib/runtime-kernel/kernel.ts`

Hook characteristics:

- async-safe (`Promise` handlers supported)
- isolated failures (one plugin cannot crash runtime hook dispatch)
- receives structured payloads with event timestamp

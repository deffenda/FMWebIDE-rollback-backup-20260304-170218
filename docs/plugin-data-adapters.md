# Plugin Data Adapters

Data adapter plugins can intercept read/find/create/write/delete operations and provide virtual data behavior.

Core pipeline:

- `/Users/deffenda/Code/FMWebIDE/src/plugins/manager.ts` (`runDataAdapterPipeline`)
- `/Users/deffenda/Code/FMWebIDE/src/server/filemaker-client.ts` (integration for key CRUD/read/find operations)

Adapter contract:

```ts
context.registerDataAdapter({
  id: "virtual-tasks",
  supports(request) {
    return request.operation === "read" && request.tableOccurrence === "VirtualTasks";
  },
  async handle({ request, next, logger }) {
    return [{ recordId: "1", Name: "Synthetic Task" }];
  }
});
```

Behavior:

1. Adapters run by priority order.
2. Adapter can return a handled result or call `next()` to continue chain.
3. Failures are isolated; pipeline continues to next adapter/fallback.

This supports:

- virtual tables
- external source bridging
- operation instrumentation

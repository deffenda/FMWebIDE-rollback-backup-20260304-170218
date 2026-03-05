# Plugin Layout Objects

Plugins can register custom layout object/component types with runtime and preview renderers.

Registry and contracts:

- `/Users/deffenda/Code/FMWebIDE/src/plugins/registry.ts`
- `/Users/deffenda/Code/FMWebIDE/src/plugins/types.ts`

Browse runtime integration:

- `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`

Example:

```ts
context.registerLayoutComponent({
  type: "plugin.simpleChart",
  runtimeRenderer(ctx) {
    return "Chart node";
  },
  previewRenderer(ctx) {
    return "Preview chart node";
  }
});
```

Rendering flow:

1. Core runtime asks plugin manager for component type renderer.
2. Renderer is selected by mode (`browse` vs `preview`).
3. Plugin render errors are isolated and logged; runtime continues.

Notes:

- Existing built-in component types remain supported.
- Custom types are additive and can be imported from DDR/layout JSON metadata.

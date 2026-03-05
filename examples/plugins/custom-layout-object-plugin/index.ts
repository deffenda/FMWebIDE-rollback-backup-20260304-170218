import { createElement } from "react";
import type { FMPlugin } from "../../../src/plugins";

function numericValue(raw: unknown): number {
  const parsed = Number(raw);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return 0;
}

export const customLayoutObjectPlugin: FMPlugin = {
  id: "plugin.example.layout-simple-chart",
  version: "1.0.0",
  compatibility: "^1.0.0",
  activate(context) {
    context.registerLayoutComponent({
      type: "plugin.simpleChart",
      displayName: "Simple Chart",
      category: "layoutObject",
      runtimeRenderer(input) {
        const chartField = String(input.component.binding?.field ?? input.component.props.label ?? "").trim();
        const value = chartField ? input.record?.[chartField] : undefined;
        const amount = Math.max(0, Math.min(100, numericValue(value)));
        return createElement(
          "div",
          {
            className: "plugin-simple-chart",
            style: {
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 8,
              padding: 8,
              boxSizing: "border-box",
              background: "#f7f8fb",
              border: "1px solid #d0d4dc",
              borderRadius: 4
            }
          },
          createElement("div", { style: { fontSize: 12, fontWeight: 600 } }, chartField || "Simple Chart"),
          createElement(
            "div",
            {
              style: {
                width: "100%",
                height: 12,
                background: "#e6e9ef",
                borderRadius: 999
              }
            },
            createElement("div", {
              style: {
                width: `${amount}%`,
                height: "100%",
                background: "#3478f6",
                borderRadius: 999
              }
            })
          ),
          createElement("div", { style: { fontSize: 11, color: "#435064" } }, `${amount.toFixed(0)}%`)
        );
      },
      previewRenderer(input) {
        return createElement(
          "div",
          {
            style: {
              width: "100%",
              height: "100%",
              border: "1px dashed #9ba7bb",
              padding: 8,
              boxSizing: "border-box",
              color: "#445067",
              fontSize: 12
            }
          },
          `Preview: ${String(input.component.binding?.field ?? input.component.props.label ?? "Simple Chart")}`
        );
      }
    });
  }
};

export default customLayoutObjectPlugin;

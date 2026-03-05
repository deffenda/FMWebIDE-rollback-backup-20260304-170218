"use client";

import { appLayerErrorLabels, type AppLayerErrorState } from "@/src/lib/app-layer-errors";

type AppLayerErrorBannerProps = {
  error: AppLayerErrorState;
};

export function AppLayerErrorBanner({ error }: AppLayerErrorBannerProps) {
  return (
    <div className="app-layer-error" role="alert">
      <strong>{appLayerErrorLabels[error.code]}:</strong> {error.message}
      {error.details ? <div className="inspector-meta">{error.details}</div> : null}
    </div>
  );
}

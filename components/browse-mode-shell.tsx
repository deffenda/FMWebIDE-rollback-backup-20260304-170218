"use client";

import { BrowseMode } from "@/components/browse-mode";
import { useEffect } from "react";
import { installUiNativeTestHook } from "@/src/lib/ui-native-test-hook";

type BrowseModeShellProps = {
  layoutId: string;
  workspaceId?: string;
};

export function BrowseModeShell({ layoutId, workspaceId }: BrowseModeShellProps) {
  useEffect(() => {
    installUiNativeTestHook("browse", layoutId, workspaceId);
  }, [layoutId, workspaceId]);

  return <BrowseMode layoutId={layoutId} workspaceId={workspaceId} />;
}

"use client";

import { LayoutMode } from "@/components/layout-mode";
import { useEffect } from "react";
import { installUiNativeTestHook } from "@/src/lib/ui-native-test-hook";

type LayoutModeShellProps = {
  layoutId: string;
  workspaceId?: string;
  initialManageSection?: string;
  initialManageDatabaseOpen?: boolean;
};

export function LayoutModeShell({
  layoutId,
  workspaceId,
  initialManageSection,
  initialManageDatabaseOpen
}: LayoutModeShellProps) {
  useEffect(() => {
    installUiNativeTestHook("layout", layoutId, workspaceId);
  }, [layoutId, workspaceId]);

  return (
    <LayoutMode
      layoutId={layoutId}
      workspaceId={workspaceId}
      initialManageSection={initialManageSection}
      initialManageDatabaseOpen={initialManageDatabaseOpen}
    />
  );
}

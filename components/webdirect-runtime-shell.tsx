"use client";

import { useEffect } from "react";

import { installUiNativeTestHook } from "@/src/lib/ui-native-test-hook";
import { WebDirectRuntime } from "./webdirect-runtime";

type WebDirectRuntimeShellProps = {
  layoutId: string;
  workspaceId?: string;
};

export function WebDirectRuntimeShell({ layoutId, workspaceId }: WebDirectRuntimeShellProps) {
  useEffect(() => {
    installUiNativeTestHook("browse", layoutId, workspaceId);
  }, [layoutId, workspaceId]);

  return <WebDirectRuntime layoutId={layoutId} workspaceId={workspaceId} mode="browse" />;
}

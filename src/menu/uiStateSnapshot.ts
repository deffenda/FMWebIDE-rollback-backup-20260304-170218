export type MenuUiStateMode = "layout" | "browse" | "find" | "preview";

export type MenuUiStateSnapshot = {
  mode: MenuUiStateMode;
  hasSelection: boolean;
  canUndo: boolean;
  canRedo: boolean;
  recordDirty: boolean;
  hasRecord: boolean;
  hasPortalFocus: boolean;
  canPaste: boolean;
};

export function createDefaultMenuUiState(mode: MenuUiStateMode): MenuUiStateSnapshot {
  return {
    mode,
    hasSelection: false,
    canUndo: false,
    canRedo: false,
    recordDirty: false,
    hasRecord: false,
    hasPortalFocus: false,
    canPaste: false
  };
}

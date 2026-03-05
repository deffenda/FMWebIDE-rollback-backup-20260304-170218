import type { MenuUiStateSnapshot } from "./uiStateSnapshot.ts";

export function isMenuCommandEnabled(commandId: string, state: MenuUiStateSnapshot): boolean {
  switch (commandId) {
    case "edit-undo":
      return state.canUndo;
    case "edit-redo":
      return state.canRedo;
    case "edit-paste":
      return state.canPaste;
    case "records-new":
      return state.mode === "browse";
    case "records-duplicate":
    case "records-delete":
      return state.mode === "browse" && state.hasRecord;
    case "records-perform-find":
      return state.mode === "find";
    case "records-cancel-find":
      return state.mode === "find";
    case "format-bold":
    case "format-italic":
    case "format-underline":
      return state.mode === "layout" ? state.hasSelection : state.mode === "browse";
    case "layouts-save":
      return state.mode === "layout" && state.recordDirty;
    default:
      return true;
  }
}

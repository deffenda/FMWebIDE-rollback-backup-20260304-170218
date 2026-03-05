import type { AppLayerCapabilityKey } from "../config/appLayerCapabilities.ts";

export type FileMakerMenuMode = "layout" | "browse" | "find" | "preview";

export type FileMakerMenuEnableWhen =
  | { kind: "always" }
  | { kind: "mode"; modes: FileMakerMenuMode[] }
  | { kind: "notMode"; modes: FileMakerMenuMode[] }
  | { kind: "selection" }
  | { kind: "recordDirty" }
  | { kind: "recordPresent" }
  | { kind: "undo" }
  | { kind: "redo" }
  | { kind: "custom"; ruleId: string };

export type FileMakerMenuCommandItem = {
  type: "command";
  id: string;
  label: string;
  shortcut: string | null;
  fmCategory: string;
  commandId: string;
  enableWhen?: FileMakerMenuEnableWhen;
  notes?: string;
  capabilityKey?: AppLayerCapabilityKey;
};

export type FileMakerMenuSeparatorItem = {
  type: "separator";
  id: string;
};

export type FileMakerMenuSubmenuItem = {
  type: "submenu";
  id: string;
  label: string;
  fmCategory: string;
  items: FileMakerMenuItem[];
  notes?: string;
};

export type FileMakerMenuItem =
  | FileMakerMenuCommandItem
  | FileMakerMenuSeparatorItem
  | FileMakerMenuSubmenuItem;

export type FileMakerTopLevelMenu = {
  id: string;
  label: string;
  items: FileMakerMenuItem[];
};

export const FILEMAKER_MENU_UNIMPLEMENTED_POLICY = {
  strategy: "disabled",
  rationale:
    "Menu items that exist in FileMaker but are not implemented in FMWeb IDE remain visible and disabled with a rationale tooltip."
} as const;

export const fileManageMenuItems: FileMakerMenuCommandItem[] = [
  {
    type: "command",
    id: "manage-database",
    label: "Database...",
    shortcut: null,
    fmCategory: "File > Manage",
    commandId: "file-manage-database",
    capabilityKey: "manageDatabase",
    notes: "APP-101"
  },
  {
    type: "command",
    id: "manage-security",
    label: "Security...",
    shortcut: null,
    fmCategory: "File > Manage",
    commandId: "file-manage-security",
    capabilityKey: "manageSecurity",
    notes: "APP-102"
  },
  {
    type: "command",
    id: "manage-value-lists",
    label: "Value Lists...",
    shortcut: null,
    fmCategory: "File > Manage",
    commandId: "file-value-lists",
    capabilityKey: "manageValueLists",
    notes: "APP-103"
  },
  {
    type: "command",
    id: "manage-layouts",
    label: "Layouts...",
    shortcut: null,
    fmCategory: "File > Manage",
    commandId: "file-manage-layouts",
    capabilityKey: "manageLayouts",
    notes: "APP-104"
  },
  {
    type: "command",
    id: "manage-scripts",
    label: "Scripts...",
    shortcut: null,
    fmCategory: "File > Manage",
    commandId: "file-manage-scripts",
    capabilityKey: "manageScripts",
    notes: "APP-105"
  },
  {
    type: "command",
    id: "manage-external-data-sources",
    label: "External Data Sources...",
    shortcut: null,
    fmCategory: "File > Manage",
    commandId: "file-manage-external-data-sources",
    capabilityKey: "manageExternalDataSources",
    notes: "APP-106"
  },
  {
    type: "command",
    id: "manage-containers",
    label: "Containers...",
    shortcut: null,
    fmCategory: "File > Manage",
    commandId: "file-manage-containers",
    capabilityKey: "manageContainers",
    notes: "APP-107"
  },
  {
    type: "command",
    id: "manage-custom-functions",
    label: "Custom Functions...",
    shortcut: null,
    fmCategory: "File > Manage",
    commandId: "file-manage-custom-functions",
    capabilityKey: "manageCustomFunctions",
    notes: "APP-108"
  },
  {
    type: "command",
    id: "manage-custom-menus",
    label: "Custom Menus...",
    shortcut: null,
    fmCategory: "File > Manage",
    commandId: "file-manage-custom-menus",
    capabilityKey: "manageCustomMenus",
    notes: "APP-109"
  },
  {
    type: "command",
    id: "manage-themes",
    label: "Themes...",
    shortcut: null,
    fmCategory: "File > Manage",
    commandId: "file-manage-themes",
    capabilityKey: "manageThemes",
    notes: "APP-110"
  }
];

export const fileSharingMenuItems: FileMakerMenuCommandItem[] = [
  {
    type: "command",
    id: "sharing-filemaker-network",
    label: "With FileMaker Network...",
    shortcut: null,
    fmCategory: "File > Sharing",
    commandId: "file-sharing-network",
    capabilityKey: "sharing",
    notes: "APPX-202"
  },
  {
    type: "command",
    id: "sharing-filemaker-webdirect",
    label: "With FileMaker WebDirect...",
    shortcut: null,
    fmCategory: "File > Sharing",
    commandId: "file-sharing-webdirect",
    capabilityKey: "sharing",
    notes: "APPX-202"
  },
  {
    type: "command",
    id: "sharing-odbc-jdbc",
    label: "With ODBC/JDBC...",
    shortcut: null,
    fmCategory: "File > Sharing",
    commandId: "file-sharing-odbc-jdbc",
    capabilityKey: "sharing",
    notes: "APPX-202"
  },
  {
    type: "command",
    id: "sharing-upload-to-host",
    label: "Upload to Host...",
    shortcut: null,
    fmCategory: "File > Sharing",
    commandId: "file-sharing-upload-host",
    capabilityKey: "sharing",
    notes: "APPX-202"
  }
];

export const canonicalTopLevelMenus: FileMakerTopLevelMenu[] = [
  { id: "file", label: "File", items: [] },
  { id: "edit", label: "Edit", items: [] },
  { id: "view", label: "View", items: [] },
  { id: "insert", label: "Insert", items: [] },
  { id: "format", label: "Format", items: [] },
  { id: "records", label: "Records", items: [] },
  { id: "scripts", label: "Scripts", items: [] },
  { id: "window", label: "Window", items: [] },
  { id: "help", label: "Help", items: [] }
];

export const canonicalTopLevelMenuLabels = canonicalTopLevelMenus.map((entry) => entry.label);

export const layoutModeTopLevelMenuLabels = [
  "FileMaker Pro",
  "File",
  "Edit",
  "View",
  "Insert",
  "Format",
  "Layouts",
  "Arrange",
  "Scripts",
  "Tools",
  "Window",
  "Help",
  "FMWeb IDE"
] as const;

export const browseModeTopLevelMenuLabels = [
  "FileMaker Pro",
  "File",
  "Edit",
  "View",
  "Insert",
  "Format",
  "Records",
  "Scripts",
  "Tools",
  "Window",
  "Help",
  "FMWeb IDE"
] as const;

export function findManageMenuItem(commandId: string): FileMakerMenuCommandItem | null {
  return fileManageMenuItems.find((item) => item.commandId === commandId) ?? null;
}

export function findSharingMenuItem(commandId: string): FileMakerMenuCommandItem | null {
  return fileSharingMenuItems.find((item) => item.commandId === commandId) ?? null;
}

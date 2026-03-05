export type UiMode = "home" | "layout" | "browse" | "find" | "preview";
export type CommandCategory = "menu" | "status" | "toolbar" | "object" | "navigation";

export type NativeCommand = {
  id: string;
  label: string;
  category: CommandCategory;
  modes: UiMode[];
  menuButtonText?: string;
  itemText?: string;
  selector?: string;
  allowDisabled?: boolean;
  notes?: string;
};

const homeCommands: NativeCommand[] = [
  {
    id: "home-open-layout",
    label: "Open Layout Mode",
    category: "navigation",
    modes: ["home"],
    selector: 'a:has-text("Open Layout Mode")'
  },
  {
    id: "home-open-browse",
    label: "Open Browse Mode",
    category: "navigation",
    modes: ["home"],
    selector: 'a:has-text("Open Browse Mode")'
  }
];

const layoutMenuCommands: NativeCommand[] = [
  { id: "layout-menu-filemaker", label: "FileMaker menu", category: "menu", modes: ["layout"], menuButtonText: "FileMaker", itemText: "About FM Web IDE" },
  { id: "layout-menu-file", label: "File menu", category: "menu", modes: ["layout"], menuButtonText: "File", itemText: "Create New..." },
  { id: "layout-menu-edit", label: "Edit menu", category: "menu", modes: ["layout"], menuButtonText: "Edit", itemText: "Select All", allowDisabled: true },
  { id: "layout-menu-view", label: "View menu", category: "menu", modes: ["layout"], menuButtonText: "View", itemText: "Page Margins" },
  { id: "layout-menu-insert", label: "Insert menu", category: "menu", modes: ["layout"], menuButtonText: "Insert", itemText: "Field" },
  { id: "layout-menu-format", label: "Format menu", category: "menu", modes: ["layout"], menuButtonText: "Format", itemText: "Theme and Styles...", allowDisabled: true },
  { id: "layout-menu-layouts", label: "Layouts menu", category: "menu", modes: ["layout"], menuButtonText: "Layouts", itemText: "Go to Layout" },
  { id: "layout-menu-arrange", label: "Arrange menu", category: "menu", modes: ["layout"], menuButtonText: "Arrange", itemText: "Bring to Front", allowDisabled: true },
  { id: "layout-menu-scripts", label: "Scripts menu", category: "menu", modes: ["layout"], menuButtonText: "Scripts", itemText: "Script Editor..." },
  { id: "layout-menu-tools", label: "Tools menu", category: "menu", modes: ["layout"], menuButtonText: "Tools", itemText: "Data Viewer..." },
  { id: "layout-menu-window", label: "Window menu", category: "menu", modes: ["layout"], menuButtonText: "Window", itemText: "Show Window" },
  { id: "layout-menu-help", label: "Help menu", category: "menu", modes: ["layout"], menuButtonText: "Help", itemText: "About FM Web IDE" },
  { id: "layout-menu-fmweb-ide", label: "FMWeb IDE menu", category: "menu", modes: ["layout"], menuButtonText: "FMWeb IDE", itemText: "Database Connections..." }
];

const layoutStatusCommands: NativeCommand[] = [
  { id: "layout-status-objects-toggle", label: "Objects panel toggle", category: "status", modes: ["layout"], selector: 'button[aria-label="Hide objects and fields panel"], button[aria-label="Show objects and fields panel"]' },
  { id: "layout-status-view-menu", label: "Status View menu", category: "status", modes: ["layout"], selector: '.fm-layout-status-main button:has-text("View")' },
  { id: "layout-status-layout-menu", label: "Status Layout menu", category: "status", modes: ["layout"], selector: '.fm-layout-status-main button:has-text("Layout")' },
  { id: "layout-status-insert-menu", label: "Status Insert menu", category: "status", modes: ["layout"], selector: '.fm-layout-status-main button:has-text("Insert")' },
  { id: "layout-status-inspector-toggle", label: "Inspector panel toggle", category: "status", modes: ["layout"], selector: 'button[aria-label="Hide inspector panel"], button[aria-label="Show inspector panel"]' }
];

const browseMenuCommands: NativeCommand[] = [
  { id: "browse-menu-file", label: "Browse File menu", category: "menu", modes: ["browse", "find", "preview"], menuButtonText: "File", itemText: "Print..." },
  { id: "browse-menu-edit", label: "Browse Edit menu", category: "menu", modes: ["browse", "find", "preview"], menuButtonText: "Edit", itemText: "Select All" },
  { id: "browse-menu-records", label: "Browse Records menu", category: "menu", modes: ["browse", "find", "preview"], menuButtonText: "Records", itemText: "Show All Records" },
  { id: "browse-menu-view", label: "Browse View menu", category: "menu", modes: ["browse", "find", "preview"], menuButtonText: "View", itemText: "Preview Mode" },
  { id: "browse-menu-layouts", label: "Browse Layouts menu", category: "menu", modes: ["browse", "find", "preview"], menuButtonText: "Layouts", itemText: "Go to Layout" },
  { id: "browse-menu-scripts", label: "Browse Scripts menu", category: "menu", modes: ["browse", "find", "preview"], menuButtonText: "Scripts", itemText: "Run Script..." },
  { id: "browse-menu-window", label: "Browse Window menu", category: "menu", modes: ["browse", "find", "preview"], menuButtonText: "Window", itemText: "Show Window" },
  { id: "browse-menu-help", label: "Browse Help menu", category: "menu", modes: ["browse", "find", "preview"], menuButtonText: "Help", itemText: "About FM Web IDE" },
  { id: "browse-menu-fmweb-ide", label: "Browse FMWeb IDE menu", category: "menu", modes: ["browse", "find", "preview"], menuButtonText: "FMWeb IDE", itemText: "Database Connections..." }
];

const browseStatusCommands: NativeCommand[] = [
  { id: "browse-first-record", label: "First record", category: "status", modes: ["browse", "find"], selector: 'button[aria-label="First record"], button[aria-label="First find request"]' },
  { id: "browse-prev-record", label: "Previous record", category: "status", modes: ["browse", "find"], selector: 'button[aria-label="Previous record"], button[aria-label="Previous find request"]' },
  { id: "browse-next-record", label: "Next record", category: "status", modes: ["browse", "find"], selector: 'button[aria-label="Next record"], button[aria-label="Next find request"]' },
  { id: "browse-last-record", label: "Last record", category: "status", modes: ["browse", "find"], selector: 'button[aria-label="Last record"], button[aria-label="Last find request"]' },
  { id: "browse-action-show-all", label: "Show All", category: "status", modes: ["browse"], selector: '.fm-status-main button:has-text("Show All")' },
  { id: "browse-action-new", label: "New Record", category: "status", modes: ["browse"], selector: '.fm-status-main button:has-text("New Record")' },
  { id: "browse-action-edit", label: "Edit Record", category: "status", modes: ["browse"], selector: '.fm-status-main button:has-text("Edit")' },
  { id: "browse-action-save", label: "Save Record", category: "status", modes: ["browse"], selector: '.fm-status-main button:has-text("Save")', allowDisabled: true },
  { id: "browse-action-cancel", label: "Cancel Edit", category: "status", modes: ["browse"], selector: '.fm-status-main button:has-text("Cancel")', allowDisabled: true },
  { id: "browse-action-find", label: "Find", category: "status", modes: ["browse"], selector: '.fm-status-main .fm-find-split-main' },
  { id: "browse-view-form", label: "View Form", category: "toolbar", modes: ["browse", "find", "preview"], selector: '.fm-view-switch button:has-text("Form")' },
  { id: "browse-view-list", label: "View List", category: "toolbar", modes: ["browse", "find", "preview"], selector: '.fm-view-switch button:has-text("List")' },
  { id: "browse-view-table", label: "View Table", category: "toolbar", modes: ["browse", "find", "preview"], selector: '.fm-view-switch button:has-text("Table")' },
  { id: "browse-view-preview", label: "View Preview", category: "toolbar", modes: ["browse", "find", "preview"], selector: '.fm-view-switch button:has-text("Preview")', allowDisabled: true },
  { id: "browse-refresh", label: "Refresh", category: "toolbar", modes: ["browse", "find", "preview"], selector: '.fm-status-sub button:has-text("Refresh")' },
  { id: "browse-go-layout-mode", label: "Go Layout Mode", category: "navigation", modes: ["browse", "find", "preview"], selector: '.fm-status-sub a:has-text("Layout Mode")' }
];

export const nativeCommandRegistry: NativeCommand[] = [
  ...homeCommands,
  ...layoutMenuCommands,
  ...layoutStatusCommands,
  ...browseMenuCommands,
  ...browseStatusCommands
].sort((a, b) => a.id.localeCompare(b.id));

export const REQUIRED_UI_COVERAGE = 0.8;

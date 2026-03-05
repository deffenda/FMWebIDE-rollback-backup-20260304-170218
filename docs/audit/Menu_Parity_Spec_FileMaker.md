# FileMaker Menu Parity Spec (Repair Phase)

## Policy
- Unimplemented FileMaker menu items in FMWeb IDE follow a single rule: **show disabled with rationale**.
- Reference implementation is centralized in [`src/menu/filemakerMenuSpec.ts`](/Users/deffenda/Code/FMWebIDE/src/menu/filemakerMenuSpec.ts).
- Window/menu entries that previously listed workspace IDs are removed; no menu item label or command ID may contain `workspace`.

## Canonical Top-Level Menus
- Browse Mode:
  - FileMaker Pro
  - File
  - Edit
  - View
  - Insert
  - Format
  - Records
  - Scripts
  - Tools
  - Window
  - Help
- Layout Mode:
  - FileMaker Pro
  - File
  - Edit
  - View
  - Insert
  - Format
  - Layouts
  - Arrange
  - Scripts
  - Tools
  - Window
  - Help

## File > Manage Canonical Submenu
Source of truth: [`fileManageMenuItems`](/Users/deffenda/Code/FMWebIDE/src/menu/filemakerMenuSpec.ts)

| ID | Label | Shortcut | Capability | Handler Command ID | Enablement |
|---|---|---|---|---|---|
| `manage-database` | `Database...` | — | `manageDatabase` | `file-manage-database` | Enabled if capability enabled |
| `manage-security` | `Security...` | — | `manageSecurity` | `file-manage-security` | Enabled if capability enabled |
| `manage-value-lists` | `Value Lists...` | — | `manageValueLists` | `file-value-lists` | Enabled if capability enabled |
| `manage-layouts` | `Layouts...` | — | `manageLayouts` | `file-manage-layouts` | Enabled if capability enabled |
| `manage-scripts` | `Scripts...` | — | `manageScripts` | `file-manage-scripts` | Enabled if capability enabled |
| `manage-external-data-sources` | `External Data Sources...` | — | `manageExternalDataSources` | `file-manage-external-data-sources` | Enabled if capability enabled |
| `manage-containers` | `Containers...` | — | `manageContainers` | `file-manage-containers` | Enabled if capability enabled |
| `manage-custom-functions` | `Custom Functions...` | — | `manageCustomFunctions` | `file-manage-custom-functions` | Enabled if capability enabled |
| `manage-custom-menus` | `Custom Menus...` | — | `manageCustomMenus` | `file-manage-custom-menus` | Enabled if capability enabled |
| `manage-themes` | `Themes...` | — | `manageThemes` | `file-manage-themes` | Enabled if capability enabled |

## Enablement Snapshot Rules
Rule implementation: [`src/menu/menuEnablement.ts`](/Users/deffenda/Code/FMWebIDE/src/menu/menuEnablement.ts)

- `Edit > Undo`: enabled when `canUndo`.
- `Edit > Redo`: enabled when `canRedo`.
- `Edit > Paste`: enabled when `canPaste`.
- `Records > New Record`: enabled in `browse` mode.
- `Records > Duplicate/Delete`: enabled in `browse` mode with current record.
- `Records > Perform Find/Cancel Find`: enabled in `find` mode.
- `Layouts > Save`: enabled in `layout` mode when record/layout is dirty.

## Command Dispatch + Testability
- Every top menu action dispatches through command bus logging before action execution.
- Command bus source: [`src/menu/commandBus.ts`](/Users/deffenda/Code/FMWebIDE/src/menu/commandBus.ts)
- Test hook exposed as `window.__fmMenuCommandBus` with `getHistory`, `getLast`, `clear`.

## DDR Fixture Lock for Validation
Menu parity tests are executed against the active DDR-backed default context:
- layout: `Asset Details` (Assets solution context)

Run UI menu parity tests:
- `npm run test:ui`

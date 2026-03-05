# Plugin Packaging

Phase 10 defines a manifest-first packaging model.

Manifest contract:

- `id`
- `name`
- `version`
- `compatibility`
- optional: `description`, `entry`, `author`, `homepage`

Validation helpers:

- `/Users/deffenda/Code/FMWebIDE/src/plugins/manifest.ts`

CLI scaffold:

- Script: `/Users/deffenda/Code/FMWebIDE/scripts/fmweb-plugin.mjs`
- Command:
  - `node /Users/deffenda/Code/FMWebIDE/scripts/fmweb-plugin.mjs init my-plugin`
  - installed/bin usage: `npx fmweb-plugin init my-plugin`

Scaffold output:

- `manifest.json`
- `README.md`
- `src/index.ts` plugin entry

Future packaging roadmap:

- remote plugin registry
- plugin signing/verification
- install/uninstall enable/disable UI

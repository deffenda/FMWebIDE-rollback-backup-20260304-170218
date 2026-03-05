# Runtime Security and Privilege Gating

## Implemented
- Capabilities endpoint:
  - `/Users/deffenda/Code/FMWebIDE/app/api/fm/capabilities/route.ts`
- Browse runtime enforcement:
  - `/Users/deffenda/Code/FMWebIDE/components/browse-mode.tsx`

## Capability Payload
Runtime consumes:
- layout-level permissions: `canView`, `canEdit`, `canDelete`
- portal-level permissions: `canDeleteRelated`
- per-field permissions: `visible`, `editable`
- role token for diagnostics

## Enforced Behavior
- Layout visibility gating (`canView === false` hides runtime layout surface).
- Field visibility/editability gating for rendered controls.
- Edit/new/delete actions blocked when role disallows them.
- Portal delete actions blocked when capability map disallows related deletes.

## Mock Mode Role Simulation
Use browse URL query param:
- `mockRole=fullAccess`
- `mockRole=readOnly`
- `mockRole=restricted`
- `mockRole=noAccess`

This allows regression testing of gating behavior without live FileMaker privilege changes.

## Limits
- Live FileMaker privilege introspection is currently limited; fallback is permissive if capability derivation fails.
- Fine-grained privilege rules (record-level calc policies per account set) remain a future enhancement.

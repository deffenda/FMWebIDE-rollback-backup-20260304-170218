# FileMaker Regression Matrix (Layout + Browse + Find)

## Scope
- Database: `Assets` (plus workspace-aware solutions)
- Entities: `Assets`, `Vendors`, `Employees`
- Browse views: `Form`, `List`, `Table`
- Modes: `Browse`, `Find`, `Preview`
- Cross-cutting checks:
  - portals
  - value lists
  - repeating fields
  - tab controls
  - trigger flow / commit veto
  - privilege gating

## Automated Coverage

### Runtime parity suites (mock-safe)
- `npm run test:runtime-parity`
  - hide-object calc
  - multi-request find (include/omit)
  - constrain/extend found-set helpers
  - sort/group/subsummary engine behavior
  - field-engine validation + auto-enter behavior
  - portal filter + active row token
  - commit/revert lifecycle
  - container render model mapping
  - repeating-field helper behavior
  - trigger ordering
  - parity checklist summary
  - phase 3 checklist additions:
    - found set model
    - window stack model
    - variable scopes
    - context stack resolution
    - script engine lite
- `npm run test:tabs`
  - active-tab token parse/serialize
  - panel child scoping inference
- `npm run test:tab-order`
  - canonical tab-order resolution/migration
  - deterministic default/legacy fallback ordering
  - next/previous tab target resolution
- `npm run test:saved-searches`
  - workspace saved-find normalization/read-write
  - workspace saved-found-set normalization/read-write
  - schema coercion and invalid entry pruning
- `npm run test:triggers`
  - trigger bus event ordering
  - request/veto semantics
- `npm run test:trigger-policy`
  - commit-request rule evaluation
- `npm run test:value-lists`
  - value-list cache expiration/scoping
- `npm run test:privileges`
  - role normalization
  - field visibility/edit/delete gating policy helpers
- `npm run test:find-mode`
  - criteria/request normalization
  - wildcard/comparison/range/date matching
  - Data API payload translation for `_find`
  - omit/include request behavior
- `npm run test:sort-reporting`
  - deterministic multi-field sort
  - grouped row and subsummary generation
- `npm run test:field-engine`
  - validation rules (required/type/range/pattern/calc)
  - auto-enter create/modify behavior
- `npm run test:runtime-kernel`
  - found set store transitions
  - window manager/card stack state
  - variable lifecycle semantics
  - context stack field resolution
  - script workspace step mapping
  - script engine control flow
  - kernel integration behavior
- `npm run test:workspace-multifile`
  - workspace v1->v2 migration
  - dependency graph routing resolution
  - cross-file CRUD target routing (ProjectTracker->Common style)
  - cross-file script routing target resolution
  - per-database token cache + 401 re-auth behavior
  - missing API layout mapping guardrails
- `npm run test:summary-engine`
  - summary operation correctness (count/sum/avg/min/max)
  - grouped summary recalculation determinism
- `npm run test:script-advanced`
  - loop / exit-loop / else-if flow
  - transaction-script integration behavior
  - `Get(LastError)` / `Get(LastMessage)` capture path
- `npm run test:transactions`
  - transaction staging order
  - rollback-on-failure behavior
  - explicit revert semantics

### Integration regression (FileMaker env)
- `npm run test:fm-regression`
  - CRUD create/edit/delete/recreate
  - find requests + omit/constrain/extend checks
  - sort/group/subsummary parity checks
  - field-engine validation/auto-enter checks
  - value-list readability checks
  - portal payload + related edit save path
  - tab-order canonical normalization sanity
  - workspace persistence checks for saved finds and saved found sets
  - prints `FM Integration Parity Checklist v8` footer:
    - `crud:create-edit-delete`
    - `find:criteria-consistency`
    - `find:requests-omit-constrain-extend`
    - `reporting:sort-group-subsummary`
    - `field-engine:validation-auto-enter`
    - `value-lists:human-readable`
    - `portal:payload-and-related-edit`
    - `tab-order:canonical-resolution`
    - `saved-finds:workspace-persistence`
    - `saved-found-sets:workspace-persistence`
    - `phase8:script-engine-advanced`
    - `phase8:transactions`
    - `phase8:summary-engine`

### Import/model regression
- `npm run test:layout-import`
  - DDR reimport stability
  - portal child metadata
  - layout parts and style metadata

## Manual High-Risk Cases
1. Repeating fields in form/list/table
- edit repetition 1..n
- save and cancel behavior
- reload and verify committed values

2. Tab controls
- switch tabs and verify child visibility
- verify URL `tabs=` persistence and back/forward navigation behavior

3. Trigger and commit veto
- configure commit-request deny rule
- attempt save and verify veto status + no server write
- clear veto condition and verify save succeeds

4. Privilege gating
- use `mockRole` query param in browse route
- verify field visibility/editability/action restrictions

5. Portal operations
- active row selection
- delete disabled when portal/layout capability denies delete
- portal sort/filter correctness

6. Find mode parity
- create multiple requests
- include omit request
- perform find then constrain/extend found set
- verify current-record pointer stability when possible

7. Sort/group/subsummary parity
- apply multi-field sort rules
- enable grouping and verify leading/trailing summary rows
- verify aggregates (count/sum/min/max/avg) in list/table render paths

8. Field engine behaviors
- verify required/type/range/pattern validation on commit
- verify auto-enter timestamp/account/serial defaults on create
- verify modification auto-enter values update on commit

9. Tab order parity
- set custom tab order in layout mode and verify browse `Tab` / `Shift+Tab` follows sequence
- verify hidden or non-entry objects are skipped
- verify portal row tab order remains deterministic

10. Saved finds/found sets
- save find criteria and re-run after reload/workspace switch
- save found-set snapshot and re-open with stable next/prev navigation
- verify missing record IDs are skipped with non-fatal status messaging

## Exit Criteria
- Typecheck, lint, and full unit/runtime test chain pass.
- Integration regression passes when FileMaker credentials are configured.
- No runtime crash when calc/trigger/policy evaluation fails (graceful fallback + debug trace).

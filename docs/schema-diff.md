# Schema Diff

Phase 13 adds a deterministic snapshot-to-snapshot diff engine.

Implementation:
- `/Users/deffenda/Code/FMWebIDE/src/lib/schemaDiff/types.ts`
- `/Users/deffenda/Code/FMWebIDE/src/lib/schemaDiff/diff.ts`

## Diff Coverage

The engine compares:
- Tables (added/removed/probable rename)
- Fields (added/removed/type/options/probable rename)
- Table occurrences (added/removed/base changes)
- Relationships (added/removed)
- Value lists (added/removed/changed)
- Layout/script binding changes (best effort)

Output:
- `SchemaDiffResult` with categorized `changes`
- Severity (`breaking`, `warn`, `info`)
- Summary counters
- `impactedEntityKeys` feed for impact analysis

## Rename Heuristics

Probable rename detection is transparent and confidence-scored:
- Name similarity scoring (token bigram based)
- Optional type consistency checks for fields
- Reported as `probable-rename` entries
- Never silently applied

## Reports

Developer tools supports:
- JSON diff payloads
- Markdown diff reports (for review/PR/CI artifacts)

Endpoint action:
- `exportReport` with `reportKind: "diff"` and `reportFormat: "json" | "markdown"`

## Usage

1. Create/select baseline snapshot.
2. Create/select target snapshot.
3. Run `diffSnapshots`.
4. Review `summary`, `changes`, and `probableRenames`.

## Testing

Covered by:
- `/Users/deffenda/Code/FMWebIDE/src/lib/dev-tools.test.mts`

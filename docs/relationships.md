# Relationships and TO Traversal (Phase 3)

## Source of Relationship Metadata
- DDR relationship graph API:
  - `app/api/fm/relationships/route.ts`
  - `src/server/ddr-relationship-graph.ts`

## Runtime Direction
Phase 3 introduces context-stack foundations so TO traversal can be represented in runtime state. The kernel now supports:
- explicit context frame push/pop
- TO-aware field reference resolution

## Current State
- full automatic relationship traversal (`Go to Related Record` path resolution through graph) is still partial.
- portal row context and TO scoping are represented in state; traversal behavior can now be layered on top.

## Next Steps
- resolve relationship edges at runtime for script/navigation steps
- add guardrails for missing relationship paths
- persist traversal breadcrumbs in window navigation stack

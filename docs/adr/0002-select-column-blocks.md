# ADR 0002 — SELECT column blocks in the visual query builder

**Status:** Accepted  
**Date:** 2026-06-21

## Context

The visual query builder (`BuilderMode`) renders the SELECT clause as a static, non-interactive block that always emits `SELECT *`. Users have no way to pick specific columns without switching to raw SQL mode.

## Decision

Make the SELECT block interactive by allowing users to add individual column blocks, one per column they want to project.

### Behavior

- **Default:** When no column blocks are added, the SQL generator emits `SELECT *` (backwards-compatible, nothing breaks).
- **With columns:** Emits `SELECT table.column, ...` — always with `table.` prefix to avoid ambiguity across JOINs.
- **Available tables in the picker:** The FROM table + any JOIN whose `table` field is non-empty.
- **No aliases** for now (out of scope).
- **Duplicates:** Not prevented at the data layer; the user can add the same column twice if they want.

### UI

- A `+ column` button lives inside/near the SELECT block (not in the bottom action bar).
- The button is disabled until a table is selected and its columns are loaded.
- Each column block has two dropdowns: (1) table picker, (2) column picker filtered to that table.
- Column blocks are compact — lighter than WHERE blocks visually.

### Cleanup invariant

When a JOIN is removed, all SELECT column blocks whose `table` matches that join's `table` are automatically removed. This keeps the SQL generator from referencing columns from tables that no longer exist in the FROM clause.

## Data model changes

`BuilderState` gains a `columns` field:

```ts
interface SelectedColumn {
  id: string
  table: string
  column: string
}

interface BuilderState {
  table: string | null
  columns: SelectedColumn[]   // NEW — empty means SELECT *
  joins: JoinClause[]
  conditions: WhereCondition[]
  orderBy: OrderByClause | null
  limit: string
}
```

`generateSQL` changes the first line:

```ts
const selectClause = state.columns.length === 0
  ? 'SELECT *'
  : `SELECT ${state.columns.map(c => `${c.table}.${c.column}`).join(', ')}`
```

## Consequences

- The SELECT block stops being a pure display element and becomes stateful.
- `removeJoin` must co-mutate `state.columns` — coupling that didn't exist before.
- `setTable` already resets to `EMPTY_STATE`, so a table change wipes columns too (correct).
- Future: aliases, expressions (`COUNT(*)`, `SUM(...)`), `DISTINCT` — all fit naturally as extensions to `SelectedColumn`.

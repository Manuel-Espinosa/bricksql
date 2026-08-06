import type { PrimaryKeyEntry, QueryResult } from '../api'

/**
 * A stable identity for a row, derived from its primary key values —
 * survives the row being re-fetched at a different array position (see
 * CONTEXT.md's Editable Result: selection must be re-mapped by PK, not by
 * position, after a post-edit refresh). Returns null when the result has no
 * Primary Key to key off of (non-editable results fall back to a positional
 * key chosen by the caller).
 */
export function rowKeyFor(result: QueryResult, row: Record<string, unknown>): string | null {
  const meta = result.editable
  if (!meta?.editable || !meta.primaryKey || meta.primaryKey.length === 0) return null
  return meta.primaryKey.map((col) => `${col}=${JSON.stringify(row[col])}`).join('|')
}

export function pkForRow(result: QueryResult, row: Record<string, unknown>): PrimaryKeyEntry[] {
  const meta = result.editable
  if (!meta?.editable || !meta.primaryKey) return []
  return meta.primaryKey.map((col) => ({ column: col, value: row[col] }))
}

export function isColumnEditable(result: QueryResult, column: string): boolean {
  const meta = result.editable
  return !!meta?.editable && !!meta.editableColumns && column in meta.editableColumns
}

export function isJsonColumn(result: QueryResult, column: string): boolean {
  return !!result.jsonColumns?.includes(column)
}

/** The physical column name to send on save — may differ from the displayed/aliased column name. */
export function physicalColumnFor(result: QueryResult, column: string): string | null {
  const meta = result.editable
  if (!meta?.editable || !meta.editableColumns) return null
  return meta.editableColumns[column] ?? null
}

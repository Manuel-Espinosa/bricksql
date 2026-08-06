import { useRef, useState } from 'react'
import { cellApi, type QueryResult } from '../api'
import { pkForRow, physicalColumnFor, rowKeyFor } from './cellEdit'

interface EditingCell {
  rowKey: string
  column: string
}

function errorKey(rowKey: string, column: string) {
  return `${rowKey}:${column}`
}

/**
 * One instance is shared between ResultsTable's flat table and VerticalView
 * (they're never both mounted at once) so both render identical edit/save/
 * error behavior for the same underlying result.
 */
export function useCellEditor(
  connectionId: string,
  result: QueryResult,
  onSaved: () => Promise<void>,
) {
  const [editing, setEditingState] = useState<EditingCell | null>(null)
  // Mirrors `editing` synchronously (state updates don't apply until the next
  // render) so an in-flight save can tell, after its await, whether the user
  // has since moved on to a different cell and avoid clobbering it.
  const editingRef = useRef<EditingCell | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Map<string, string>>(new Map())

  function setEditing(next: EditingCell | null) {
    editingRef.current = next
    setEditingState(next)
  }

  function isStillEditing(rowKey: string, column: string) {
    return editingRef.current?.rowKey === rowKey && editingRef.current?.column === column
  }

  function startEdit(rowKey: string, column: string, currentValue: unknown) {
    setEditing({ rowKey, column })
    setDraft(currentValue === null || currentValue === undefined ? '' : String(currentValue))
    setErrors((prev) => {
      if (!prev.has(errorKey(rowKey, column))) return prev
      const next = new Map(prev)
      next.delete(errorKey(rowKey, column))
      return next
    })
  }

  function cancelEdit() {
    setEditing(null)
    setDraft('')
  }

  async function commitEdit() {
    if (!editing) return
    const { rowKey, column } = editing
    const value = draft
    const row = result.rows.find((r) => rowKeyFor(result, r) === rowKey)
    const physicalColumn = physicalColumnFor(result, column)
    if (!row || !physicalColumn || !result.editable?.table) {
      if (isStillEditing(rowKey, column)) setEditing(null)
      return
    }

    setSaving(true)
    try {
      await cellApi.update(connectionId, {
        table: result.editable.table,
        primaryKey: pkForRow(result, row),
        column: physicalColumn,
        value: value === '' ? null : value,
      })
      if (isStillEditing(rowKey, column)) {
        setEditing(null)
        setDraft('')
      }
      await onSaved()
    } catch (err) {
      setErrors((prev) => new Map(prev).set(errorKey(rowKey, column), (err as Error).message))
      if (isStillEditing(rowKey, column)) setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  function errorFor(rowKey: string, column: string): string | undefined {
    return errors.get(errorKey(rowKey, column))
  }

  return { editing, draft, setDraft, saving, startEdit, cancelEdit, commitEdit, errorFor }
}

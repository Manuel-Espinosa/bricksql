import { useState, useRef, useEffect } from 'react'
import type { QueryResult } from '../api'
import VerticalView from './VerticalView'
import EditableCell from './EditableCell'
import JsonCellModal from './JsonCellModal'
import { toCsv, toJson, toMarkdown, downloadCsv } from '../lib/resultExport'
import { isColumnEditable, isJsonColumn, rowKeyFor } from '../lib/cellEdit'
import { useCellEditor } from '../lib/useCellEditor'

const MAX_COMPARE_ROWS = 10

interface Props {
  result: QueryResult
  elapsed?: number
  connectionId: string
  queryRunId: number
  onRefresh: () => Promise<QueryResult>
}

const COPY_OPTIONS = [
  { label: 'CSV', fn: toCsv },
  { label: 'JSON', fn: toJson },
  { label: 'Markdown', fn: toMarkdown },
] as const

export function CopyMenu({ result }: { result: QueryResult }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  async function copy(label: string, fn: (r: QueryResult) => string) {
    await navigator.clipboard.writeText(fn(result))
    setCopied(label)
    setOpen(false)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs text-brick-400 hover:text-copper-500 uppercase tracking-widest transition-colors"
      >
        {copied ? `✓ ${copied}` : 'copy ↓'}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-brick-900 border border-brick-800 z-20 min-w-max shadow-lg">
          {COPY_OPTIONS.map(({ label, fn }) => (
            <button
              key={label}
              onClick={() => copy(label, fn)}
              className="block w-full text-left px-4 py-2 text-xs text-cream-200 hover:bg-brick-800 transition-colors uppercase tracking-widest"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ResultsTable({ result, elapsed, connectionId, queryRunId, onRefresh }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showVertical, setShowVertical] = useState(false)
  const [capNotice, setCapNotice] = useState(false)

  // Reset selection only on a genuinely new query run — not on the refetch
  // that follows a cell save, which instead remaps by primary key below.
  const [prevQueryRunId, setPrevQueryRunId] = useState(queryRunId)
  if (prevQueryRunId !== queryRunId) {
    setPrevQueryRunId(queryRunId)
    setSelected(new Set())
    setShowVertical(false)
  }

  function keyFor(row: Record<string, unknown>, i: number): string {
    return rowKeyFor(result, row) ?? String(i)
  }

  async function handleSaved() {
    const newResult = await onRefresh()
    const validKeys = new Set(newResult.rows.map((r, i) => rowKeyFor(newResult, r) ?? String(i)))
    setSelected((prev) => {
      const next = new Set<string>()
      prev.forEach((k) => {
        if (validKeys.has(k)) next.add(k)
      })
      return next
    })
  }

  const {
    editing,
    draft,
    setDraft,
    saving,
    startEdit,
    cancelEdit,
    commitEdit,
    errorFor,
    jsonModal,
    jsonSaving,
    jsonError,
    openJsonModal,
    closeJsonModal,
    saveJsonModal,
  } = useCellEditor(connectionId, result, handleSaved)

  function toggleRow(key: string) {
    const next = new Set(selected)
    if (next.has(key)) {
      next.delete(key)
      if (next.size === 0) setShowVertical(false)
    } else {
      if (next.size >= MAX_COMPARE_ROWS) {
        setCapNotice(true)
        setTimeout(() => setCapNotice(false), 1500)
        return
      }
      next.add(key)
    }
    setSelected(next)
  }

  function removeFromSelection(key: string) {
    const next = new Set(selected)
    next.delete(key)
    setSelected(next)
    if (next.size === 0) setShowVertical(false)
  }

  const rowsByKey = new Map(result.rows.map((r, i) => [keyFor(r, i), r]))
  const selectedKeys = result.rows
    .map((r, i) => keyFor(r, i))
    .filter((k) => selected.has(k))
  const derivedResult: QueryResult = {
    columns: result.columns,
    rows: selectedKeys.map((k) => rowsByKey.get(k)!),
  }

  if (result.affectedRows !== undefined) {
    return (
      <div className="p-4 flex items-center gap-3">
        <span className="text-success-400 text-xs">✓</span>
        <span className="text-cream-200 text-xs">
          {result.affectedRows} row{result.affectedRows !== 1 ? 's' : ''} affected
        </span>
        {elapsed !== undefined && (
          <span className="text-brick-500 text-xs ml-auto">{elapsed}ms</span>
        )}
      </div>
    )
  }

  if (result.rows.length === 0) {
    return (
      <div className="p-4 text-brick-500 text-xs flex items-center gap-3">
        <span>0 rows</span>
        {elapsed !== undefined && (
          <span className="ml-auto">{elapsed}ms</span>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Meta bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-brick-800 shrink-0 gap-3">
        {showVertical ? (
          <span className="text-brick-500 text-xs shrink-0">
            vertical view · {selectedKeys.length} row{selectedKeys.length !== 1 ? 's' : ''}
          </span>
        ) : (
          <span className="text-brick-500 text-xs shrink-0">
            {result.rows.length} row{result.rows.length !== 1 ? 's' : ''}
            {elapsed !== undefined && ` · ${elapsed}ms`}
          </span>
        )}
        <div className="flex items-center gap-3 min-w-0">
          {result.editable && !result.editable.editable && (
            <span
              className="text-brick-500 text-[10px] uppercase tracking-widest border border-brick-800 px-2 py-0.5 truncate"
              title={result.editable.reason}
            >
              read-only · {result.editable.reason}
            </span>
          )}
          {showVertical ? (
            <button
              onClick={() => setShowVertical(false)}
              className="text-xs text-brick-400 hover:text-copper-500 uppercase tracking-widest transition-colors shrink-0"
            >
              ← table
            </button>
          ) : (
            selected.size > 0 && (
              <button
                onClick={() => setShowVertical(true)}
                className="text-xs text-brick-400 hover:text-copper-500 uppercase tracking-widest transition-colors shrink-0"
              >
                vertical view ({selected.size})
              </button>
            )
          )}
          {capNotice && (
            <span className="text-brick-600 text-[10px] uppercase tracking-widest shrink-0">
              max {MAX_COMPARE_ROWS} rows
            </span>
          )}
          <CopyMenu result={showVertical ? derivedResult : result} />
          <button
            onClick={() => downloadCsv(showVertical ? derivedResult : result)}
            className="text-xs text-brick-400 hover:text-copper-500 uppercase tracking-widest transition-colors shrink-0"
          >
            ↓ csv
          </button>
        </div>
      </div>

      {showVertical && selectedKeys.length > 0 ? (
        <VerticalView
          result={result}
          selectedKeys={selectedKeys}
          onRemove={removeFromSelection}
          editing={editing}
          draft={draft}
          setDraft={setDraft}
          saving={saving}
          startEdit={startEdit}
          cancelEdit={cancelEdit}
          commitEdit={commitEdit}
          errorFor={errorFor}
          openJsonModal={openJsonModal}
        />
      ) : (
        /* Table */
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs border-collapse min-w-max">
            <thead className="sticky top-0 bg-brick-900 z-10">
              <tr>
                <th className="border-b border-brick-800 w-11" />
                {result.columns.map((col, colIdx) => (
                  <th
                    key={colIdx}
                    className="text-left px-3 py-2 text-brick-400 uppercase tracking-widest font-normal border-b border-brick-800 whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, i) => {
                const key = keyFor(row, i)
                return (
                  <tr
                    key={key}
                    className={`border-b border-brick-800/50 ${selected.has(key) ? 'bg-copper-500/10' : ''}`}
                  >
                    <td className="p-0">
                      <label className="flex items-center justify-center h-full min-h-11 md:min-h-0 px-3 py-3 md:py-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected.has(key)}
                          onChange={() => toggleRow(key)}
                          className="w-4 h-4 accent-copper-500"
                        />
                      </label>
                    </td>
                    {result.columns.map((col, colIdx) => {
                      const val = row[col]
                      const editable = isColumnEditable(result, col)
                      const isJson = isJsonColumn(result, col)
                      return (
                        <EditableCell
                          key={colIdx}
                          value={val}
                          editable={editable}
                          isJson={isJson}
                          isEditing={editing?.rowKey === key && editing.column === col}
                          draft={draft}
                          error={errorFor(key, col)}
                          saving={saving}
                          onStartEdit={() => startEdit(key, col, val)}
                          onOpenJson={() => openJsonModal(key, col, editable, val)}
                          onChangeDraft={setDraft}
                          onCommit={commitEdit}
                          onCancel={cancelEdit}
                          className="px-3 py-3 md:py-1.5 whitespace-nowrap max-w-xs truncate"
                        />
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {jsonModal && (
        <JsonCellModal
          key={`${jsonModal.rowKey}:${jsonModal.column}`}
          column={jsonModal.column}
          value={jsonModal.value}
          editable={jsonModal.editable}
          saving={jsonSaving}
          error={jsonError}
          onSave={saveJsonModal}
          onClose={closeJsonModal}
        />
      )}
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import type { QueryResult } from '../api'
import VerticalView from './VerticalView'
import { formatCell, toCsv, toJson, toMarkdown, downloadCsv } from '../lib/resultExport'

const MAX_COMPARE_ROWS = 10

interface Props {
  result: QueryResult
  elapsed?: number
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

export default function ResultsTable({ result, elapsed }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [showVertical, setShowVertical] = useState(false)
  const [capNotice, setCapNotice] = useState(false)

  // Reset selection whenever a new query result arrives (row indices from a
  // previous result don't correspond to anything meaningful in a new one).
  const [prevResult, setPrevResult] = useState(result)
  if (prevResult !== result) {
    setPrevResult(result)
    setSelected(new Set())
    setShowVertical(false)
  }

  function toggleRow(i: number) {
    const next = new Set(selected)
    if (next.has(i)) {
      next.delete(i)
      if (next.size === 0) setShowVertical(false)
    } else {
      if (next.size >= MAX_COMPARE_ROWS) {
        setCapNotice(true)
        setTimeout(() => setCapNotice(false), 1500)
        return
      }
      next.add(i)
    }
    setSelected(next)
  }

  function removeFromSelection(i: number) {
    const next = new Set(selected)
    next.delete(i)
    setSelected(next)
    if (next.size === 0) setShowVertical(false)
  }

  const selectedIndices = [...selected].sort((a, b) => a - b)
  const derivedResult: QueryResult = {
    columns: result.columns,
    rows: selectedIndices.map((i) => result.rows[i]),
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
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-brick-800 shrink-0">
        {showVertical ? (
          <span className="text-brick-500 text-xs">
            vertical view · {selectedIndices.length} row{selectedIndices.length !== 1 ? 's' : ''}
          </span>
        ) : (
          <span className="text-brick-500 text-xs">
            {result.rows.length} row{result.rows.length !== 1 ? 's' : ''}
            {elapsed !== undefined && ` · ${elapsed}ms`}
          </span>
        )}
        <div className="flex items-center gap-3">
          {showVertical ? (
            <button
              onClick={() => setShowVertical(false)}
              className="text-xs text-brick-400 hover:text-copper-500 uppercase tracking-widest transition-colors"
            >
              ← table
            </button>
          ) : (
            selected.size > 0 && (
              <button
                onClick={() => setShowVertical(true)}
                className="text-xs text-brick-400 hover:text-copper-500 uppercase tracking-widest transition-colors"
              >
                vertical view ({selected.size})
              </button>
            )
          )}
          {capNotice && (
            <span className="text-brick-600 text-[10px] uppercase tracking-widest">
              max {MAX_COMPARE_ROWS} rows
            </span>
          )}
          <CopyMenu result={showVertical ? derivedResult : result} />
          <button
            onClick={() => downloadCsv(showVertical ? derivedResult : result)}
            className="text-xs text-brick-400 hover:text-copper-500 uppercase tracking-widest transition-colors"
          >
            ↓ csv
          </button>
        </div>
      </div>

      {showVertical && selectedIndices.length > 0 ? (
        <VerticalView
          result={result}
          selectedIndices={selectedIndices}
          onRemove={removeFromSelection}
        />
      ) : (
        /* Table */
        <div className="overflow-auto flex-1">
          <table className="w-full text-xs border-collapse min-w-max">
            <thead className="sticky top-0 bg-brick-900 z-10">
              <tr>
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
              {result.rows.map((row, i) => (
                <tr
                  key={i}
                  onClick={() => toggleRow(i)}
                  className={`border-b border-brick-800/50 hover:bg-brick-800/30 transition-colors cursor-pointer ${
                    selected.has(i) ? 'bg-copper-500/10' : ''
                  }`}
                >
                  {result.columns.map((col, colIdx) => {
                    const val = row[col]
                    const isNull = val === null || val === undefined
                    return (
                      <td
                        key={colIdx}
                        className={`px-3 py-1.5 whitespace-nowrap max-w-xs truncate ${
                          isNull ? 'text-brick-600 italic' : 'text-cream-100'
                        }`}
                        title={isNull ? 'NULL' : formatCell(val)}
                      >
                        {isNull ? 'NULL' : formatCell(val)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

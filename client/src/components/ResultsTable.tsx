import { useState, useRef, useEffect } from 'react'
import type { QueryResult } from '../api'

function formatCell(val: unknown): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

interface Props {
  result: QueryResult
  elapsed?: number
}

function toCsv(result: QueryResult): string {
  const header = result.columns.join(',')
  const rows = result.rows.map((row) =>
    result.columns
      .map((col) => {
        const val = formatCell(row[col])
        return val.includes(',') || val.includes('"') || val.includes('\n')
          ? `"${val.replace(/"/g, '""')}"`
          : val
      })
      .join(','),
  )
  return [header, ...rows].join('\n')
}

function toJson(result: QueryResult): string {
  return JSON.stringify(result.rows, null, 2)
}

function toMarkdown(result: QueryResult): string {
  const escape = (s: string) => s.replace(/\|/g, '\\|')
  const header = '| ' + result.columns.map(escape).join(' | ') + ' |'
  const sep = '| ' + result.columns.map(() => '---').join(' | ') + ' |'
  const rows = result.rows.map(
    (row) =>
      '| ' + result.columns.map((col) => escape(formatCell(row[col]))).join(' | ') + ' |',
  )
  return [header, sep, ...rows].join('\n')
}

function downloadCsv(result: QueryResult) {
  const csv = toCsv(result)
  const bom = new Uint8Array([0xef, 0xbb, 0xbf])
  const encoded = new TextEncoder().encode(csv)
  const blob = new Blob([bom, encoded], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `query-result-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const COPY_OPTIONS = [
  { label: 'CSV', fn: toCsv },
  { label: 'JSON', fn: toJson },
  { label: 'Markdown', fn: toMarkdown },
] as const

function CopyMenu({ result }: { result: QueryResult }) {
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
        <span className="text-brick-500 text-xs">
          {result.rows.length} row{result.rows.length !== 1 ? 's' : ''}
          {elapsed !== undefined && ` · ${elapsed}ms`}
        </span>
        <div className="flex items-center gap-3">
          <CopyMenu result={result} />
          <button
            onClick={() => downloadCsv(result)}
            className="text-xs text-brick-400 hover:text-copper-500 uppercase tracking-widest transition-colors"
          >
            ↓ csv
          </button>
        </div>
      </div>

      {/* Table */}
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
                className="border-b border-brick-800/50 hover:bg-brick-800/30 transition-colors"
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
    </div>
  )
}

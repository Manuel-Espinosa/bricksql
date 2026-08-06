import { useRef, useState } from 'react'
import type { QueryResult } from '../api'
import { formatCell } from '../lib/resultExport'

interface Props {
  result: QueryResult
  selectedIndices: number[]
  onRemove: (index: number) => void
}

const MIN_FIELD_WIDTH = 90
const MAX_FIELD_WIDTH = 220
const MIN_VALUE_WIDTH = 80
const MAX_VALUE_WIDTH = 400
const CHAR_WIDTH = 7
const CELL_PADDING = 32

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max)
}

function defaultFieldWidth(columns: string[]) {
  const longest = columns.reduce((m, c) => Math.max(m, c.length), 0)
  return clamp(longest * CHAR_WIDTH + CELL_PADDING, MIN_FIELD_WIDTH, MAX_FIELD_WIDTH)
}

function defaultValueWidth(result: QueryResult, rowIndex: number) {
  const row = result.rows[rowIndex]
  const longest = result.columns.reduce((m, col) => Math.max(m, formatCell(row[col]).length), 0)
  return clamp(longest * CHAR_WIDTH + CELL_PADDING, MIN_VALUE_WIDTH, MAX_VALUE_WIDTH)
}

export default function VerticalView({ result, selectedIndices, onRemove }: Props) {
  const [widths, setWidths] = useState<Record<string, number>>({})
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef<{ key: string; startX: number; startWidth: number; min: number } | null>(null)

  function widthFor(key: string, fallback: number) {
    return widths[key] ?? fallback
  }

  function startResize(e: React.PointerEvent, key: string, current: number, min: number) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { key, startX: e.clientX, startWidth: current, min }
    setDragging(true)
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current
    if (!drag) return
    const delta = e.clientX - drag.startX
    setWidths((prev) => ({ ...prev, [drag.key]: Math.max(drag.min, drag.startWidth + delta) }))
  }

  function endResize() {
    dragRef.current = null
    setDragging(false)
  }

  const fieldWidth = widthFor('field', defaultFieldWidth(result.columns))
  const valueWidths = selectedIndices.map((i) => widthFor(String(i), defaultValueWidth(result, i)))
  const totalWidth = fieldWidth + valueWidths.reduce((sum, w) => sum + w, 0)

  return (
    <div
      className={`overflow-auto flex-1 ${dragging ? 'select-none' : ''}`}
      onPointerMove={onPointerMove}
      onPointerUp={endResize}
      onPointerCancel={endResize}
    >
      <table className="border-collapse text-xs" style={{ tableLayout: 'fixed', width: totalWidth }}>
        <colgroup>
          <col style={{ width: fieldWidth }} />
          {selectedIndices.map((i, idx) => (
            <col key={i} style={{ width: valueWidths[idx] }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 bg-brick-900 z-10">
          <tr>
            <th className="relative text-left px-3 py-2 text-brick-400 uppercase tracking-widest font-normal border-b border-r border-brick-800 whitespace-nowrap overflow-hidden text-ellipsis">
              field
              <span
                onPointerDown={(e) => startResize(e, 'field', fieldWidth, MIN_FIELD_WIDTH)}
                className="absolute top-0 right-0 -mr-2 h-full w-4 cursor-col-resize touch-none"
              />
            </th>
            {selectedIndices.map((i, idx) => (
              <th
                key={i}
                className="relative text-left px-3 py-2 text-brick-400 uppercase tracking-widest font-normal border-b border-r border-brick-800 whitespace-nowrap overflow-hidden text-ellipsis"
                title={`Row #${i + 1}`}
              >
                row #{i + 1}
                <button
                  onClick={() => onRemove(i)}
                  className="ml-2 text-brick-500 hover:text-danger-400 transition-colors"
                >
                  ✕
                </button>
                <span
                  onPointerDown={(e) => startResize(e, String(i), valueWidths[idx], MIN_VALUE_WIDTH)}
                  className="absolute top-0 right-0 -mr-2 h-full w-4 cursor-col-resize touch-none"
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.columns.map((col) => (
            <tr key={col} className="border-b border-brick-800/50">
              <td
                className="relative px-3 py-1.5 text-brick-400 border-r border-brick-800 whitespace-nowrap overflow-hidden text-ellipsis"
                title={col}
              >
                {col}
                <span
                  onPointerDown={(e) => startResize(e, 'field', fieldWidth, MIN_FIELD_WIDTH)}
                  className="absolute top-0 right-0 -mr-2 h-full w-4 cursor-col-resize touch-none"
                />
              </td>
              {selectedIndices.map((i, idx) => {
                const val = result.rows[i][col]
                const isNull = val === null || val === undefined
                const formatted = isNull ? 'NULL' : formatCell(val)
                return (
                  <td
                    key={i}
                    className={`relative px-3 py-1.5 border-r border-brick-800 whitespace-nowrap overflow-hidden text-ellipsis ${
                      isNull ? 'text-brick-600 italic' : 'text-cream-100'
                    }`}
                    title={formatted}
                  >
                    {formatted}
                    <span
                      onPointerDown={(e) => startResize(e, String(i), valueWidths[idx], MIN_VALUE_WIDTH)}
                      className="absolute top-0 right-0 -mr-2 h-full w-4 cursor-col-resize touch-none"
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import { explorerApi } from '../../api'
import type { SelectedColumn } from './types'

interface Props {
  item: SelectedColumn
  connectionId: string
  availableTables: string[]
  onChange: (updated: SelectedColumn) => void
  onRemove: () => void
}

const selectCls =
  'bg-brick-950 border border-brick-700 text-cream-100 text-xs px-2 py-1 focus:outline-none focus:border-copper-500 transition-colors'

export default function SelectColumnBlock({ item, connectionId, availableTables, onChange, onRemove }: Props) {
  const colQuery = useQuery({
    queryKey: ['columns', connectionId, item.table],
    queryFn: () => explorerApi.describeTable(connectionId, item.table),
    enabled: !!item.table,
  })
  const columns = (colQuery.data ?? []).map((c) => c.name)

  function update(patch: Partial<SelectedColumn>) {
    onChange({ ...item, ...patch })
  }

  return (
    <div className="flex items-center gap-2 group">
      <select
        value={item.table}
        onChange={(e) => update({ table: e.target.value, column: '' })}
        className={selectCls}
      >
        <option value="">— table —</option>
        {availableTables.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <span className="text-brick-600 text-xs shrink-0">.</span>
      <select
        value={item.column}
        onChange={(e) => update({ column: e.target.value })}
        disabled={!item.table}
        className={`${selectCls} flex-1 disabled:opacity-40`}
      >
        <option value="">— column —</option>
        {columns.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <button
        onClick={onRemove}
        className="text-brick-600 hover:text-danger-400 text-xs transition-colors opacity-0 group-hover:opacity-100 shrink-0"
      >
        ×
      </button>
    </div>
  )
}

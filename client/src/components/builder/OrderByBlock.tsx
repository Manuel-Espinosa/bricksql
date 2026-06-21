import type { OrderByClause } from './types'
import BlockShell from './BlockShell'

interface Props {
  orderBy: OrderByClause
  columns: string[]
  onChange: (updated: OrderByClause) => void
  onRemove: () => void
}

const selectCls =
  'bg-brick-950 border border-brick-700 text-cream-100 text-xs px-2 py-1.5 focus:outline-none focus:border-copper-500 transition-colors w-full'

export default function OrderByBlock({ orderBy, columns, onChange, onRemove }: Props) {
  return (
    <BlockShell label="order by" accent="bg-brick-500" onRemove={onRemove}>
      <div className="flex gap-2">
        <select
          value={orderBy.column}
          onChange={(e) => onChange({ ...orderBy, column: e.target.value })}
          className={selectCls}
        >
          <option value="">— column —</option>
          {columns.map((col) => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>

        <div className="flex gap-1 shrink-0">
          {(['ASC', 'DESC'] as const).map((dir) => (
            <button
              key={dir}
              onClick={() => onChange({ ...orderBy, direction: dir })}
              className={`px-2 py-1.5 text-xs uppercase tracking-widest border transition-colors ${
                orderBy.direction === dir
                  ? 'bg-copper-500 border-copper-500 text-brick-950 font-medium'
                  : 'border-brick-700 text-brick-400 hover:border-brick-500'
              }`}
            >
              {dir}
            </button>
          ))}
        </div>
      </div>
    </BlockShell>
  )
}

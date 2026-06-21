import { useQuery } from '@tanstack/react-query'
import { explorerApi } from '../../api'
import type { JoinClause } from './types'
import BlockShell from './BlockShell'

interface Props {
  join: JoinClause
  connectionId: string
  fromTable: string
  allTables: string[]
  availableLeftColumns: string[]
  onChange: (updated: JoinClause) => void
  onRemove: () => void
}

const selectCls =
  'bg-brick-950 border border-brick-700 text-cream-100 text-xs px-2 py-1.5 focus:outline-none focus:border-copper-500 transition-colors w-full'

export default function JoinBlock({
  join,
  connectionId,
  fromTable,
  allTables,
  availableLeftColumns,
  onChange,
  onRemove,
}: Props) {
  const joinColumnsQuery = useQuery({
    queryKey: ['columns', connectionId, join.table],
    queryFn: () => explorerApi.describeTable(connectionId, join.table),
    enabled: !!join.table,
  })

  const joinColumns = (joinColumnsQuery.data ?? []).map((c) => `${join.table}.${c.name}`)

  function update(patch: Partial<JoinClause>) {
    onChange({ ...join, ...patch })
  }

  const joinTables = allTables.filter((t) => t !== fromTable)

  return (
    <BlockShell label="inner join" accent="bg-gold-300" onRemove={onRemove}>
      <div className="flex flex-col gap-2">
        <select
          value={join.table}
          onChange={(e) => update({ table: e.target.value, leftCol: '', rightCol: '' })}
          className={selectCls}
        >
          <option value="">— join table —</option>
          {joinTables.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {join.table && (
          <>
            <div className="flex items-center gap-2">
              <select
                value={join.leftCol}
                onChange={(e) => update({ leftCol: e.target.value })}
                className={selectCls}
              >
                <option value="">— left col —</option>
                {availableLeftColumns.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <span className="text-brick-500 text-xs shrink-0">=</span>
              <select
                value={join.rightCol}
                onChange={(e) => update({ rightCol: e.target.value })}
                className={selectCls}
              >
                <option value="">— right col —</option>
                {joinColumns.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>
    </BlockShell>
  )
}

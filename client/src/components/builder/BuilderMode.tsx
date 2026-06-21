import { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { useQuery, useQueries } from '@tanstack/react-query'
import { explorerApi } from '../../api'
import { generateSQL } from './sql-generator'
import { EMPTY_STATE } from './types'
import type { BuilderState, WhereCondition, JoinClause, SelectedColumn } from './types'
import FromBlock from './FromBlock'
import WhereBlock from './WhereBlock'
import JoinBlock from './JoinBlock'
import OrderByBlock from './OrderByBlock'
import LimitBlock from './LimitBlock'
import SelectColumnBlock from './SelectColumnBlock'

interface Props {
  connectionId: string
  onSwitchToRaw: (sql: string) => void
  onSqlChange?: (sql: string) => void
}

function newJoin(): JoinClause {
  return { id: uuidv4(), table: '', leftCol: '', rightCol: '' }
}

export default function BuilderMode({ connectionId, onSwitchToRaw, onSqlChange }: Props) {
  const [state, setState] = useState<BuilderState>(EMPTY_STATE)
  const [previewOpen, setPreviewOpen] = useState(false)

  const tablesQuery = useQuery({
    queryKey: ['tables', connectionId],
    queryFn: () => explorerApi.tables(connectionId),
  })

  const tables = tablesQuery.data ?? []

  const fromColumnsQuery = useQuery({
    queryKey: ['columns', connectionId, state.table],
    queryFn: () => explorerApi.describeTable(connectionId, state.table!),
    enabled: !!state.table,
  })

  const fromColumns = (fromColumnsQuery.data ?? []).map((c) => c.name)

  const joinedTableNames = [...new Set(state.joins.filter((j) => j.table).map((j) => j.table))]

  const joinTableColumnQueries = useQueries({
    queries: joinedTableNames.map((table) => ({
      queryKey: ['columns', connectionId, table],
      queryFn: () => explorerApi.describeTable(connectionId, table),
    })),
  })

  const allColumns = [
    ...(state.table ? fromColumns.map((c) => `${state.table}.${c}`) : []),
    ...joinedTableNames.flatMap((table, i) =>
      (joinTableColumnQueries[i].data ?? []).map((c) => `${table}.${c.name}`)
    ),
  ]

  // Auto-select first table when loaded
  useEffect(() => {
    if (!state.table && tables.length > 0) {
      setState((s) => ({ ...s, table: tables[0] }))
    }
  }, [tables, state.table])

  // Reset joins/conditions when table changes
  function setTable(table: string) {
    setState({ ...EMPTY_STATE, table })
  }

  const sql = generateSQL(state)

  const prevSqlRef = useRef<string>('')
  useEffect(() => {
    if (sql !== prevSqlRef.current) {
      prevSqlRef.current = sql
      onSqlChange?.(sql)
    }
  }, [sql, onSqlChange])

  function update(patch: Partial<BuilderState>) {
    setState((s) => ({ ...s, ...patch }))
  }

  function addCondition(connector: 'AND' | 'OR' = 'AND') {
    const cond: WhereCondition = { id: uuidv4(), connector, column: '', operator: '=', value: '' }
    update({ conditions: [...state.conditions, cond] })
  }

  function updateCondition(id: string, updated: WhereCondition) {
    update({ conditions: state.conditions.map((c) => (c.id === id ? updated : c)) })
  }

  function removeCondition(id: string) {
    update({ conditions: state.conditions.filter((c) => c.id !== id) })
  }

  function addJoin() {
    update({ joins: [...state.joins, newJoin()] })
  }

  function updateJoin(id: string, updated: JoinClause) {
    update({ joins: state.joins.map((j) => (j.id === id ? updated : j)) })
  }

  function removeJoin(id: string) {
    const join = state.joins.find((j) => j.id === id)
    const joins = state.joins.filter((j) => j.id !== id)
    const columns = join?.table
      ? state.columns.filter((c) => c.table !== join.table)
      : state.columns
    update({ joins, columns })
  }

  const availableTables = [
    ...(state.table ? [state.table] : []),
    ...state.joins.filter((j) => j.table).map((j) => j.table),
  ]

  function addColumn() {
    const col: SelectedColumn = { id: uuidv4(), table: state.table ?? '', column: '' }
    update({ columns: [...state.columns, col] })
  }

  function updateColumn(id: string, updated: SelectedColumn) {
    update({ columns: state.columns.map((c) => (c.id === id ? updated : c)) })
  }

  function removeColumn(id: string) {
    update({ columns: state.columns.filter((c) => c.id !== id) })
  }

  if (tablesQuery.isLoading) {
    return (
      <div className="p-4 text-brick-500 text-xs">
        loading tables<span className="cursor-blink" />
      </div>
    )
  }

  if (tables.length === 0) {
    return (
      <div className="p-4 text-brick-500 text-xs">
        no tables found — select a database first
      </div>
    )
  }

  const hasTable = !!state.table
  const columnsReady = hasTable && fromColumnsQuery.isSuccess
  const btnCls =
    'px-3 py-1.5 text-xs uppercase tracking-widest border border-brick-700 text-brick-400 hover:border-copper-500 hover:text-copper-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Scrollable blocks area */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-1.5">
        {/* SELECT */}
        <div className="flex gap-0">
          <div className="w-0.5 bg-brick-700 shrink-0" />
          <div className="flex-1 bg-brick-900 border border-l-0 border-brick-800 px-3 py-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-brick-500 text-xs uppercase tracking-widest">select</span>
              {hasTable && (
                <button
                  onClick={addColumn}
                  disabled={!columnsReady}
                  className="text-xs text-brick-400 hover:text-copper-500 disabled:opacity-40 transition-colors uppercase tracking-widest"
                >
                  + column
                </button>
              )}
            </div>
            {state.columns.length === 0 ? (
              <span className="text-copper-300 text-xs">*</span>
            ) : (
              <div className="space-y-1.5">
                {state.columns.map((col) => (
                  <SelectColumnBlock
                    key={col.id}
                    item={col}
                    connectionId={connectionId}
                    availableTables={availableTables}
                    onChange={(updated) => updateColumn(col.id, updated)}
                    onRemove={() => removeColumn(col.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* FROM */}
        <FromBlock table={state.table ?? tables[0]} tables={tables} onChange={setTable} />

        {/* JOINs */}
        {state.joins.map((join) => (
          <JoinBlock
            key={join.id}
            join={join}
            connectionId={connectionId}
            fromTable={state.table!}
            allTables={tables}
            availableLeftColumns={allColumns}
            onChange={(updated) => updateJoin(join.id, updated)}
            onRemove={() => removeJoin(join.id)}
          />
        ))}

        {/* WHERE conditions */}
        {state.conditions.map((cond, i) => (
          <WhereBlock
            key={cond.id}
            condition={cond}
            index={i}
            columns={allColumns}
            onChange={(updated) => updateCondition(cond.id, updated)}
            onRemove={() => removeCondition(cond.id)}
          />
        ))}

        {/* ORDER BY */}
        {state.orderBy && (
          <OrderByBlock
            orderBy={state.orderBy}
            columns={fromColumns}
            onChange={(updated) => update({ orderBy: updated })}
            onRemove={() => update({ orderBy: null })}
          />
        )}

        {/* LIMIT */}
        {state.limit !== '' && (
          <LimitBlock
            value={state.limit}
            onChange={(v) => update({ limit: v })}
            onRemove={() => update({ limit: '' })}
          />
        )}

        {/* Add block buttons */}
        {hasTable && (
          <div className="flex flex-wrap gap-2 pt-2">
            {state.conditions.length === 0 ? (
              <button onClick={() => addCondition('AND')} disabled={!columnsReady} className={btnCls}>+ where</button>
            ) : (
              <>
                <button onClick={() => addCondition('AND')} disabled={!columnsReady} className={btnCls}>+ and</button>
                <button onClick={() => addCondition('OR')} disabled={!columnsReady} className={btnCls}>+ or</button>
              </>
            )}
            <button onClick={addJoin} disabled={!columnsReady} className={btnCls}>+ join</button>
            {!state.orderBy && (
              <button onClick={() => update({ orderBy: { column: '', direction: 'ASC' } })} disabled={!columnsReady} className={btnCls}>
                + order by
              </button>
            )}
            {state.limit === '' && (
              <button onClick={() => update({ limit: '100' })} className={btnCls}>
                + limit
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer: SQL preview + Run */}
      <div className="border-t border-brick-800 shrink-0">
        <button
          onClick={() => setPreviewOpen((o) => !o)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs text-brick-400 hover:text-brick-300 transition-colors"
        >
          <span className="uppercase tracking-widest">sql preview</span>
          <span>{previewOpen ? '▾' : '▸'}</span>
        </button>

        {previewOpen && sql && (
          <pre className="px-3 pb-2 text-xs text-cream-200 leading-relaxed overflow-x-auto whitespace-pre-wrap border-t border-brick-800 pt-2">
            {sql}
          </pre>
        )}

        <div className="px-3 pb-3">
          <button
            onClick={() => onSwitchToRaw(sql)}
            disabled={!sql}
            className="w-full py-2 text-xs uppercase tracking-widest border border-brick-700 text-brick-400 hover:border-brick-500 hover:text-cream-200 disabled:opacity-40 transition-colors"
          >
            → edit in raw mode
          </button>
        </div>
      </div>
    </div>
  )
}

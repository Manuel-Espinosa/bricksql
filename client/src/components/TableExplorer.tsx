import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { explorerApi, connectionsApi, type TableColumn } from '../api'
import { useQueryClient } from '@tanstack/react-query'

interface Props {
  connectionId: string
  hasDatabase: boolean
  onSelectTable: (sql: string) => void
}

export default function TableExplorer({ connectionId, hasDatabase, onSelectTable }: Props) {
  const qc = useQueryClient()
  const [expandedTable, setExpandedTable] = useState<string | null>(null)

  const dbQuery = useQuery({
    queryKey: ['databases', connectionId],
    queryFn: () => explorerApi.databases(connectionId),
    enabled: !hasDatabase,
  })

  const tablesQuery = useQuery({
    queryKey: ['tables', connectionId],
    queryFn: () => explorerApi.tables(connectionId),
    enabled: hasDatabase,
  })

  const columnsQuery = useQuery<TableColumn[]>({
    queryKey: ['columns', connectionId, expandedTable],
    queryFn: () => explorerApi.describeTable(connectionId, expandedTable!),
    enabled: !!expandedTable,
  })

  async function selectDatabase(database: string) {
    await connectionsApi.setDatabase(connectionId, database)
    qc.invalidateQueries({ queryKey: ['connections'] })
    qc.invalidateQueries({ queryKey: ['tables', connectionId] })
    qc.invalidateQueries({ queryKey: ['databases', connectionId] })
  }

  if (!hasDatabase) {
    return (
      <div className="p-3">
        <p className="text-brick-400 text-xs mb-3">select a database</p>
        {dbQuery.isLoading ? (
          <span className="text-brick-500 text-xs">loading<span className="cursor-blink" /></span>
        ) : (
          <ul className="space-y-0.5">
            {(dbQuery.data ?? []).map((db) => (
              <li key={db}>
                <button
                  onClick={() => selectDatabase(db)}
                  className="w-full text-left px-2 py-1.5 text-xs text-cream-200 hover:bg-brick-800 hover:text-copper-400 transition-colors"
                >
                  {db}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  if (tablesQuery.isLoading) {
    return (
      <div className="p-3 text-brick-500 text-xs">
        loading<span className="cursor-blink" />
      </div>
    )
  }

  const tables = tablesQuery.data ?? []

  return (
    <div className="overflow-y-auto">
      {tables.length === 0 ? (
        <p className="text-brick-500 text-xs p-3">no tables found</p>
      ) : (
        <ul>
          {tables.map((table) => (
            <li key={table} className="border-b border-brick-800/50 last:border-0">
              <div className="flex items-center">
                <button
                  onClick={() => setExpandedTable(expandedTable === table ? null : table)}
                  className="flex-1 text-left px-3 py-2 text-xs text-cream-200 hover:text-copper-400 flex items-center gap-1.5 transition-colors"
                >
                  <span className="text-brick-500 text-xs w-3">
                    {expandedTable === table ? '▾' : '▸'}
                  </span>
                  {table}
                </button>
                <button
                  onClick={() => onSelectTable(`SELECT * FROM ${table}`)}
                  className="px-2 py-2 text-brick-500 hover:text-copper-500 text-xs transition-colors"
                  title="Quick SELECT"
                >
                  ▶
                </button>
              </div>

              {expandedTable === table && (
                <div className="bg-brick-950/50 pb-1">
                  {columnsQuery.isLoading ? (
                    <p className="text-brick-500 text-xs px-6 py-1">...</p>
                  ) : (
                    (columnsQuery.data ?? []).map((col) => (
                      <div key={col.name} className="flex items-baseline gap-2 px-6 py-0.5">
                        <span className="text-cream-200 text-xs">{col.name}</span>
                        <span className="text-brick-500 text-xs truncate">{col.type}</span>
                        {col.nullable && (
                          <span className="text-brick-600 text-xs">?</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

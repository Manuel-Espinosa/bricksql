import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { snapshotsApi } from '../api'
import ResultsTable from '../components/ResultsTable'

export default function SnapshotPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, error } = useQuery({
    queryKey: ['snapshot', id],
    queryFn: () => snapshotsApi.get(id!),
    retry: false,
  })

  return (
    <div className="min-h-screen bg-brick-950 flex flex-col">
      <header className="border-b border-brick-800 px-4 py-3 flex items-center justify-between">
        <Link
          to="/connections"
          className="text-copper-500 text-sm font-medium tracking-widest uppercase"
        >
          brick<span className="text-cream-100">sql</span>
        </Link>
        <span className="text-brick-500 text-xs uppercase tracking-widest">
          mcp result
        </span>
      </header>

      <main className="flex-1 px-4 py-4 min-w-0">
        {isLoading && (
          <p className="text-brick-500 text-xs">
            loading<span className="cursor-blink" />
          </p>
        )}
        {error && (
          <p className="text-danger-400 text-xs">
            {(error as Error).message}. Snapshots are kept for 24 hours.
          </p>
        )}
        {data && (
          <div className="space-y-3">
            <div className="text-xs space-y-1">
              <div className="text-cream-200">{data.connectionName}</div>
              <pre className="text-brick-400 whitespace-pre-wrap break-words">
                {data.sql}
              </pre>
              <div className="text-brick-600">
                {data.rows.length} rows
                {data.capped && ' (capped — more rows exist in the database)'}
                {' · expires '}
                {new Date(data.expiresAt).toLocaleString()}
              </div>
            </div>
            <div className="border border-brick-800 bg-brick-900">
              <ResultsTable
                result={{ ...data, editable: { editable: false } }}
                connectionId=""
                queryRunId={0}
                onRefresh={async () => data}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

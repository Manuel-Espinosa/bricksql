import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { connectionsApi, type Connection } from '../api'
import { useAuth } from '../context/AuthContext'
import ConnectionForm from '../components/ConnectionForm'

type Modal = { type: 'create' } | { type: 'edit'; connection: Connection } | null

export default function ConnectionsPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [modal, setModal] = useState<Modal>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; message?: string }>>({})

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: connectionsApi.list,
  })

  const createMutation = useMutation({
    mutationFn: connectionsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['connections'] })
      setModal(null)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<Connection, 'id'>> }) =>
      connectionsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['connections'] })
      setModal(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: connectionsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['connections'] }),
  })

  async function handleTest(id: string) {
    setTestingId(id)
    try {
      const result = await connectionsApi.test(id)
      setTestResult((prev) => ({ ...prev, [id]: result }))
    } finally {
      setTestingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-brick-950 flex flex-col">
      {/* Topbar */}
      <header className="border-b border-brick-800 px-4 py-3 flex items-center justify-between">
        <div className="text-copper-500 text-sm font-medium tracking-widest uppercase">
          brick<span className="text-cream-100">sql</span>
        </div>
        <button
          onClick={logout}
          className="text-brick-500 hover:text-brick-400 text-xs uppercase tracking-widest transition-colors"
        >
          logout
        </button>
      </header>

      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-cream-200 text-sm uppercase tracking-widest">
            connections
          </h1>
          <button
            onClick={() => setModal({ type: 'create' })}
            className="text-xs uppercase tracking-widest px-3 py-1.5 bg-copper-500 hover:bg-copper-400 text-brick-950 font-medium transition-colors"
          >
            + new
          </button>
        </div>

        {isLoading ? (
          <div className="text-brick-500 text-xs py-8 text-center">
            loading<span className="cursor-blink" />
          </div>
        ) : connections.length === 0 ? (
          <div className="border border-brick-800 border-dashed p-8 text-center">
            <p className="text-brick-500 text-xs">no connections yet</p>
            <p className="text-brick-600 text-xs mt-1">
              create one to get started
            </p>
          </div>
        ) : (
          <ul className="space-y-1">
            {connections.map((conn) => (
              <li
                key={conn.id}
                className="border border-brick-800 hover:border-brick-700 bg-brick-900 transition-colors"
              >
                <div className="px-4 py-3 flex items-center gap-3">
                  {/* Engine badge */}
                  <span className="text-copper-500 text-xs uppercase tracking-wider w-8 shrink-0">
                    {conn.engine === 'postgres' ? 'pg' : 'my'}
                  </span>

                  {/* Info */}
                  <button
                    className="flex-1 text-left min-w-0"
                    onClick={() => navigate(`/workspace/${conn.id}`)}
                  >
                    <div className="text-cream-100 text-sm truncate">
                      {conn.name}
                    </div>
                    <div className="text-brick-500 text-xs truncate mt-0.5">
                      {conn.user}@{conn.host}:{conn.port}
                      {conn.database ? `/${conn.database}` : ''}
                    </div>
                  </button>

                  {/* Test result */}
                  {testResult[conn.id] && (
                    <span
                      className={`text-xs shrink-0 ${testResult[conn.id].ok ? 'text-success-400' : 'text-danger-400'}`}
                    >
                      {testResult[conn.id].ok ? '✓ ok' : '✗ fail'}
                    </span>
                  )}

                  {/* Actions */}
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleTest(conn.id)}
                      disabled={testingId === conn.id}
                      className="px-2 py-1 text-xs text-brick-400 hover:text-copper-500 transition-colors disabled:opacity-50"
                      title="Test connection"
                    >
                      {testingId === conn.id ? '...' : '⚡'}
                    </button>
                    <button
                      onClick={() => setModal({ type: 'edit', connection: conn })}
                      className="px-2 py-1 text-xs text-brick-400 hover:text-cream-200 transition-colors"
                      title="Edit"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${conn.name}"? This will also delete all saved queries.`))
                          deleteMutation.mutate(conn.id)
                      }}
                      className="px-2 py-1 text-xs text-brick-400 hover:text-danger-400 transition-colors"
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-brick-950/90 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm bg-brick-900 border border-brick-700 p-5">
            <h2 className="text-cream-200 text-xs uppercase tracking-widest mb-4">
              {modal.type === 'create' ? 'new connection' : 'edit connection'}
            </h2>
            <ConnectionForm
              initial={modal.type === 'edit' ? modal.connection : undefined}
              onSubmit={async (data) => {
                if (modal.type === 'create') {
                  await createMutation.mutateAsync(data)
                } else {
                  await updateMutation.mutateAsync({ id: modal.connection.id, data })
                }
              }}
              onCancel={() => setModal(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

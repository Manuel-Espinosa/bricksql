import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { connectionsApi, queryApi, savedQueriesApi, type QueryResult } from '../api'
import TableExplorer from '../components/TableExplorer'
import ResultsTable from '../components/ResultsTable'
import BuilderMode from '../components/builder/BuilderMode'
import { useAuth } from '../context/AuthContext'

type Tab = 'explorer' | 'editor' | 'saved'
type EditorMode = 'raw' | 'builder' | 'ai'
type Panel = 'explorer' | 'results'

export default function WorkspacePage() {
  const { id: connectionId } = useParams<{ id: string }>()!
  const navigate = useNavigate()
  const { logout } = useAuth()

  const [mobileTab, setMobileTab] = useState<Tab>('editor')
  const [editorMode, setEditorMode] = useState<EditorMode>('raw')
  const [sql, setSql] = useState('')
  const [result, setResult] = useState<QueryResult | null>(null)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState<number | undefined>()
  const [, setDesktopRight] = useState<Panel>('results')
  const [desktopLeft, setDesktopLeft] = useState<'tables' | 'saved'>('tables')
  const [mobileResultsExpanded, setMobileResultsExpanded] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const saveInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const { data: connection } = useQuery({
    queryKey: ['connections', connectionId],
    queryFn: () => connectionsApi.get(connectionId!),
    enabled: !!connectionId,
  })

  async function runQuery() {
    if (!sql.trim() || !connectionId) return
    setRunning(true)
    setError('')
    setMobileResultsExpanded(false)
    const t0 = Date.now()
    try {
      const res = await queryApi.execute(connectionId, sql)
      setResult(res)
      setElapsed(Date.now() - t0)
      setMobileTab('editor')
      setDesktopRight('results')
      setMobileResultsExpanded(true)
    } catch (err) {
      setError((err as Error).message)
      setResult(null)
      setMobileResultsExpanded(true)
    } finally {
      setRunning(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      runQuery()
    }
  }

  function openSave() {
    setSaveName('')
    setSaveOpen(true)
    setTimeout(() => saveInputRef.current?.focus(), 0)
  }

  async function saveQuery() {
    if (!saveName.trim() || !sql.trim() || !connectionId) return
    setSaving(true)
    try {
      await savedQueriesApi.create(connectionId, { name: saveName.trim(), sql })
      queryClient.invalidateQueries({ queryKey: ['saved-queries', connectionId] })
      setSaveOpen(false)
      setSaveName('')
      setDesktopLeft('saved')
    } finally {
      setSaving(false)
    }
  }

  function handleSaveKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') saveQuery()
    if (e.key === 'Escape') setSaveOpen(false)
  }

  function loadSql(query: string) {
    setSql(query)
    setEditorMode('raw')
    setMobileTab('editor')
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const hasDatabase = !!connection?.database

  return (
    <div className="h-[100dvh] bg-brick-950 flex flex-col">
      {/* Topbar */}
      <header className="border-b border-brick-800 px-3 py-2 flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate('/connections')}
          className="text-brick-500 hover:text-brick-400 text-xs transition-colors"
        >
          ←
        </button>
        <div className="text-copper-500 text-xs font-medium tracking-widest uppercase hidden sm:block">
          brick<span className="text-cream-100">sql</span>
        </div>
        <div className="flex-1 min-w-0">
          {connection ? (
            <span className="text-cream-200 text-xs truncate block">
              <span className="text-brick-500">
                {connection.engine === 'postgres' ? 'pg' : 'my'}
                {' · '}
              </span>
              {connection.name}
              {connection.database && (
                <span className="text-brick-500"> / {connection.database}</span>
              )}
            </span>
          ) : (
            <span className="text-brick-500 text-xs">loading...</span>
          )}
        </div>
        <button
          onClick={logout}
          className="text-brick-600 hover:text-brick-500 text-xs transition-colors"
        >
          logout
        </button>
      </header>

      {/* ─── Desktop layout (md+) ─── */}
      <div className="hidden md:flex flex-1 min-h-0">
        {/* Left: Explorer / Saved */}
        <aside className="w-56 border-r border-brick-800 flex flex-col shrink-0">
          <div className="border-b border-brick-800 flex shrink-0">
            {(['tables', 'saved'] as const).map((panel) => (
              <button
                key={panel}
                onClick={() => setDesktopLeft(panel)}
                className={`flex-1 px-3 py-2 text-xs uppercase tracking-widest border-r border-brick-800 last:border-0 transition-colors ${
                  desktopLeft === panel
                    ? 'text-brick-300 bg-brick-900'
                    : 'text-brick-500 hover:text-brick-400'
                }`}
              >
                {panel}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {desktopLeft === 'tables' && connection && (
              <TableExplorer
                connectionId={connectionId!}
                hasDatabase={hasDatabase}
                onSelectTable={loadSql}
              />
            )}
            {desktopLeft === 'saved' && (
              <SavedQueriesPanel connectionId={connectionId!} currentSql={sql} onLoad={loadSql} />
            )}
          </div>
        </aside>

        {/* Center: Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mode tabs */}
          <div className="border-b border-brick-800 flex shrink-0">
            {(['raw', 'builder', 'ai'] as EditorMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setEditorMode(mode)}
                className={`px-4 py-2 text-xs uppercase tracking-widest border-r border-brick-800 transition-colors ${
                  editorMode === mode
                    ? 'text-copper-500 bg-brick-900'
                    : 'text-brick-500 hover:text-brick-400'
                }`}
              >
                {editorMode === mode && (
                  <span className="inline-block w-1.5 h-1.5 bg-copper-500 mr-1.5 align-middle" />
                )}
                {mode}
              </button>
            ))}
            <div className="flex-1" />
            {saveOpen ? (
              <div className="flex items-center border-l border-brick-800">
                <input
                  ref={saveInputRef}
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={handleSaveKeyDown}
                  placeholder="query name"
                  className="bg-transparent text-cream-100 text-xs px-3 py-2 focus:outline-none placeholder:text-brick-600 w-36"
                />
                <button
                  onClick={saveQuery}
                  disabled={saving || !saveName.trim()}
                  className="px-3 py-2 text-xs text-copper-500 hover:text-copper-400 disabled:text-brick-600 border-l border-brick-800 transition-colors"
                >
                  {saving ? '...' : '✓'}
                </button>
                <button
                  onClick={() => setSaveOpen(false)}
                  className="px-3 py-2 text-xs text-brick-500 hover:text-brick-400 border-l border-brick-800 transition-colors"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={openSave}
                disabled={!sql.trim()}
                className="px-4 py-2 text-xs uppercase tracking-widest text-brick-400 hover:text-brick-300 disabled:text-brick-600 border-l border-brick-800 transition-colors"
              >
                save
              </button>
            )}
            <button
              onClick={runQuery}
              disabled={running || !sql.trim()}
              className="px-4 py-2 text-xs uppercase tracking-widest text-copper-500 hover:text-copper-400 disabled:text-brick-600 border-l border-brick-800 transition-colors font-medium"
            >
              {running ? 'running...' : 'run  ⌘↵'}
            </button>
          </div>

          {/* Editor area */}
          <div className="flex-1 relative">
            {editorMode === 'raw' && (
              <textarea
                ref={textareaRef}
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="SELECT * FROM ..."
                className="absolute inset-0 w-full h-full bg-transparent text-cream-100 text-xs p-4 resize-none focus:outline-none placeholder:text-brick-600 leading-relaxed"
                spellCheck={false}
              />
            )}
            {editorMode === 'builder' && (
              <BuilderMode connectionId={connectionId!} onSwitchToRaw={(s) => { setSql(s); setEditorMode('raw') }} onSqlChange={setSql} />
            )}
            {editorMode === 'ai' && (
              <AiPlaceholder connectionId={connectionId!} onSqlGenerated={loadSql} />
            )}
          </div>
        </div>

        {/* Right: Results */}
        <div className="w-[45%] border-l border-brick-800 flex flex-col min-w-0">
          <div className="border-b border-brick-800 px-3 py-2 shrink-0 flex gap-3">
            <span className="text-brick-400 text-xs uppercase tracking-widest">results</span>
          </div>
          <div className="flex-1 overflow-hidden">
            {error && (
              <div className="p-4 text-danger-400 text-xs border-b border-danger-500/20 bg-danger-500/5">
                {error}
              </div>
            )}
            {result && <ResultsTable result={result} elapsed={elapsed} />}
            {!result && !error && (
              <p className="text-brick-600 text-xs p-4">
                run a query to see results
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Mobile layout ─── */}
      <div className="flex md:hidden flex-1 min-h-0 flex-col">
        {/* Tab content */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {mobileTab === 'explorer' && connection && (
            <div className="h-full overflow-y-auto">
              <TableExplorer
                connectionId={connectionId!}
                hasDatabase={hasDatabase}
                onSelectTable={loadSql}
              />
            </div>
          )}

          {mobileTab === 'editor' && (
            <div className="h-full flex flex-col">
              {/* Mode tabs */}
              <div className="border-b border-brick-800 flex shrink-0">
                {(['raw', 'builder', 'ai'] as EditorMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setEditorMode(mode)}
                    className={`flex-1 py-2 text-xs uppercase tracking-widest border-r border-brick-800 last:border-0 transition-colors ${
                      editorMode === mode
                        ? 'text-copper-500 bg-brick-900'
                        : 'text-brick-500'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {/* Editor */}
              {!mobileResultsExpanded && (
                <div className="flex-1 relative min-h-0">
                  {editorMode === 'raw' && (
                    <textarea
                      ref={textareaRef}
                      value={sql}
                      onChange={(e) => setSql(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="SELECT * FROM ..."
                      className="absolute inset-0 w-full h-full bg-transparent text-cream-100 text-xs p-4 resize-none focus:outline-none placeholder:text-brick-600 leading-relaxed"
                      spellCheck={false}
                    />
                  )}
                  {editorMode === 'builder' && (
                    <BuilderMode connectionId={connectionId!} onSwitchToRaw={(s) => { setSql(s); setEditorMode('raw') }} onSqlChange={setSql} />
                  )}
                  {editorMode === 'ai' && (
                    <AiPlaceholder connectionId={connectionId!} onSqlGenerated={loadSql} />
                  )}
                </div>
              )}

              {/* Results toggle + content */}
              {(error || result) && (
                <>
                  <button
                    onClick={() => setMobileResultsExpanded((v) => !v)}
                    className="border-t border-brick-800 px-3 py-2 flex items-center justify-between shrink-0 w-full text-left hover:bg-brick-800/30 transition-colors"
                  >
                    <span className="text-brick-400 text-xs uppercase tracking-widest">results</span>
                    <span className="text-brick-500 text-xs">{mobileResultsExpanded ? '▴ show editor' : '▾ expand'}</span>
                  </button>
                  <div className={`overflow-auto shrink-0 ${mobileResultsExpanded ? 'flex-1' : 'max-h-48'}`}>
                    {error && <div className="p-3 text-danger-400 text-xs">{error}</div>}
                    {result && <ResultsTable result={result} elapsed={elapsed} />}
                  </div>
                </>
              )}

              {/* Save + Run */}
              <div className="border-t border-brick-800 px-3 py-2 shrink-0 flex flex-col gap-2">
                {saveOpen && (
                  <div className="flex gap-2">
                    <input
                      ref={saveInputRef}
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      onKeyDown={handleSaveKeyDown}
                      placeholder="query name"
                      className="flex-1 bg-brick-900 border border-brick-700 text-cream-100 text-xs px-2 py-1.5 focus:outline-none focus:border-copper-500 placeholder:text-brick-600"
                    />
                    <button
                      onClick={saveQuery}
                      disabled={saving || !saveName.trim()}
                      className="px-3 py-1.5 text-xs text-copper-500 border border-brick-700 hover:border-copper-500 disabled:text-brick-600 transition-colors"
                    >
                      {saving ? '...' : '✓'}
                    </button>
                    <button
                      onClick={() => setSaveOpen(false)}
                      className="px-3 py-1.5 text-xs text-brick-500 border border-brick-700 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={openSave}
                    disabled={!sql.trim()}
                    className="py-2.5 px-4 text-xs uppercase tracking-widest border border-brick-700 text-brick-400 hover:border-brick-500 hover:text-cream-200 disabled:opacity-40 transition-colors"
                  >
                    save
                  </button>
                  <button
                    onClick={runQuery}
                    disabled={running || !sql.trim()}
                    className="flex-1 py-2.5 text-xs uppercase tracking-widest bg-copper-500 hover:bg-copper-400 disabled:bg-brick-800 disabled:text-brick-600 text-brick-950 font-medium transition-colors"
                  >
                    {running ? 'running...' : 'run query'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {mobileTab === 'saved' && (
            <SavedQueriesPanel connectionId={connectionId!} currentSql={sql} onLoad={loadSql} />
          )}
        </div>

        {/* Bottom tab bar */}
        <nav className="border-t border-brick-800 flex shrink-0">
          {([['explorer', '⊞'], ['editor', '≡'], ['saved', '★']] as const).map(
            ([tab, icon]) => (
              <button
                key={tab}
                onClick={() => setMobileTab(tab as Tab)}
                className={`flex-1 py-3 text-xs uppercase tracking-widest flex flex-col items-center gap-0.5 transition-colors ${
                  mobileTab === tab
                    ? 'text-copper-500'
                    : 'text-brick-500 hover:text-brick-400'
                }`}
              >
                <span>{icon}</span>
                <span className="text-[10px]">{tab}</span>
              </button>
            ),
          )}
        </nav>
      </div>
    </div>
  )
}


function AiPlaceholder({
  connectionId: _connectionId,
  onSqlGenerated: _onSqlGenerated,
}: {
  connectionId: string
  onSqlGenerated: (sql: string) => void
}) {
  return (
    <div className="p-6 text-center">
      <p className="text-brick-500 text-xs mb-2">ai mode — prompt to sql</p>
      <p className="text-brick-600 text-xs">
        configure <code className="text-copper-500">OLLAMA_URL</code> and{' '}
        <code className="text-copper-500">OLLAMA_MODEL</code> to enable
      </p>
    </div>
  )
}

function SavedQueriesPanel({
  connectionId,
  currentSql: _currentSql,
  onLoad,
}: {
  connectionId: string
  currentSql: string
  onLoad: (sql: string) => void
}) {
  const { data: queries = [], isLoading } = useQuery({
    queryKey: ['saved-queries', connectionId],
    queryFn: () => savedQueriesApi.list(connectionId),
  })

  if (isLoading) {
    return (
      <div className="p-4 text-brick-500 text-xs">
        loading<span className="cursor-blink" />
      </div>
    )
  }

  return (
    <div className="overflow-y-auto h-full">
      {queries.length === 0 ? (
        <p className="text-brick-600 text-xs p-4">no saved queries</p>
      ) : (
        <ul>
          {queries.map((q) => (
            <li key={q.id} className="border-b border-brick-800/50">
              <button
                onClick={() => onLoad(q.sql)}
                className="w-full text-left px-4 py-3 hover:bg-brick-800/30 transition-colors"
              >
                <div className="text-cream-200 text-xs">{q.name}</div>
                <div className="text-brick-500 text-xs truncate mt-0.5">{q.sql}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

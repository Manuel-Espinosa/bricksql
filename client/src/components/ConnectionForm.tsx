import { type FormEvent, useState } from 'react'
import type { Connection } from '../api'
import { connectionsApi } from '../api'

interface Props {
  initial?: Partial<Connection>
  onSubmit: (data: Omit<Connection, 'id'>) => Promise<void>
  onCancel: () => void
}

const DEFAULT_PORTS = { mysql: 3306, postgres: 5432 }

export default function ConnectionForm({ initial, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [engine, setEngine] = useState<'mysql' | 'postgres'>(
    initial?.engine ?? 'postgres',
  )
  const [host, setHost] = useState(initial?.host ?? 'localhost')
  const [port, setPort] = useState(initial?.port ?? DEFAULT_PORTS['postgres'])
  const [user, setUser] = useState(initial?.user ?? '')
  const [password, setPassword] = useState(initial?.password ?? '')
  const [database, setDatabase] = useState(initial?.database ?? '')
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message?: string } | null>(null)
  const [error, setError] = useState('')

  function clearTestResult() {
    setTestResult(null)
  }

  function handleEngineChange(e: 'mysql' | 'postgres') {
    setEngine(e)
    if (!initial?.port) setPort(DEFAULT_PORTS[e])
    clearTestResult()
  }

  async function handleTest() {
    setError('')
    setTestResult(null)
    setTesting(true)
    try {
      const result = await connectionsApi.testPayload({
        name,
        engine,
        host,
        port,
        user,
        password,
        database: database || undefined,
      })
      setTestResult(result)
    } catch (err) {
      setTestResult({ ok: false, message: (err as Error).message })
    } finally {
      setTesting(false)
    }
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onSubmit({
        name,
        engine,
        host,
        port,
        user,
        password,
        database: database || undefined,
      })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const inputCls =
    'w-full bg-brick-950 border border-brick-700 text-cream-100 px-3 py-2 text-xs focus:outline-none focus:border-copper-500 transition-colors placeholder:text-brick-500'
  const labelCls = 'block text-brick-400 text-xs uppercase tracking-widest mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className={labelCls}>name</label>
        <input
          className={inputCls}
          value={name}
          onChange={(e) => { setName(e.target.value); clearTestResult() }}
          placeholder="my database"
          required
          disabled={loading}
        />
      </div>

      <div>
        <label className={labelCls}>engine</label>
        <div className="flex gap-2">
          {(['postgres', 'mysql'] as const).map((eng) => (
            <button
              key={eng}
              type="button"
              onClick={() => handleEngineChange(eng)}
              className={`flex-1 py-2 text-xs uppercase tracking-widest border transition-colors ${
                engine === eng
                  ? 'bg-copper-500 border-copper-500 text-brick-950 font-medium'
                  : 'bg-brick-950 border-brick-700 text-brick-400 hover:border-brick-500'
              }`}
            >
              {eng}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className={labelCls}>host</label>
          <input
            className={inputCls}
            value={host}
            onChange={(e) => { setHost(e.target.value); clearTestResult() }}
            placeholder="localhost"
            required
            disabled={loading}
          />
        </div>
        <div>
          <label className={labelCls}>port</label>
          <input
            className={inputCls}
            type="number"
            value={port}
            onChange={(e) => { setPort(Number(e.target.value)); clearTestResult() }}
            required
            disabled={loading}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>user</label>
          <input
            className={inputCls}
            value={user}
            onChange={(e) => { setUser(e.target.value); clearTestResult() }}
            placeholder="root"
            required
            disabled={loading}
          />
        </div>
        <div>
          <label className={labelCls}>password</label>
          <input
            className={inputCls}
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearTestResult() }}
            placeholder="••••••"
            required
            disabled={loading}
          />
        </div>
      </div>

      <div>
        <label className={labelCls}>database <span className="normal-case text-brick-500">(optional)</span></label>
        <input
          className={inputCls}
          value={database}
          onChange={(e) => { setDatabase(e.target.value); clearTestResult() }}
          placeholder="leave empty to select later"
          disabled={loading}
        />
      </div>

      {error && (
        <p className="text-danger-400 text-xs border border-danger-500/30 bg-danger-500/10 px-3 py-2">
          {error}
        </p>
      )}

      {testResult && (
        <p className={`text-xs border px-3 py-2 ${
          testResult.ok
            ? 'text-green-400 border-green-500/30 bg-green-500/10'
            : 'text-danger-400 border-danger-500/30 bg-danger-500/10'
        }`}>
          {testResult.ok ? 'connection successful' : (testResult.message ?? 'connection failed')}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 text-xs uppercase tracking-widest border border-brick-700 text-brick-400 hover:border-brick-500 transition-colors"
          disabled={loading || testing}
        >
          cancel
        </button>
        <button
          type="button"
          onClick={handleTest}
          disabled={loading || testing}
          className="flex-1 py-2 text-xs uppercase tracking-widest border border-brick-700 text-brick-400 hover:border-brick-500 transition-colors disabled:opacity-50"
        >
          {testing ? 'testing...' : 'test'}
        </button>
        <button
          type="submit"
          disabled={loading || testing}
          className="flex-1 py-2 text-xs uppercase tracking-widest bg-copper-500 hover:bg-copper-400 text-brick-950 font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'saving...' : 'save'}
        </button>
      </div>
    </form>
  )
}

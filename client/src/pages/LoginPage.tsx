import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/connections')
    } catch {
      setError('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-brick-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="mb-10 text-center">
          <div className="text-copper-500 text-2xl font-medium tracking-widest uppercase mb-1">
            brick
            <span className="text-cream-100">sql</span>
            <span className="cursor-blink" />
          </div>
          <p className="text-brick-500 text-xs tracking-wider">
            self-hosted sql client
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-brick-400 text-xs uppercase tracking-widest mb-1.5">
              user
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-brick-900 border border-brick-700 text-cream-100 px-3 py-2.5 text-sm focus:outline-none focus:border-copper-500 transition-colors placeholder:text-brick-500"
              placeholder="username"
              autoComplete="username"
              autoFocus
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-brick-400 text-xs uppercase tracking-widest mb-1.5">
              password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-brick-900 border border-brick-700 text-cream-100 px-3 py-2.5 text-sm focus:outline-none focus:border-copper-500 transition-colors placeholder:text-brick-500"
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-danger-400 text-xs border border-danger-500/30 bg-danger-500/10 px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full bg-copper-500 hover:bg-copper-400 disabled:bg-brick-700 disabled:text-brick-500 text-brick-950 font-medium py-2.5 text-sm uppercase tracking-widest transition-colors mt-2"
          >
            {loading ? 'connecting...' : 'connect'}
          </button>
        </form>
      </div>
    </div>
  )
}

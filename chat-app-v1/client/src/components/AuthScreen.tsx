import { useState, type FormEvent } from 'react'
import { useChat } from '../state/ChatProvider'

export function AuthScreen() {
  const { login } = useChat()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(mode, username.trim(), password)
    } catch (err) {
      const msg = (err as Error).message
      setError(msg === 'Request validation failed'
        ? 'Username: 3-32 letters, numbers or _. Password: 8-72 characters.'
        : msg)
    } finally {
      setBusy(false)
    }
  }

  const input = 'w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-indigo-500'
  return (
    <div className="flex h-full items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
        <div>
          <h1 className="text-xl font-semibold">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="text-sm text-slate-400">Real-time chat over WebSockets + Redis</p>
        </div>
        <input className={input} placeholder="Username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <input className={input} type="password" placeholder="Password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50">
          {busy ? '…' : mode === 'login' ? 'Log in' : 'Sign up'}
        </button>
        <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }} className="w-full text-center text-sm text-slate-400 hover:text-slate-200">
          {mode === 'login' ? "New here? Create an account" : 'Have an account? Log in'}
        </button>
      </form>
    </div>
  )
}

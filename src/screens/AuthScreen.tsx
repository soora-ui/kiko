import { useState } from 'react'
import { login } from '../lib/http'
import Enso from '../components/Enso'

export default function AuthScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!password || busy) return
    setBusy(true)
    setError('')
    try {
      await login(password)
      onLogin()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось войти')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6">
      <Enso size={120} className="text-sakura mb-6" />
      <h1 className="text-3xl font-bold mb-1">Кико</h1>
      <p className="text-muted mb-10">трекер вопросов первой линии</p>

      <div className="w-full max-w-sm">
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Пароль"
          className="w-full rounded-full bg-white ring-1 ring-black/5 px-6 py-4
            outline-none focus:ring-2 focus:ring-sakura/50 shadow-soft text-[16px]"
        />
        {error && <p className="mt-2 text-sm text-terra px-2">{error}</p>}
        <button
          onClick={submit}
          disabled={!password || busy}
          className="mt-3 w-full pill-primary py-4 min-h-[52px] disabled:opacity-40"
        >
          {busy ? 'Вхожу…' : 'Войти'}
        </button>
      </div>
    </div>
  )
}

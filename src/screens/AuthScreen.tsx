import { useState } from 'react'
import { Eye, EyeSlash } from '@phosphor-icons/react'
import { login, register } from '../lib/http'
import Enso from '../components/Enso'

export default function AuthScreen({ onLogin }: { onLogin: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [loginName, setLoginName] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!loginName.trim() || !password || (mode === 'register' && !name.trim()) || busy) return
    setBusy(true)
    setError('')
    try {
      if (mode === 'login') await login(loginName, password)
      else await register(name.trim(), loginName, password)
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
        {mode === 'register' && (
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Имя"
            className="mb-2 w-full rounded-full bg-white ring-1 ring-black/5 px-6 py-4
              outline-none focus:ring-2 focus:ring-sakura/50 shadow-soft text-[16px]"
          />
        )}
        <input
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={loginName}
          onChange={(e) => setLoginName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Логин"
          className="mb-2 w-full rounded-full bg-white ring-1 ring-black/5 px-6 py-4
            outline-none focus:ring-2 focus:ring-sakura/50 shadow-soft text-[16px]"
        />
        <div className="relative">
          <input
            type={passwordVisible ? 'text' : 'password'}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder={mode === 'login' ? 'Пароль' : 'Пароль (от 6 символов)'}
            className="w-full rounded-full bg-white ring-1 ring-black/5 pl-6 pr-14 py-4
              outline-none focus:ring-2 focus:ring-sakura/50 shadow-soft text-[16px]"
          />
          <button
            type="button"
            onClick={() => setPasswordVisible((visible) => !visible)}
            aria-label={passwordVisible ? 'Скрыть пароль' : 'Показать пароль'}
            className="absolute right-2 top-1/2 -translate-y-1/2 grid h-11 w-11 place-items-center text-muted"
          >
            {passwordVisible ? <EyeSlash size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-terra px-2">{error}</p>}
        <button
          onClick={submit}
          disabled={
            !loginName.trim() ||
            !password ||
            (mode === 'register' && (!name.trim() || password.length < 6)) ||
            busy
          }
          className="mt-3 w-full pill-primary py-4 min-h-[52px] disabled:opacity-40"
        >
          {busy
            ? mode === 'login'
              ? 'Вхожу…'
              : 'Создаю…'
            : mode === 'login'
              ? 'Войти'
              : 'Зарегистрироваться'}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode((value) => (value === 'login' ? 'register' : 'login'))
            setError('')
            setPasswordVisible(false)
          }}
          className="mt-4 w-full min-h-[44px] text-sm font-medium text-muted"
        >
          {mode === 'login'
            ? 'Нет аккаунта? Зарегистрироваться'
            : 'Уже есть аккаунт? Войти'}
        </button>
      </div>
    </div>
  )
}

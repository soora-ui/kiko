import { useEffect, useState } from 'react'
import { Key, Trash, UserPlus } from '@phosphor-icons/react'
import type { Colleague } from '../lib/types'
import {
  changeMyPassword,
  createUser,
  deleteUser,
  fetchColleagues,
  updateUser,
} from '../lib/api'
import { getMe } from '../lib/http'

const input =
  'w-full rounded-2xl bg-black/[0.03] px-4 py-3 outline-none focus:ring-2 focus:ring-sakura/50 text-[16px]'

const errText = (e: unknown) => (e instanceof Error ? e.message : 'Не получилось')

/** Свой аккаунт: кто я + смена пароля. */
export function AccountSection() {
  const me = getMe()
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [status, setStatus] = useState('')

  return (
    <div>
      <p className="text-sm">
        {me?.name} <span className="text-muted">· {me?.login}</span>
        {me?.is_admin && <span className="text-muted"> · админ</span>}
      </p>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-3 w-full rounded-full bg-black/[0.03] py-3 min-h-[48px] font-medium"
        >
          Сменить пароль
        </button>
      ) : (
        <div className="mt-3 space-y-2">
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Текущий пароль"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={input}
          />
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Новый пароль (от 6 символов)"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className={input}
          />
          <button
            onClick={async () => {
              setStatus('')
              try {
                await changeMyPassword(current, next)
                setStatus('Пароль изменён ✓')
                setCurrent('')
                setNext('')
                setOpen(false)
              } catch (e) {
                setStatus(errText(e))
              }
            }}
            disabled={!current || next.length < 6}
            className="w-full pill-primary py-3 min-h-[48px] disabled:opacity-40"
          >
            Сохранить
          </button>
        </div>
      )}
      {status && <p className="mt-2 text-sm text-muted">{status}</p>}
    </div>
  )
}

/** Админ: добавить коллегу, сбросить пароль, удалить. */
export function UsersSection() {
  const me = getMe()
  const [users, setUsers] = useState<Colleague[]>([])
  const [login, setLogin] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')

  const load = () => fetchColleagues().then(setUsers).catch(() => {})
  useEffect(() => {
    load()
  }, [])

  return (
    <div>
      <div className="space-y-2">
        {users.map((u) => (
          <div key={u.id} className="flex items-center gap-2 rounded-2xl bg-black/[0.03] px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{u.name}</p>
              <p className="text-xs text-muted">
                {u.login}
                {u.is_admin && ' · админ'}
              </p>
            </div>
            {u.id !== me?.id && (
              <>
                <button
                  aria-label="Сбросить пароль"
                  onClick={async () => {
                    const pwd = window.prompt(`Новый пароль для «${u.name}» (от 6 символов)`)
                    if (!pwd) return
                    try {
                      await updateUser(u.id, { password: pwd })
                      setStatus(`Пароль для «${u.name}» обновлён ✓`)
                    } catch (e) {
                      setStatus(errText(e))
                    }
                  }}
                  className="grid place-items-center h-9 w-9 rounded-full text-muted"
                >
                  <Key size={16} weight="light" />
                </button>
                <button
                  aria-label="Удалить"
                  onClick={async () => {
                    if (
                      !window.confirm(
                        `Удалить «${u.name}»? Все его вопросы удалятся безвозвратно.`,
                      )
                    )
                      return
                    try {
                      await deleteUser(u.id)
                      load()
                    } catch (e) {
                      setStatus(errText(e))
                    }
                  }}
                  className="grid place-items-center h-9 w-9 rounded-full text-muted"
                >
                  <Trash size={16} weight="light" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      <p className="mt-4 mb-2 text-xs font-semibold text-muted uppercase tracking-wide">
        Добавить коллегу
      </p>
      <div className="space-y-2">
        <input
          placeholder="Имя (как увидят другие)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={input}
        />
        <input
          placeholder="Логин (латиница)"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          className={input}
        />
        <input
          placeholder="Пароль (от 6 символов)"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={input}
        />
        <button
          onClick={async () => {
            setStatus('')
            try {
              const u = await createUser({ login, name, password })
              setStatus(`«${u.name}» добавлен(а). Передай логин и пароль ✓`)
              setLogin('')
              setName('')
              setPassword('')
              load()
            } catch (e) {
              setStatus(errText(e))
            }
          }}
          disabled={!login.trim() || !name.trim() || password.length < 6}
          className="w-full pill-primary py-3 min-h-[48px] disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <UserPlus size={18} weight="light" />
          Добавить
        </button>
      </div>
      {status && <p className="mt-2 text-sm text-muted">{status}</p>}
    </div>
  )
}

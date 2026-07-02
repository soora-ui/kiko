import { useEffect, useState } from 'react'
import { SignOut } from '@phosphor-icons/react'
import { clearToken } from '../lib/http'
import {
  fetchSettings,
  loadSettings,
  saveSettings,
  type Settings,
} from '../lib/settings'
import {
  enablePush,
  getPushState,
  sendTestPush,
  type PushState,
} from '../lib/push'
import { exportAllData } from '../lib/api'

const DAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const pushLabel: Record<PushState, string> = {
  unsupported: 'Не поддерживается в этом браузере',
  default: 'Не включены',
  denied: 'Запрещены в настройках системы',
  subscribed: 'Включены ✓',
  'granted-not-subscribed': 'Разрешены, но подписки нет',
}

export default function SettingsScreen({ onLogout }: { onLogout: () => void }) {
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [pushState, setPushState] = useState<PushState>('default')
  const [testStatus, setTestStatus] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getPushState().then(setPushState)
    // серверные настройки — источник правды (по ним шлются пуши)
    fetchSettings().then(setSettings).catch(() => {})
  }, [])

  const update = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveSettings(next).catch(() => setTestStatus('Не удалось сохранить настройки'))
  }

  const toggleDay = (day: number) => {
    const days = settings.workDays.includes(day)
      ? settings.workDays.filter((d) => d !== day)
      : [...settings.workDays, day].sort()
    if (days.length === 0) return
    update({ workDays: days })
  }

  const subscribe = async () => {
    setBusy(true)
    try {
      setPushState(await enablePush())
    } catch {
      setTestStatus('Не удалось включить пуши')
    } finally {
      setBusy(false)
    }
  }

  const testPush = async () => {
    setBusy(true)
    setTestStatus('')
    try {
      await sendTestPush()
      setTestStatus('Отправлен — придёт через пару секунд')
    } catch (e) {
      setTestStatus(e instanceof Error ? e.message : 'Ошибка отправки')
    } finally {
      setBusy(false)
    }
  }

  const exportJson = async () => {
    const blob = await exportAllData()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kiko-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-safe pb-8">
      <header className="pt-8 pb-4">
        <h1 className="text-2xl font-bold">Настройки</h1>
      </header>

      <Section title="Рабочее окно пушей">
        <div className="flex items-center gap-3 mb-4">
          <TimeSelect
            value={settings.workStart}
            onChange={(v) => update({ workStart: v })}
          />
          <span className="text-muted">—</span>
          <TimeSelect
            value={settings.workEnd}
            onChange={(v) => update({ workEnd: v })}
          />
        </div>
        <div className="flex gap-1.5">
          {DAY_LABELS.map((label, i) => {
            const day = i + 1
            const active = settings.workDays.includes(day)
            return (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className={`flex-1 rounded-full py-2.5 text-xs font-semibold min-h-[44px]
                  transition-colors duration-500 ease-koneko
                  ${active ? 'bg-sakura/20 text-ink' : 'bg-black/[0.03] text-muted'}`}
              >
                {label}
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-xs text-muted">
          Вне этого окна напоминания переносятся на ближайшее рабочее утро.
        </p>
      </Section>

      <Section title="Вечерний чек">
        <label className="flex items-center justify-between min-h-[44px]">
          <span className="text-sm">«Закрой хвосты» в 18:30</span>
          <Toggle
            checked={settings.eveningCheck}
            onChange={(v) => update({ eveningCheck: v })}
          />
        </label>
      </Section>

      <Section title="Уведомления">
        <p className="text-sm mb-3">
          Статус: <span className="font-semibold">{pushLabel[pushState]}</span>
        </p>
        <div className="flex gap-2">
          {pushState !== 'subscribed' && pushState !== 'unsupported' && pushState !== 'denied' && (
            <button
              onClick={subscribe}
              disabled={busy}
              className="flex-1 pill-primary py-3 min-h-[48px] disabled:opacity-40"
            >
              Включить
            </button>
          )}
          <button
            onClick={testPush}
            disabled={busy || pushState !== 'subscribed'}
            className="flex-1 rounded-full bg-black/[0.03] py-3 min-h-[48px]
              font-medium disabled:opacity-40"
          >
            Тестовый пуш
          </button>
        </div>
        {testStatus && <p className="mt-2 text-xs text-muted">{testStatus}</p>}
      </Section>

      <Section title="Данные">
        <button
          onClick={exportJson}
          className="w-full rounded-full bg-black/[0.03] py-3 min-h-[48px] font-medium"
        >
          Экспорт всех данных в JSON
        </button>
      </Section>

      <button
        onClick={() => {
          clearToken()
          onLogout()
        }}
        className="mt-2 mx-auto flex items-center gap-2 text-sm text-muted min-h-[44px] px-4"
      >
        <SignOut size={18} weight="light" />
        Выйти
      </button>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bezel mb-4">
      <div className="bezel-core p-5">
        <h2 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}

function TimeSelect({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="flex-1 rounded-full bg-black/[0.03] px-4 py-3 outline-none
        appearance-none text-center font-medium"
    >
      {Array.from({ length: 24 }, (_, h) => (
        <option key={h} value={h}>
          {String(h).padStart(2, '0')}:00
        </option>
      ))}
    </select>
  )
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-14 rounded-full transition-colors duration-500 ease-koneko
        ${checked ? 'bg-sage' : 'bg-black/10'}`}
    >
      <span
        className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow
          transition-all duration-500 ease-koneko ${checked ? 'left-7' : 'left-1'}`}
      />
    </button>
  )
}

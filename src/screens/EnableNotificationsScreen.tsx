import { useState } from 'react'
import { BellRinging } from '@phosphor-icons/react'
import { enablePush } from '../lib/push'
import Enso from '../components/Enso'

/**
 * Разрешение спрашиваем ТОЛЬКО по явному тапу на кнопку —
 * автоматический requestPermission iOS молча отклонит.
 */
export default function EnableNotificationsScreen({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const enable = async () => {
    setBusy(true)
    setError('')
    try {
      const state = await enablePush()
      if (state === 'denied') {
        setError(
          'Уведомления запрещены. Включи их в Настройках iOS → Кико → Уведомления.',
        )
        return
      }
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось включить пуши')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center">
      <Enso size={110} className="text-sakura mb-5" />
      <h1 className="text-2xl font-bold mb-2">Не дам ничего забыть</h1>
      <p className="text-muted mb-10 max-w-sm">
        Кико будет напоминать про открытые вопросы, пока ты их не закроешь.
        Пуши приходят только в рабочее время.
      </p>

      <button
        onClick={enable}
        disabled={busy}
        className="w-full max-w-sm pill-primary py-2 pl-6 pr-2 min-h-[56px]
          flex items-center justify-between disabled:opacity-40"
      >
        <span>{busy ? 'Включаю…' : 'Включить напоминания'}</span>
        <span className="grid place-items-center h-11 w-11 rounded-full bg-white/25">
          <BellRinging size={22} weight="light" />
        </span>
      </button>

      {error && <p className="mt-4 text-sm text-terra max-w-sm">{error}</p>}

      <button
        onClick={onDone}
        className="mt-6 text-sm text-muted underline underline-offset-4"
      >
        Позже
      </button>
    </div>
  )
}

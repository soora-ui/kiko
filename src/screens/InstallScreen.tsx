import { Export, PlusSquare } from '@phosphor-icons/react'
import Enso from '../components/Enso'

/**
 * iOS: Web Push работает только из установленной PWA (iOS ≥ 16.4).
 * Показывается, когда приложение открыто во вкладке Safari.
 */
export default function InstallScreen({ onSkip }: { onSkip: () => void }) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center">
      <Enso size={110} className="text-sakura mb-5" />
      <h1 className="text-2xl font-bold mb-2">Установи Кико на экран</h1>
      <p className="text-muted mb-8 max-w-sm">
        Напоминания на iPhone работают только из установленного приложения —
        из вкладки Safari пуши не придут.
      </p>

      <div className="bezel w-full max-w-sm mb-6">
        <div className="bezel-core p-5 text-left space-y-4">
          <Step n={1}>
            Нажми <Export size={20} weight="light" className="inline -mt-1 text-sakura" />{' '}
            <b>«Поделиться»</b> в нижней панели Safari
          </Step>
          <Step n={2}>
            Выбери{' '}
            <PlusSquare size={20} weight="light" className="inline -mt-1 text-sakura" />{' '}
            <b>«На экран "Домой"»</b>
          </Step>
          <Step n={3}>
            Открой <b>Кико</b> с домашнего экрана — и включи уведомления
          </Step>
        </div>
      </div>

      <button onClick={onSkip} className="text-sm text-muted underline underline-offset-4">
        Продолжить в браузере (без пушей)
      </button>
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="grid place-items-center h-7 w-7 rounded-full bg-sakura/15
          text-sm font-bold text-[#B5787D] shrink-0"
      >
        {n}
      </span>
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  )
}

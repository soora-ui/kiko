import { useEffect, useState } from 'react'
import { CheckCircle } from '@phosphor-icons/react'
import Sheet from './Sheet'
import type { Question, Status } from '../lib/types'
import { OPEN_STATUSES, STATUS_LABEL } from '../lib/types'
import { setStatus } from '../lib/api'

/**
 * Перекидка вопроса между статусами. «Требуется уточнение» — только после
 * ввода, что именно уточнить; «Жду ответа» спрашивает, от кого.
 * «Выполнено» делегируется наружу (там обязательный resolution).
 */
export default function StatusSheet({
  question,
  open,
  onClose,
  onChanged,
  onRequestClose,
}: {
  question: Question | null
  open: boolean
  onClose: () => void
  onChanged: (updated: Question) => void
  onRequestClose: () => void
}) {
  const [step, setStep] = useState<'pick' | 'waiting' | 'clarification'>('pick')
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setStep('pick')
      setInput('')
      setError('')
    }
  }, [open])

  if (!question) return null

  const apply = async (
    status: Status,
    extra?: { waiting_for?: string | null; clarification?: string | null },
  ) => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const updated = await setStatus(question, status, extra)
      onChanged(updated)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сменить статус')
    } finally {
      setBusy(false)
    }
  }

  const pick = (status: Status) => {
    if (status === question.status) return onClose()
    if (status === 'waiting') {
      setInput(question.waiting_for ?? '')
      setStep('waiting')
      return
    }
    if (status === 'clarification') {
      setInput(question.clarification ?? '')
      setStep('clarification')
      return
    }
    apply(status)
  }

  return (
    <Sheet open={open} onClose={onClose}>
      {step === 'pick' && (
        <>
          <p className="text-sm text-muted mb-1">Переместить вопрос</p>
          <p className="font-semibold mb-4 line-clamp-2">{question.summary}</p>
          <div className="flex flex-col gap-1.5">
            {OPEN_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => pick(s)}
                disabled={busy}
                className={`rounded-full px-6 py-3 min-h-[48px] text-left font-medium
                  transition-colors duration-500 ease-koneko
                  ${
                    question.status === s
                      ? 'bg-sakura/20 ring-1 ring-sakura/40'
                      : 'bg-black/[0.03] active:bg-sakura/15'
                  }`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
            <button
              onClick={() => {
                onClose()
                onRequestClose()
              }}
              className="rounded-full px-6 py-3 min-h-[48px] text-left font-semibold
                bg-sage/20 text-[#556B4E] flex items-center justify-between"
            >
              {STATUS_LABEL.closed}
              <CheckCircle size={20} weight="light" />
            </button>
          </div>
        </>
      )}

      {step === 'waiting' && (
        <>
          <p className="text-sm text-muted mb-1">Жду ответа</p>
          <p className="font-semibold mb-4 line-clamp-2">{question.summary}</p>
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="От кого ждём ответа"
            className="w-full rounded-full bg-black/[0.03] px-5 py-3 outline-none
              focus:ring-2 focus:ring-sakura/50 text-[16px]"
          />
          <button
            onClick={() => apply('waiting', { waiting_for: input.trim() || null })}
            disabled={busy}
            className="mt-4 w-full pill-primary py-3.5 min-h-[52px] disabled:opacity-40"
          >
            Перевести в «Жду ответа»
          </button>
        </>
      )}

      {step === 'clarification' && (
        <>
          <p className="text-sm text-muted mb-1">Требуется уточнение</p>
          <p className="font-semibold mb-4 line-clamp-2">{question.summary}</p>
          <textarea
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Что именно нужно уточнить…"
            rows={3}
            className="w-full rounded-2xl bg-black/[0.03] p-4 outline-none
              focus:ring-2 focus:ring-sakura/50 resize-none text-[16px]"
          />
          <button
            onClick={() => apply('clarification', { clarification: input.trim() })}
            disabled={!input.trim() || busy}
            className="mt-4 w-full pill-primary py-3.5 min-h-[52px] disabled:opacity-40"
          >
            Перевести в «Требуется уточнение»
          </button>
        </>
      )}

      {error && <p className="mt-3 text-sm text-terra">{error}</p>}
    </Sheet>
  )
}

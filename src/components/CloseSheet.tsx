import { useState } from 'react'
import { CheckCircle } from '@phosphor-icons/react'
import Sheet from './Sheet'
import type { Question } from '../lib/types'

/** Закрытие вопроса: resolution обязателен (критерий приёмки). */
export default function CloseSheet({
  question,
  open,
  onClose,
  onSubmit,
}: {
  question: Question | null
  open: boolean
  onClose: () => void
  onSubmit: (resolution: string) => Promise<void>
}) {
  const [resolution, setResolution] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!resolution.trim() || busy) return
    setBusy(true)
    try {
      await onSubmit(resolution.trim())
      setResolution('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <p className="text-sm text-muted mb-1">Закрыть вопрос</p>
      <p className="font-semibold mb-4 line-clamp-2">{question?.summary}</p>
      <textarea
        autoFocus
        value={resolution}
        onChange={(e) => setResolution(e.target.value)}
        placeholder="Как решили / что ответил…"
        rows={3}
        className="w-full rounded-2xl bg-black/[0.03] p-4 outline-none
          focus:ring-2 focus:ring-sage/50 resize-none"
      />
      <button
        onClick={submit}
        disabled={!resolution.trim() || busy}
        className="mt-4 w-full pill-primary !bg-sage disabled:opacity-40
          flex items-center justify-between pl-6 pr-2 py-2 min-h-[52px]"
      >
        <span>Закрыть вопрос</span>
        <span className="grid place-items-center h-10 w-10 rounded-full bg-white/25">
          <CheckCircle size={22} weight="light" />
        </span>
      </button>
    </Sheet>
  )
}

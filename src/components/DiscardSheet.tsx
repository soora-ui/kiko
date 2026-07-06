import { useState } from 'react'
import { Archive } from '@phosphor-icons/react'
import Sheet from './Sheet'
import type { Question } from '../lib/types'
import { DISCARD_REASONS } from '../lib/types'
import { discardQuestion } from '../lib/api'

/** «Не актуально»: выбор пометки → вопрос уходит в архив. */
export default function DiscardSheet({
  question,
  open,
  onClose,
  onDone,
}: {
  question: Question | null
  open: boolean
  onClose: () => void
  onDone: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const discard = async (reason: string) => {
    if (!question || busy) return
    setBusy(true)
    setError('')
    try {
      await discardQuestion(question, reason)
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось перенести в архив')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <p className="flex items-center gap-1.5 text-sm text-muted mb-1">
        <Archive size={16} weight="light" />
        Не актуально — в архив с пометкой
      </p>
      <p className="font-semibold mb-4 line-clamp-2">{question?.summary}</p>
      <div className="flex flex-col gap-1.5">
        {DISCARD_REASONS.map((reason) => (
          <button
            key={reason}
            onClick={() => discard(reason)}
            disabled={busy}
            className="rounded-full px-6 py-3 min-h-[48px] text-left font-medium
              bg-black/[0.03] transition-colors duration-500 ease-koneko
              active:bg-sakura/15 disabled:opacity-40"
          >
            {reason}
          </button>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-terra">{error}</p>}
    </Sheet>
  )
}

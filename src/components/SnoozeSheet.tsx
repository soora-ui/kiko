import Sheet from './Sheet'
import type { Question } from '../lib/types'
import { fmtDateTime, snoozePresets } from '../lib/reminders'
import { loadSettings } from '../lib/settings'

export default function SnoozeSheet({
  question,
  open,
  onClose,
  onSnooze,
}: {
  question: Question | null
  open: boolean
  onClose: () => void
  onSnooze: (until: Date) => Promise<void>
}) {
  const presets = snoozePresets(loadSettings())

  return (
    <Sheet open={open} onClose={onClose}>
      <p className="text-sm text-muted mb-1">Отложить напоминание</p>
      <p className="font-semibold mb-4 line-clamp-2">{question?.summary}</p>
      <div className="flex flex-col gap-2">
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => onSnooze(p.date)}
            className="flex items-center justify-between rounded-full
              bg-black/[0.03] px-6 py-3.5 min-h-[52px] font-medium
              transition-colors duration-500 ease-koneko active:bg-sakura/15"
          >
            <span>{p.label}</span>
            <span className="text-sm text-muted">{fmtDateTime(p.date)}</span>
          </button>
        ))}
      </div>
      {question && question.snooze_count >= 2 && (
        <p className="mt-3 text-xs text-terra">
          ⚠️ Уже {question.snooze_count} раз откладывал — напоминания станут чаще
        </p>
      )}
    </Sheet>
  )
}

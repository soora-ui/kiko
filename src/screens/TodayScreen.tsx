import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import type { Question } from '../lib/types'
import { closeQuestion, fetchOpenQuestions, snoozeQuestion } from '../lib/api'
import QuestionCardItem from '../components/QuestionCardItem'
import CloseSheet from '../components/CloseSheet'
import SnoozeSheet from '../components/SnoozeSheet'
import EmptyState from '../components/EmptyState'

export default function TodayScreen() {
  const [questions, setQuestions] = useState<Question[] | null>(null)
  const [closing, setClosing] = useState<Question | null>(null)
  const [snoozing, setSnoozing] = useState<Question | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setQuestions(await fetchOpenQuestions())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const open = questions ?? []
  const urgent = open.filter((q) => q.priority === 'urgent').length
  const waiting = open.filter((q) => q.status === 'waiting').length

  return (
    <div className="mx-auto max-w-md px-4 pt-safe">
      <header className="pt-8 pb-5">
        <h1 className="text-2xl font-bold">Сегодня</h1>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Counter value={open.length} label="Открыто" tone="text-ink" />
          <Counter value={urgent} label="Срочно" tone="text-terra" />
          <Counter value={waiting} label="Жду ответа" tone="text-[#5F7E8C]" />
        </div>
      </header>

      {error && <p className="text-sm text-terra mb-3">{error}</p>}

      {error ? null : questions === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bezel animate-pulse">
              <div className="bezel-core h-24" />
            </div>
          ))}
        </div>
      ) : open.length === 0 ? (
        <EmptyState title="Все вопросы закрыты 🌸" subtitle="Отдыхай" />
      ) : (
        <AnimatePresence mode="popLayout">
          {open.map((q, i) => (
            <QuestionCardItem
              key={q.id}
              question={q}
              index={i}
              onSwipeClose={() => setClosing(q)}
              onSwipeSnooze={() => setSnoozing(q)}
            />
          ))}
        </AnimatePresence>
      )}

      <CloseSheet
        question={closing}
        open={closing !== null}
        onClose={() => setClosing(null)}
        onSubmit={async (resolution) => {
          if (!closing) return
          await closeQuestion(closing, resolution)
          setClosing(null)
          await load()
        }}
      />

      <SnoozeSheet
        question={snoozing}
        open={snoozing !== null}
        onClose={() => setSnoozing(null)}
        onSnooze={async (until) => {
          if (!snoozing) return
          await snoozeQuestion(snoozing, until)
          setSnoozing(null)
          await load()
        }}
      />
    </div>
  )
}

function Counter({
  value,
  label,
  tone,
}: {
  value: number
  label: string
  tone: string
}) {
  return (
    <div className="bezel">
      <div className="bezel-core px-3 py-3 text-center">
        <div className={`text-2xl font-bold ${tone}`}>{value}</div>
        <div className="text-[11px] text-muted mt-0.5">{label}</div>
      </div>
    </div>
  )
}

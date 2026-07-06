import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Kanban, ListDashes } from '@phosphor-icons/react'
import type { Question, Status } from '../lib/types'
import { OPEN_STATUSES, STATUS_LABEL } from '../lib/types'
import {
  ackQuestion,
  closeQuestion,
  fetchOpenQuestions,
  setStatus,
  snoozeQuestion,
} from '../lib/api'
import QuestionCardItem from '../components/QuestionCardItem'
import BoardView from '../components/BoardView'
import CloseSheet from '../components/CloseSheet'
import DiscardSheet from '../components/DiscardSheet'
import SnoozeSheet from '../components/SnoozeSheet'
import StatusSheet from '../components/StatusSheet'
import EmptyState from '../components/EmptyState'

type View = 'board' | 'list'

export default function TodayScreen() {
  const [questions, setQuestions] = useState<Question[] | null>(null)
  const [view, setView] = useState<View>(
    () => (localStorage.getItem('kiko-view') as View) ?? 'board',
  )
  const [closing, setClosing] = useState<Question | null>(null)
  const [discarding, setDiscarding] = useState<Question | null>(null)
  const [snoozing, setSnoozing] = useState<Question | null>(null)
  const [moving, setMoving] = useState<Question | null>(null)
  const [movingIntent, setMovingIntent] = useState<'waiting' | 'clarification' | undefined>()
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

  const switchView = (v: View) => {
    setView(v)
    localStorage.setItem('kiko-view', v)
  }

  /** Дроп в обычную колонку: оптимистично двигаем, потом синхронизируемся. */
  const dropStatus = async (q: Question, status: Status) => {
    setQuestions((prev) =>
      prev ? prev.map((x) => (x.id === q.id ? { ...x, status } : x)) : prev,
    )
    try {
      await setStatus(q, status)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сменить статус')
    } finally {
      load()
    }
  }

  const open = questions ?? []
  const urgent = open.filter((q) => q.priority === 'urgent').length
  const waiting = open.filter((q) => q.status === 'waiting').length

  const sections = OPEN_STATUSES.map((status) => ({
    status,
    items: open.filter((q) => q.status === status),
  })).filter((s) => s.items.length > 0)

  let cardIndex = 0

  // Доске даём всю ширину экрана (видно максимум колонок),
  // лента и шапка остаются узкой центральной колонкой
  return (
    <div
      className={`mx-auto px-4 pt-safe ${
        view === 'board' ? 'max-w-none' : 'max-w-md'
      }`}
    >
      <header className="pt-8 pb-5 mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Сегодня</h1>
          {/* Доска / Лента */}
          <div className="flex rounded-full bg-black/[0.04] p-1">
            {(
              [
                ['board', Kanban, 'Доска'],
                ['list', ListDashes, 'Лента'],
              ] as const
            ).map(([v, Icon, label]) => (
              <button
                key={v}
                onClick={() => switchView(v)}
                aria-label={label}
                className={`grid place-items-center h-9 w-11 rounded-full
                  transition-colors duration-500 ease-koneko
                  ${view === v ? 'bg-white shadow-soft text-ink' : 'text-muted'}`}
              >
                <Icon size={19} weight="light" />
              </button>
            ))}
          </div>
        </div>
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
      ) : view === 'board' ? (
        <BoardView
          questions={open}
          onDropStatus={dropStatus}
          onDropNeedsInput={(q, intent) => {
            setMovingIntent(intent)
            setMoving(q)
          }}
          onDropClose={(q) => setClosing(q)}
          onDropDiscard={(q) => setDiscarding(q)}
          onAck={async (q) => {
            setQuestions((prev) =>
              prev
                ? prev.map((x) => (x.id === q.id ? { ...x, awaiting_ack: false } : x))
                : prev,
            )
            try {
              await ackQuestion(q)
            } finally {
              load()
            }
          }}
        />
      ) : (
        sections.map(({ status, items }) => (
          <section key={status} className="mb-5">
            <h2 className="flex items-baseline gap-2 text-xs font-semibold text-muted uppercase tracking-wide px-2 mb-2">
              {STATUS_LABEL[status as Status]}
              <span className="text-sakura font-bold">{items.length}</span>
            </h2>
            <AnimatePresence mode="popLayout">
              {items.map((q) => (
                <QuestionCardItem
                  key={q.id}
                  question={q}
                  index={cardIndex++}
                  onSwipeClose={() => setClosing(q)}
                  onSwipeSnooze={() => setSnoozing(q)}
                  onStatusTap={() => {
                    setMovingIntent(undefined)
                    setMoving(q)
                  }}
                />
              ))}
            </AnimatePresence>
          </section>
        ))
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

      <DiscardSheet
        question={discarding}
        open={discarding !== null}
        onClose={() => setDiscarding(null)}
        onDone={async () => {
          setDiscarding(null)
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

      <StatusSheet
        question={moving}
        open={moving !== null}
        intent={movingIntent}
        onClose={() => setMoving(null)}
        onChanged={() => {
          setMoving(null)
          load()
        }}
        onRequestClose={() => {
          setClosing(moving)
          setMoving(null)
        }}
        onRequestDiscard={() => {
          setDiscarding(moving)
          setMoving(null)
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

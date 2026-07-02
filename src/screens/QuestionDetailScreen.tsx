import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, BellRinging } from '@phosphor-icons/react'
import type { ActivityEvent, Question, Status } from '../lib/types'
import { STATUS_LABEL } from '../lib/types'
import {
  closeQuestion,
  fetchLog,
  getQuestion,
  setRemindAt,
  setStatus,
} from '../lib/api'
import { fmtDateTime } from '../lib/reminders'
import { PriorityBadge, StatusBadge } from '../components/StatusBadge'
import CloseSheet from '../components/CloseSheet'

const eventLabel = (e: ActivityEvent): string => {
  switch (e.event) {
    case 'created':
      return 'Вопрос зафиксирован'
    case 'status_changed': {
      const to = (e.detail?.to as Status) ?? 'new'
      return `Статус → ${STATUS_LABEL[to] ?? to}`
    }
    case 'snoozed':
      return 'Отложен'
    case 'closed':
      return 'Закрыт'
    case 'reminded':
      return 'Отправлено напоминание'
    default:
      return 'Заметка'
  }
}

export default function QuestionDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [q, setQ] = useState<Question | null>(null)
  const [log, setLog] = useState<ActivityEvent[]>([])
  const [waitingFor, setWaitingFor] = useState('')
  const [closeOpen, setCloseOpen] = useState(false)
  const [remindPickerOpen, setRemindPickerOpen] = useState(false)
  const [remindValue, setRemindValue] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    const question = await getQuestion(id)
    setQ(question)
    setWaitingFor(question?.waiting_for ?? '')
    setLog(await fetchLog(id))
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (!q) {
    return (
      <div className="mx-auto max-w-md px-4 pt-16 text-center text-muted">
        Загружаю…
      </div>
    )
  }

  const changeStatus = async (status: Status) => {
    if (status === q.status) return
    if (status === 'closed') {
      setCloseOpen(true)
      return
    }
    const updated = await setStatus(q, status, {
      waiting_for: status === 'waiting' ? waitingFor || null : null,
    })
    setQ(updated)
    setLog(await fetchLog(q.id))
  }

  const statuses: Status[] = ['new', 'in_progress', 'waiting', 'closed']

  return (
    <div className="mx-auto max-w-md px-4 pt-safe pb-8">
      <header className="pt-6 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Назад"
          className="grid place-items-center h-11 w-11 rounded-full bg-black/[0.03]"
        >
          <ArrowLeft size={20} weight="light" />
        </button>
        <div className="flex gap-2">
          <StatusBadge status={q.status} />
          <PriorityBadge priority={q.priority} />
        </div>
      </header>

      <div className="bezel mb-4">
        <div className="bezel-core p-5">
          <p className="leading-relaxed whitespace-pre-wrap">{q.raw_text}</p>
          <div className="mt-3 text-sm text-muted space-y-0.5">
            {q.author && <p>Спросил(а): {q.author}</p>}
            <p>Создан: {fmtDateTime(q.created_at)}</p>
            {q.remind_at && q.status !== 'closed' && (
              <p>Напомню: {fmtDateTime(q.remind_at)}</p>
            )}
          </div>
          {q.resolution && (
            <div className="mt-3 rounded-2xl bg-sage/15 p-4 text-sm text-[#556B4E]">
              <span className="font-semibold">Решение: </span>
              {q.resolution}
            </div>
          )}
        </div>
      </div>

      {q.status !== 'closed' && (
        <>
          {/* переключение статуса таб-баром */}
          <div className="flex gap-1.5 mb-4">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                className={`flex-1 rounded-full py-2.5 text-xs font-semibold min-h-[44px]
                  transition-colors duration-500 ease-koneko
                  ${
                    q.status === s
                      ? 'bg-sakura/20 text-ink ring-1 ring-sakura/40'
                      : 'bg-black/[0.03] text-muted'
                  }`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          {q.status === 'waiting' && (
            <input
              value={waitingFor}
              onChange={(e) => setWaitingFor(e.target.value)}
              onBlur={async () => {
                const updated = await setStatus(q, 'waiting', {
                  waiting_for: waitingFor || null,
                })
                setQ(updated)
              }}
              placeholder="От кого ждём ответа"
              className="mb-4 w-full rounded-full bg-black/[0.03] px-5 py-3
                outline-none focus:ring-2 focus:ring-sakura/50 text-[16px]"
            />
          )}

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setCloseOpen(true)}
              className="flex-1 pill-primary !bg-sage py-3.5 min-h-[52px]"
            >
              Закрыть вопрос
            </button>
            <button
              onClick={() => {
                const d = new Date(Date.now() + 3600_000)
                d.setMinutes(0, 0, 0)
                setRemindValue(
                  new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 16),
                )
                setRemindPickerOpen(!remindPickerOpen)
              }}
              aria-label="Напомнить в…"
              className="grid place-items-center h-[52px] w-[52px] rounded-full
                bg-black/[0.03] text-ink"
            >
              <BellRinging size={22} weight="light" />
            </button>
          </div>

          {remindPickerOpen && (
            <div className="bezel mb-6">
              <div className="bezel-core p-4 flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={remindValue}
                  onChange={(e) => setRemindValue(e.target.value)}
                  className="flex-1 rounded-2xl bg-black/[0.03] px-4 py-3 outline-none"
                />
                <button
                  onClick={async () => {
                    if (!remindValue) return
                    const updated = await setRemindAt(q, new Date(remindValue))
                    setQ(updated)
                    setRemindPickerOpen(false)
                    setLog(await fetchLog(q.id))
                  }}
                  className="pill-primary px-5 py-3"
                >
                  Ок
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* таймлайн истории */}
      <h2 className="text-xs font-semibold text-muted uppercase tracking-wide px-2 mb-2">
        История
      </h2>
      <div className="px-2">
        {log.map((e) => (
          <div key={e.id} className="flex gap-3 pb-4 relative">
            <div className="flex flex-col items-center">
              <span className="h-2 w-2 rounded-full bg-sakura mt-1.5 shrink-0" />
              <span className="w-px flex-1 bg-black/10" />
            </div>
            <div>
              <p className="text-sm font-medium">{eventLabel(e)}</p>
              <p className="text-xs text-muted">{fmtDateTime(e.created_at)}</p>
            </div>
          </div>
        ))}
      </div>

      <CloseSheet
        question={q}
        open={closeOpen}
        onClose={() => setCloseOpen(false)}
        onSubmit={async (resolution) => {
          await closeQuestion(q, resolution)
          setCloseOpen(false)
          navigate('/')
        }}
      />
    </div>
  )
}

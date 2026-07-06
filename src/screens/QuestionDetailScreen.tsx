import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  BellRinging,
  Lightbulb,
  Plus,
  Sparkle,
} from '@phosphor-icons/react'
import type { ActivityEvent, Question, Status } from '../lib/types'
import { STATUS_LABEL } from '../lib/types'
import {
  ackQuestion,
  answerFollowup,
  closeQuestion,
  fetchChildren,
  fetchLog,
  getQuestion,
  setRemindAt,
} from '../lib/api'
import DiscardSheet from '../components/DiscardSheet'
import { fmtDateTime } from '../lib/reminders'
import { PriorityBadge, StatusBadge } from '../components/StatusBadge'
import CloseSheet from '../components/CloseSheet'
import StatusSheet from '../components/StatusSheet'
import QuickAddModal from '../components/QuickAddModal'

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
  const [children, setChildren] = useState<Question[]>([])
  const [closeOpen, setCloseOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [childAddOpen, setChildAddOpen] = useState(false)
  const [remindPickerOpen, setRemindPickerOpen] = useState(false)
  const [remindValue, setRemindValue] = useState('')
  const [followupAnswer, setFollowupAnswer] = useState('')
  const [followupBusy, setFollowupBusy] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    const [question, events, kids] = await Promise.all([
      getQuestion(id),
      fetchLog(id),
      fetchChildren(id),
    ])
    setQ(question)
    setLog(events)
    setChildren(kids)
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
        <div className="flex gap-2 items-center">
          {q.status !== 'closed' ? (
            <button onClick={() => setStatusOpen(true)} className="min-h-[32px]">
              <StatusBadge status={q.status} />
            </button>
          ) : (
            <StatusBadge status={q.status} />
          )}
          <PriorityBadge priority={q.priority} />
        </div>
      </header>

      {q.parent_id && (
        <Link
          to={`/question/${q.parent_id}`}
          className="mb-3 flex items-center gap-1.5 px-2 text-sm text-muted"
        >
          <ArrowUpRight size={16} weight="light" />
          К родительскому вопросу
        </Link>
      )}

      <div className="bezel mb-4">
        <div className="bezel-core p-5">
          <p className="leading-relaxed whitespace-pre-wrap">{q.raw_text}</p>
          <div className="mt-3 text-sm text-muted space-y-0.5">
            {q.author && <p>Спросил(а): {q.author}</p>}
            <p>Создан: {fmtDateTime(q.created_at)}</p>
            {q.remind_at && q.status !== 'closed' && (
              <p>Напомню: {fmtDateTime(q.remind_at)}</p>
            )}
            {q.status === 'waiting' && q.waiting_for && <p>Жду: {q.waiting_for}</p>}
            {q.status === 'clarification' && q.clarification && (
              <p>Уточнить: {q.clarification}</p>
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

      {/* Возможное решение из базы знаний (ИИ) */}
      {q.ai_suggestion && (
        <div className="bezel mb-4">
          <div className="bezel-core p-5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              <Lightbulb size={16} weight="light" className="text-sakura" />
              Возможное решение
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {q.ai_suggestion}
            </p>
          </div>
        </div>
      )}

      {/* Уточняющий вопрос ИИ после закрытия — пополняет базу опыта */}
      {q.ai_followup && (
        <div className="bezel mb-4">
          <div className="bezel-core p-5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-muted uppercase tracking-wide mb-2">
              <Sparkle size={16} weight="light" className="text-sakura" />
              Кико уточняет
            </p>
            <p className="text-sm mb-3">{q.ai_followup}</p>
            <textarea
              value={followupAnswer}
              onChange={(e) => setFollowupAnswer(e.target.value)}
              placeholder="Твой ответ — попадёт в базу опыта"
              rows={2}
              className="w-full rounded-2xl bg-black/[0.03] p-4 outline-none
                focus:ring-2 focus:ring-sakura/50 resize-none text-[16px]"
            />
            <button
              onClick={async () => {
                if (!followupAnswer.trim() || followupBusy) return
                setFollowupBusy(true)
                try {
                  setQ(await answerFollowup(q, followupAnswer.trim()))
                  setFollowupAnswer('')
                } finally {
                  setFollowupBusy(false)
                }
              }}
              disabled={!followupAnswer.trim() || followupBusy}
              className="mt-3 w-full pill-primary py-3 min-h-[48px] disabled:opacity-40"
            >
              Сохранить в опыт
            </button>
          </div>
        </div>
      )}

      {q.status !== 'closed' && (
        <>
          {/* Долбёжка активна — можно погасить без смены статуса */}
          {q.awaiting_ack && (
            <button
              onClick={async () => setQ(await ackQuestion(q))}
              className="mb-3 w-full rounded-full bg-terra/15 text-terra
                py-3.5 min-h-[52px] font-semibold"
            >
              ⏰ Помню, ещё в работе
            </button>
          )}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setStatusOpen(true)}
              className="flex-1 rounded-full bg-black/[0.03] py-3.5 min-h-[52px] font-medium"
            >
              Переместить
            </button>
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
                bg-black/[0.03] text-ink shrink-0"
            >
              <BellRinging size={22} weight="light" />
            </button>
          </div>

          {remindPickerOpen && (
            <div className="bezel mb-4">
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
                    setQ(await setRemindAt(q, new Date(remindValue)))
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

      {/* Связанные задачи */}
      <div className="mb-6">
        <div className="flex items-center justify-between px-2 mb-2">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">
            Связанные задачи
          </h2>
          <button
            onClick={() => setChildAddOpen(true)}
            className="flex items-center gap-1 text-xs font-semibold text-sakura min-h-[32px]"
          >
            <Plus size={14} weight="bold" />
            Создать
          </button>
        </div>
        {children.length === 0 ? (
          <p className="px-2 text-sm text-muted">Пока нет</p>
        ) : (
          <div className="space-y-2">
            {children.map((c) => (
              <Link key={c.id} to={`/question/${c.id}`} className="block bezel">
                <div className="bezel-core p-3.5 flex items-center gap-2">
                  <StatusBadge status={c.status} />
                  <span className="text-sm line-clamp-1">{c.summary}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

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

      <StatusSheet
        question={q}
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        onChanged={(updated) => {
          setQ(updated)
          fetchLog(q.id).then(setLog)
        }}
        onRequestClose={() => setCloseOpen(true)}
        onRequestDiscard={() => setDiscardOpen(true)}
      />

      <DiscardSheet
        question={q}
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onDone={() => {
          setDiscardOpen(false)
          navigate('/')
        }}
      />

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

      <QuickAddModal
        open={childAddOpen}
        parentId={q.id}
        onClose={() => setChildAddOpen(false)}
        onSaved={() => {
          setChildAddOpen(false)
          load()
        }}
      />
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Eye } from '@phosphor-icons/react'
import type { Question, Status } from '../lib/types'
import { OPEN_STATUSES, STATUS_LABEL } from '../lib/types'
import { fetchClosedQuestions, fetchOpenQuestions, getUser } from '../lib/api'
import { fmtDate, hangLabel } from '../lib/reminders'
import { CategoryBadge, PriorityBadge, StatusBadge } from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'

type Tab = 'open' | 'closed'

/** Задачи коллеги — только просмотр, без свайпов и смены статусов. */
export default function PersonScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [tab, setTab] = useState<Tab>('open')
  const [items, setItems] = useState<Question[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    getUser(id)
      .then((u) => setName(u.name))
      .catch(() => {})
  }, [id])

  useEffect(() => {
    if (!id) return
    setItems(null)
    setError('')
    const load = tab === 'open' ? fetchOpenQuestions(id) : fetchClosedQuestions(undefined, id)
    load.then(setItems).catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
  }, [id, tab])

  const sections = useMemo(() => {
    const list = items ?? []
    if (tab === 'open') {
      return OPEN_STATUSES.map((status) => ({
        key: status,
        title: STATUS_LABEL[status as Status],
        items: list.filter((q) => q.status === status),
      })).filter((s) => s.items.length > 0)
    }
    const byDay = new Map<string, Question[]>()
    for (const q of list) {
      const day = fmtDate(q.closed_at ?? q.created_at)
      byDay.set(day, [...(byDay.get(day) ?? []), q])
    }
    return [...byDay.entries()].map(([day, qs]) => ({ key: day, title: day, items: qs }))
  }, [items, tab])

  return (
    <div className="mx-auto max-w-md px-4 pt-safe">
      <header className="pt-6 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            aria-label="Назад"
            className="grid place-items-center h-11 w-11 rounded-full bg-black/[0.03] shrink-0"
          >
            <ArrowLeft size={20} weight="light" />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">{name || '…'}</h1>
            <p className="flex items-center gap-1 text-xs text-muted">
              <Eye size={14} weight="light" />
              только просмотр
            </p>
          </div>
        </div>

        <div className="mt-4 flex rounded-full bg-black/[0.04] p-1">
          {(
            [
              ['open', 'Текущие'],
              ['closed', 'Выполненные'],
            ] as const
          ).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-full py-2 text-sm font-medium
                transition-colors duration-500 ease-koneko
                ${tab === t ? 'bg-white shadow-soft text-ink' : 'text-muted'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {error && <p className="text-sm text-terra mb-3">{error}</p>}

      {items === null && !error && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bezel animate-pulse">
              <div className="bezel-core h-20" />
            </div>
          ))}
        </div>
      )}

      {items !== null && items.length === 0 && (
        <EmptyState
          title={tab === 'open' ? 'Открытых задач нет' : 'Пока ничего не выполнено'}
          subtitle=""
        />
      )}

      {sections.map((s) => (
        <section key={s.key} className="mb-5">
          <h2 className="flex items-baseline gap-2 text-xs font-semibold text-muted uppercase tracking-wide px-2 mb-2">
            {s.title}
            <span className="text-sakura font-bold">{s.items.length}</span>
          </h2>
          <div className="space-y-2.5">
            {s.items.map((q) => (
              <Link key={q.id} to={`/question/${q.id}`} className="block bezel">
                <div className="bezel-core p-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={q.status} />
                    <PriorityBadge priority={q.priority} />
                    <CategoryBadge category={q.category} />
                    <span className="ml-auto text-[11px] text-muted">
                      {hangLabel(q.created_at)}
                    </span>
                  </div>
                  <p className="mt-2.5 font-medium leading-snug line-clamp-3">{q.summary}</p>
                  {tab === 'closed' && q.resolution && (
                    <p className="mt-1.5 text-sm text-[#6E8A66] line-clamp-2">
                      → {q.resolution}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                    {q.author && <span>{q.author}</span>}
                    {q.dp_number && <span>ДП №{q.dp_number}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

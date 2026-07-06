import { useEffect, useMemo, useState } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { useNavigate } from 'react-router-dom'
import type { Question } from '../lib/types'
import { fetchClosedQuestions } from '../lib/api'
import { fmtDate } from '../lib/reminders'
import EmptyState from '../components/EmptyState'

export default function ArchiveScreen() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Question[] | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => {
      fetchClosedQuestions(search).then(setItems).catch(() => setItems([]))
    }, 250)
    return () => clearTimeout(t)
  }, [search])

  const groups = useMemo(() => {
    const map = new Map<string, Question[]>()
    for (const q of items ?? []) {
      const day = fmtDate(q.closed_at ?? q.created_at)
      map.set(day, [...(map.get(day) ?? []), q])
    }
    return [...map.entries()]
  }, [items])

  return (
    <div className="mx-auto max-w-md px-4 pt-safe">
      <header className="pt-8 pb-4">
        <h1 className="text-2xl font-bold">Архив</h1>
        <div className="mt-4 flex items-center gap-2 rounded-full bg-black/[0.03] px-5 py-3">
          <MagnifyingGlass size={18} weight="light" className="text-muted shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по тексту"
            className="w-full bg-transparent outline-none text-[16px]"
          />
        </div>
      </header>

      {items !== null && groups.length === 0 && (
        <EmptyState
          title={search ? 'Ничего не нашлось' : 'Архив пуст'}
          subtitle={search ? 'Попробуй другой запрос' : 'Закрытые вопросы появятся здесь'}
        />
      )}

      {groups.map(([day, qs]) => (
        <section key={day} className="mb-5">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wide px-2 mb-2">
            {day}
          </h2>
          <div className="space-y-2.5">
            {qs.map((q) => (
              <button
                key={q.id}
                onClick={() => navigate(`/question/${q.id}`)}
                className="w-full text-left bezel"
              >
                <div className="bezel-core p-4">
                  <p className="font-medium leading-snug line-clamp-2">{q.summary}</p>
                  {q.closed_reason === 'irrelevant' ? (
                    <p className="mt-1.5 text-sm text-muted line-clamp-2">
                      <span
                        className="inline-block rounded-full bg-black/[0.05] px-2 py-0.5
                          text-[11px] font-semibold mr-1.5 align-middle"
                      >
                        Не актуально
                      </span>
                      {q.resolution}
                    </p>
                  ) : (
                    q.resolution && (
                      <p className="mt-1.5 text-sm text-[#6E8A66] line-clamp-2">
                        → {q.resolution}
                      </p>
                    )
                  )}
                  {q.author && (
                    <p className="mt-1 text-xs text-muted">{q.author}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

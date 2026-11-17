import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CaretRight } from '@phosphor-icons/react'
import type { Colleague } from '../lib/types'
import { fetchColleagues } from '../lib/api'
import { getMe } from '../lib/http'
import EmptyState from '../components/EmptyState'

/** Список коллег: у каждого видно, сколько открытых задач. Только просмотр. */
export default function PeopleScreen() {
  const navigate = useNavigate()
  const me = getMe()
  const [people, setPeople] = useState<Colleague[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchColleagues()
      .then((list) => setPeople(list.filter((p) => p.id !== me?.id)))
      .catch((e) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
  }, [me?.id])

  return (
    <div className="mx-auto max-w-md px-4 pt-safe">
      <header className="pt-8 pb-4">
        <h1 className="text-2xl font-bold">Коллеги</h1>
        <p className="mt-1 text-sm text-muted">Текущие задачи — только просмотр</p>
      </header>

      {error && <p className="text-sm text-terra mb-3">{error}</p>}

      {people === null && !error && (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bezel animate-pulse">
              <div className="bezel-core h-16" />
            </div>
          ))}
        </div>
      )}

      {people !== null && people.length === 0 && (
        <EmptyState
          title="Пока никого"
          subtitle={
            me?.is_admin
              ? 'Добавь коллег в Настройках → Пользователи'
              : 'Администратор ещё не добавил коллег'
          }
        />
      )}

      <div className="space-y-2.5">
        {people?.map((p) => (
          <button
            key={p.id}
            onClick={() => navigate(`/people/${p.id}`)}
            className="w-full text-left bezel"
          >
            <div className="bezel-core p-4 flex items-center gap-3">
              <span
                className="grid place-items-center h-10 w-10 rounded-full bg-sakura/15
                  text-[#B5787D] font-bold shrink-0"
              >
                {p.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{p.name}</p>
                <p className="text-xs text-muted">
                  Открыто: {p.open_count}
                  {p.in_progress_count > 0 && ` · в работе: ${p.in_progress_count}`}
                </p>
              </div>
              <CaretRight size={18} weight="light" className="text-muted shrink-0" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

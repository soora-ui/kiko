import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { PaperPlaneTilt, Warning } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import type { Category, Priority, Question } from '../lib/types'
import { CATEGORY_LABEL, STATUS_LABEL } from '../lib/types'
import { createQuestion } from '../lib/api'
import { ApiError } from '../lib/http'

const priorities: { value: Priority; label: string }[] = [
  { value: 'urgent', label: '🔥 Срочно' },
  { value: 'normal', label: '◯ Обычно' },
  { value: 'low', label: '・Потом' },
]

const categories: { value: Category; label: string }[] = [
  { value: 'question', label: CATEGORY_LABEL.question },
  { value: 'task', label: CATEGORY_LABEL.task },
  { value: 'improvement', label: CATEGORY_LABEL.improvement },
]

/** Растягивает textarea под содержимое до maxHeight, дальше — скролл внутри. */
function autosize(el: HTMLTextAreaElement | null, maxHeight = 320) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
}

/** Автор — эвристикой: всё до первого тире/запятой. */
function guessAuthor(text: string): string {
  const m = text.match(/^([^,—–-]{2,40})[,—–-]/)
  return m ? m[1].trim() : ''
}

type Duplicate = Pick<Question, 'id' | 'summary' | 'status' | 'author'>

export default function QuickAddModal({
  open,
  onClose,
  onSaved,
  parentId = null,
  requireDp = false,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  parentId?: string | null
  /** Создание связанного ДП — номер документа обязателен и вынесен основным полем. */
  requireDp?: boolean
}) {
  const [text, setText] = useState('')
  const [priority, setPriority] = useState<Priority>('normal')
  const [category, setCategory] = useState<Category>('question')
  const [dpNumber, setDpNumber] = useState('')
  const [author, setAuthor] = useState('')
  const [authorTouched, setAuthorTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [duplicates, setDuplicates] = useState<Duplicate[]>([])
  const ref = useRef<HTMLTextAreaElement>(null)
  const dpRef = useRef<HTMLInputElement>(null)

  const suggested = useMemo(() => guessAuthor(text), [text])
  const effectiveAuthor = authorTouched ? author : suggested

  useEffect(() => {
    if (open) {
      setText('')
      setPriority('normal')
      setCategory('question')
      setDpNumber('')
      setAuthor('')
      setAuthorTouched(false)
      setError('')
      setDuplicates([])
      // автофокус после анимации открытия — на номер ДП, если это его создание
      setTimeout(() => (requireDp ? dpRef.current : ref.current)?.focus(), 80)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const save = async (force = false) => {
    if (!text.trim() || busy) return
    if (requireDp && !dpNumber.trim()) return
    setBusy(true)
    setError('')
    try {
      await createQuestion({
        raw_text: text.trim(),
        author: effectiveAuthor.trim() || null,
        priority,
        category,
        dp_number: dpNumber.trim() || null,
        parent_id: parentId,
        force,
      })
      onSaved()
    } catch (e) {
      // Похожий вопрос уже открыт — предупреждаем, даём создать осознанно
      if (e instanceof ApiError && e.status === 409) {
        setDuplicates((e.body?.duplicates as Duplicate[]) ?? [])
      } else {
        setError(e instanceof Error ? e.message : 'Не удалось сохранить')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-ink/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 top-[8dvh] z-50 mx-3"
            initial={{ opacity: 0, y: -24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="bezel">
              <div className="bezel-core p-4">
                {parentId && (
                  <p className="mb-2 px-1 text-xs font-semibold text-muted uppercase tracking-wide">
                    {requireDp ? 'Связанный документ поддержки (ДП)' : 'Связанная задача'}
                  </p>
                )}

                {requireDp && (
                  <input
                    ref={dpRef}
                    value={dpNumber}
                    onChange={(e) => setDpNumber(e.target.value)}
                    placeholder="Номер ДП"
                    inputMode="numeric"
                    className="mb-3 w-full rounded-2xl bg-sakura/10 px-4 py-3.5
                      text-[16px] font-semibold outline-none
                      focus:ring-2 focus:ring-sakura/50 placeholder:font-normal placeholder:text-muted"
                  />
                )}

                <textarea
                  ref={ref}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value)
                    setDuplicates([])
                    autosize(e.target)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save()
                  }}
                  placeholder="Иванова из бухгалтерии — не работает выгрузка в 1С"
                  rows={4}
                  className="w-full rounded-2xl bg-black/[0.03] p-4 outline-none
                    focus:ring-2 focus:ring-sakura/50 resize-none text-[16px] overflow-y-auto"
                />

                <div className="mt-3 flex gap-2">
                  {priorities.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setPriority(p.value)}
                      className={`flex-1 rounded-full px-3 py-2.5 text-sm font-medium
                        transition-colors duration-500 ease-koneko min-h-[44px]
                        ${
                          priority === p.value
                            ? p.value === 'urgent'
                              ? 'bg-terra/15 text-terra ring-1 ring-terra/30'
                              : 'bg-sakura/15 text-ink ring-1 ring-sakura/40'
                            : 'bg-black/[0.03] text-muted'
                        }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="mt-2 flex gap-2">
                  {categories.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setCategory(c.value)}
                      className={`flex-1 rounded-full px-3 py-2.5 text-sm font-medium
                        transition-colors duration-500 ease-koneko min-h-[44px]
                        ${
                          category === c.value
                            ? 'bg-sakura/15 text-ink ring-1 ring-sakura/40'
                            : 'bg-black/[0.03] text-muted'
                        }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                {(suggested || authorTouched) && (
                  <input
                    value={effectiveAuthor}
                    onChange={(e) => {
                      setAuthorTouched(true)
                      setAuthor(e.target.value)
                    }}
                    placeholder="Кто спросил"
                    className="mt-3 w-full rounded-full bg-black/[0.03] px-5 py-2.5
                      text-sm outline-none focus:ring-2 focus:ring-sakura/50"
                  />
                )}

                {error && <p className="mt-2 text-sm text-terra">{error}</p>}

                {duplicates.length > 0 && (
                  <div className="mt-3 rounded-2xl bg-terra/10 p-4">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-terra mb-2">
                      <Warning size={16} weight="light" />
                      Похоже, такой вопрос уже есть
                    </p>
                    <div className="space-y-1.5 mb-3">
                      {duplicates.map((d) => (
                        <Link
                          key={d.id}
                          to={`/question/${d.id}`}
                          onClick={onClose}
                          className="block text-sm underline underline-offset-2 line-clamp-1"
                        >
                          {STATUS_LABEL[d.status]} · {d.summary}
                        </Link>
                      ))}
                    </div>
                    <button
                      onClick={() => save(true)}
                      disabled={busy}
                      className="w-full rounded-full bg-white py-2.5 min-h-[44px]
                        text-sm font-semibold disabled:opacity-40"
                    >
                      Всё равно создать
                    </button>
                  </div>
                )}

                {duplicates.length === 0 && (
                  <button
                    onClick={() => save()}
                    disabled={!text.trim() || (requireDp && !dpNumber.trim()) || busy}
                    className="mt-4 w-full pill-primary disabled:opacity-40
                      flex items-center justify-between pl-6 pr-2 py-2 min-h-[52px]"
                  >
                    <span>{busy ? 'Сохраняю…' : 'Сохранить'}</span>
                    <span className="grid place-items-center h-10 w-10 rounded-full bg-white/25">
                      <PaperPlaneTilt size={20} weight="light" />
                    </span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

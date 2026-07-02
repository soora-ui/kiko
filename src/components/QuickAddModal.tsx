import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { PaperPlaneTilt } from '@phosphor-icons/react'
import type { Priority } from '../lib/types'
import { createQuestion } from '../lib/api'

const priorities: { value: Priority; label: string }[] = [
  { value: 'urgent', label: '🔥 Срочно' },
  { value: 'normal', label: '◯ Обычно' },
  { value: 'low', label: '・Потом' },
]

/** Автор — эвристикой: всё до первого тире/запятой. */
function guessAuthor(text: string): string {
  const m = text.match(/^([^,—–-]{2,40})[,—–-]/)
  return m ? m[1].trim() : ''
}

export default function QuickAddModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [text, setText] = useState('')
  const [priority, setPriority] = useState<Priority>('normal')
  const [author, setAuthor] = useState('')
  const [authorTouched, setAuthorTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  const suggested = useMemo(() => guessAuthor(text), [text])
  const effectiveAuthor = authorTouched ? author : suggested

  useEffect(() => {
    if (open) {
      setText('')
      setPriority('normal')
      setAuthor('')
      setAuthorTouched(false)
      setError('')
      // автофокус после анимации открытия
      setTimeout(() => ref.current?.focus(), 80)
    }
  }, [open])

  const save = async () => {
    if (!text.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      await createQuestion({
        raw_text: text.trim(),
        author: effectiveAuthor.trim() || null,
        priority,
      })
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить')
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
                <textarea
                  ref={ref}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save()
                  }}
                  placeholder="Иванова из бухгалтерии — не работает выгрузка в 1С"
                  rows={4}
                  className="w-full rounded-2xl bg-black/[0.03] p-4 outline-none
                    focus:ring-2 focus:ring-sakura/50 resize-none text-[16px]"
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

                <button
                  onClick={save}
                  disabled={!text.trim() || busy}
                  className="mt-4 w-full pill-primary disabled:opacity-40
                    flex items-center justify-between pl-6 pr-2 py-2 min-h-[52px]"
                >
                  <span>{busy ? 'Сохраняю…' : 'Сохранить'}</span>
                  <span className="grid place-items-center h-10 w-10 rounded-full bg-white/25">
                    <PaperPlaneTilt size={20} weight="light" />
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

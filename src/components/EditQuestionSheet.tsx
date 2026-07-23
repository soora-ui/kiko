import { useEffect, useRef, useState } from 'react'
import { PencilSimple } from '@phosphor-icons/react'
import Sheet from './Sheet'
import type { Category, Question } from '../lib/types'
import { CATEGORY_LABEL } from '../lib/types'
import { editQuestion } from '../lib/api'

const categories: Category[] = ['question', 'task', 'improvement']

/** Растягивает textarea под содержимое до maxHeight, дальше — скролл внутри. */
function autosize(el: HTMLTextAreaElement | null, maxHeight = 360) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
}

/** Редактирование карточки вопроса: текст, автор, категория, номер ДП. */
export default function EditQuestionSheet({
  question,
  open,
  onClose,
  onSaved,
}: {
  question: Question | null
  open: boolean
  onClose: () => void
  onSaved: (updated: Question) => void
}) {
  const [text, setText] = useState('')
  const [author, setAuthor] = useState('')
  const [category, setCategory] = useState<Category>('question')
  const [dpNumber, setDpNumber] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open && question) {
      setText(question.raw_text)
      setAuthor(question.author ?? '')
      setCategory(question.category)
      setDpNumber(question.dp_number ?? '')
      setError('')
      setTimeout(() => autosize(ref.current), 80)
    }
  }, [open, question])

  if (!question) return null

  const save = async () => {
    if (!text.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      const updated = await editQuestion(question, {
        raw_text: text.trim(),
        author: author.trim() || null,
        category,
        dp_number: dpNumber.trim() || null,
      })
      onSaved(updated)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose}>
      <p className="text-sm text-muted mb-3">Редактировать вопрос</p>

      <textarea
        ref={ref}
        autoFocus
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          autosize(e.target)
        }}
        rows={4}
        className="w-full rounded-2xl bg-black/[0.03] p-4 outline-none
          focus:ring-2 focus:ring-sakura/50 resize-none text-[16px] overflow-y-auto"
      />

      <div className="mt-3 flex gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`flex-1 rounded-full px-3 py-2.5 text-sm font-medium
              transition-colors duration-500 ease-koneko min-h-[44px]
              ${
                category === c
                  ? 'bg-sakura/15 text-ink ring-1 ring-sakura/40'
                  : 'bg-black/[0.03] text-muted'
              }`}
          >
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      <input
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        placeholder="Кто спросил"
        className="mt-3 w-full rounded-full bg-black/[0.03] px-5 py-2.5
          text-sm outline-none focus:ring-2 focus:ring-sakura/50"
      />

      <input
        value={dpNumber}
        onChange={(e) => setDpNumber(e.target.value)}
        placeholder="Номер ДП (если связан с документом поддержки)"
        className="mt-2 w-full rounded-full bg-black/[0.03] px-5 py-2.5
          text-sm outline-none focus:ring-2 focus:ring-sakura/50"
      />

      {error && <p className="mt-3 text-sm text-terra">{error}</p>}

      <button
        onClick={save}
        disabled={!text.trim() || busy}
        className="mt-4 w-full pill-primary disabled:opacity-40
          flex items-center justify-between pl-6 pr-2 py-2 min-h-[52px]"
      >
        <span>{busy ? 'Сохраняю…' : 'Сохранить'}</span>
        <span className="grid place-items-center h-10 w-10 rounded-full bg-white/25">
          <PencilSimple size={20} weight="light" />
        </span>
      </button>
    </Sheet>
  )
}

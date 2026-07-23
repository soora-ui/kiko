import { LinkSimple } from '@phosphor-icons/react'
import type { Category, Priority, Status } from '../lib/types'
import { CATEGORY_LABEL, PRIORITY_LABEL, STATUS_LABEL } from '../lib/types'

const statusStyles: Record<Status, string> = {
  new: 'bg-sakura/15 text-[#B5787D]',
  in_progress: 'bg-[#E8D9A0]/25 text-[#9A8A4A]',
  review: 'bg-[#A0C3BE]/25 text-[#4F7E77]',
  waiting: 'bg-[#A0B8C3]/20 text-[#5F7E8C]',
  clarification: 'bg-[#C3A0B8]/20 text-[#8C5F7E]',
  dev: 'bg-[#A0A8C3]/20 text-[#5F668C]',
  postponed: 'bg-black/[0.05] text-muted',
  closed: 'bg-sage/20 text-[#6E8A66]',
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5
        text-[11px] font-semibold ${statusStyles[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

const categoryStyles: Record<Category, string> = {
  task: 'bg-[#A0B8C3]/20 text-[#5F7E8C]',
  question: 'bg-black/[0.05] text-muted',
  improvement: 'bg-[#C3A0B8]/20 text-[#8C5F7E]',
}

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5
        text-[11px] font-semibold ${categoryStyles[category]}`}
    >
      {CATEGORY_LABEL[category]}
    </span>
  )
}

/** Обозначает карточку, созданную от родительского вопроса — иначе связь не видна без открытия карточки. */
export function LinkedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-black/[0.05]
        text-muted px-2.5 py-0.5 text-[11px] font-semibold"
      title="Создано от другого вопроса"
    >
      <LinkSimple size={11} weight="bold" />
      Связан
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  if (priority === 'normal') return null
  const style =
    priority === 'urgent'
      ? 'bg-terra/15 text-terra'
      : 'bg-black/[0.04] text-muted'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5
        text-[11px] font-semibold ${style}`}
    >
      {priority === 'urgent' ? '🔥 ' : ''}
      {PRIORITY_LABEL[priority]}
    </span>
  )
}

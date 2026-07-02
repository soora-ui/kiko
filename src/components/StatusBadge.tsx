import type { Priority, Status } from '../lib/types'
import { PRIORITY_LABEL, STATUS_LABEL } from '../lib/types'

const statusStyles: Record<Status, string> = {
  new: 'bg-sakura/15 text-[#B5787D]',
  in_progress: 'bg-[#E8D9A0]/25 text-[#9A8A4A]',
  waiting: 'bg-[#A0B8C3]/20 text-[#5F7E8C]',
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

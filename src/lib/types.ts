export type Status = 'new' | 'in_progress' | 'waiting' | 'closed'
export type Priority = 'urgent' | 'normal' | 'low'

export interface Question {
  id: string
  created_at: string
  updated_at: string
  closed_at: string | null
  raw_text: string
  author: string | null
  summary: string | null
  status: Status
  priority: Priority
  waiting_for: string | null
  remind_at: string | null
  remind_interval_minutes: number
  snooze_count: number
  resolution: string | null
}

export type ActivityEventType =
  | 'created'
  | 'status_changed'
  | 'snoozed'
  | 'closed'
  | 'note_added'
  | 'reminded'

export interface ActivityEvent {
  id: string
  created_at: string
  question_id: string
  event: ActivityEventType
  detail: Record<string, unknown> | null
}

export const STATUS_LABEL: Record<Status, string> = {
  new: 'Новый',
  in_progress: 'В работе',
  waiting: 'Жду ответа',
  closed: 'Закрыт',
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: 'Срочно',
  normal: 'Обычно',
  low: 'Потом',
}

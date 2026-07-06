export type Status =
  | 'new'
  | 'in_progress'
  | 'review'
  | 'waiting'
  | 'clarification'
  | 'dev'
  | 'postponed'
  | 'closed'

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
  clarification: string | null
  remind_at: string | null
  remind_interval_minutes: number
  snooze_count: number
  awaiting_ack: boolean
  closed_reason: 'irrelevant' | null
  parent_id: string | null
  ai_suggestion: string | null
  ai_followup: string | null
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

export interface KnowledgeDoc {
  id: string
  created_at: string
  title: string
  kind: 'manual' | 'experience'
  size: number
}

export const STATUS_LABEL: Record<Status, string> = {
  new: 'Новый',
  in_progress: 'В работе',
  review: 'Проверить',
  waiting: 'Жду ответа',
  clarification: 'Требуется уточнение',
  dev: 'Передал программисту',
  postponed: 'Отложено',
  closed: 'Выполнено',
}

/** Открытые статусы в порядке секций на главном экране. */
export const OPEN_STATUSES: Exclude<Status, 'closed'>[] = [
  'new',
  'in_progress',
  'review',
  'clarification',
  'waiting',
  'dev',
  'postponed',
]

/** Причины «Не актуально» — должны совпадать с сервером. */
export const DISCARD_REASONS = [
  'Потеряло актуальность',
  'Пользователь сам разобрался',
  'Нет ответа от пользователя',
  'Невнимательность пользователя',
] as const

export const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: 'Срочно',
  normal: 'Обычно',
  low: 'Потом',
}

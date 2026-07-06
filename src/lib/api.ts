import { apiFetch } from './http'
import type {
  ActivityEvent,
  KnowledgeDoc,
  Priority,
  Question,
  Status,
} from './types'
import { initialRemindAt } from './reminders'
import { loadSettings } from './settings'

export async function fetchOpenQuestions(): Promise<Question[]> {
  const data = await apiFetch<Question[]>('/questions')
  return sortFeed(data)
}

/** urgent → просроченные → остальные по remind_at (раздел 6.1). */
function sortFeed(items: Question[]): Question[] {
  const now = Date.now()
  const rank = (q: Question) => {
    if (q.priority === 'urgent') return 0
    if (q.remind_at && new Date(q.remind_at).getTime() <= now) return 1
    return 2
  }
  return [...items].sort((a, b) => {
    const r = rank(a) - rank(b)
    if (r !== 0) return r
    const ta = a.remind_at ? new Date(a.remind_at).getTime() : Infinity
    const tb = b.remind_at ? new Date(b.remind_at).getTime() : Infinity
    return ta - tb
  })
}

export function fetchClosedQuestions(search?: string): Promise<Question[]> {
  const qs = new URLSearchParams({ scope: 'closed' })
  if (search?.trim()) qs.set('search', search.trim())
  return apiFetch<Question[]>(`/questions?${qs}`)
}

export function getQuestion(id: string): Promise<Question> {
  return apiFetch<Question>(`/questions/${id}`)
}

export function fetchLog(questionId: string): Promise<ActivityEvent[]> {
  return apiFetch<ActivityEvent[]>(`/questions/${questionId}/log`)
}

export function fetchChildren(questionId: string): Promise<Question[]> {
  return apiFetch<Question[]>(`/questions/${questionId}/children`)
}

/** Бросает ApiError со status=409 и body.duplicates, если похожий вопрос уже открыт. */
export function createQuestion(input: {
  raw_text: string
  author: string | null
  priority: Priority
  parent_id?: string | null
  force?: boolean
}): Promise<Question> {
  return apiFetch<Question>('/questions', {
    method: 'POST',
    body: JSON.stringify({
      ...input,
      remind_at: initialRemindAt(input.priority, loadSettings()).toISOString(),
    }),
  })
}

export function setStatus(
  q: Question,
  status: Status,
  extra?: { waiting_for?: string | null; clarification?: string | null },
): Promise<Question> {
  return apiFetch<Question>(`/questions/${q.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'status', status, ...extra }),
  })
}

export function snoozeQuestion(q: Question, until: Date): Promise<Question> {
  return apiFetch<Question>(`/questions/${q.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'snooze', until: until.toISOString() }),
  })
}

export function setRemindAt(q: Question, at: Date): Promise<Question> {
  return apiFetch<Question>(`/questions/${q.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'remind', at: at.toISOString() }),
  })
}

/** «Помню, в работе» — гасит 5-минутную долбёжку до следующего обычного шага. */
export function ackQuestion(q: Question): Promise<Question> {
  return apiFetch<Question>(`/questions/${q.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'ack' }),
  })
}

/** «Не актуально» → в архив с выбранной пометкой. */
export function discardQuestion(q: Question, reason: string): Promise<Question> {
  return apiFetch<Question>(`/questions/${q.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'discard', reason }),
  })
}

export function closeQuestion(q: Question, resolution: string): Promise<Question> {
  return apiFetch<Question>(`/questions/${q.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'close', resolution }),
  })
}

export function answerFollowup(q: Question, answer: string): Promise<Question> {
  return apiFetch<Question>(`/questions/${q.id}/followup`, {
    method: 'POST',
    body: JSON.stringify({ answer }),
  })
}

// ── База знаний ──────────────────────────────────────────────────

export function fetchDocuments(): Promise<{
  documents: KnowledgeDoc[]
  ai_enabled: boolean
}> {
  return apiFetch('/documents')
}

export function createDocument(title: string, content: string): Promise<KnowledgeDoc> {
  return apiFetch<KnowledgeDoc>('/documents', {
    method: 'POST',
    body: JSON.stringify({ title, content }),
  })
}

export function deleteDocument(id: string): Promise<void> {
  return apiFetch(`/documents/${id}`, { method: 'DELETE' })
}

// ── Отчёт и экспорт ──────────────────────────────────────────────

export function fetchQuestionsBetween(
  from: Date,
  to: Date,
): Promise<{ arrived: Question[]; closed: Question[]; openAtEnd: Question[] }> {
  const qs = new URLSearchParams({
    from: from.toISOString(),
    to: to.toISOString(),
  })
  return apiFetch(`/report?${qs}`)
}

export async function exportAllData(): Promise<Blob> {
  const payload = await apiFetch<unknown>('/export')
  return new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
}

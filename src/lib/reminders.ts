import type { Priority } from './types'
import type { Settings } from './settings'

const dowIso = (d: Date) => (d.getDay() === 0 ? 7 : d.getDay())

export function isWorkTime(d: Date, s: Settings): boolean {
  return (
    s.workDays.includes(dowIso(d)) &&
    d.getHours() >= s.workStart &&
    d.getHours() < s.workEnd
  )
}

/** Ближайшее рабочее утро (workStart:minute), строго после `from`. */
export function nextWorkMorning(
  from: Date,
  s: Settings,
  minute = 30,
): Date {
  const d = new Date(from)
  d.setHours(s.workStart, minute, 0, 0)
  if (d <= from) d.setDate(d.getDate() + 1)
  while (!s.workDays.includes(dowIso(d))) d.setDate(d.getDate() + 1)
  return d
}

/** Если момент выпал на ночь/выходные — переносим на ближайшее рабочее утро. */
export function clampToWorkWindow(d: Date, s: Settings): Date {
  if (isWorkTime(d, s)) return d
  const morning = new Date(d)
  morning.setHours(s.workStart, 30, 0, 0)
  // ещё не наступило рабочее утро того же дня
  if (s.workDays.includes(dowIso(d)) && d < morning) return morning
  return nextWorkMorning(d, s)
}

/** Дефолтный remind_at по приоритету (раздел 5 ТЗ). */
export function initialRemindAt(priority: Priority, s: Settings, now = new Date()): Date {
  switch (priority) {
    case 'urgent':
      return clampToWorkWindow(new Date(now.getTime() + 2 * 60 * 60 * 1000), s)
    case 'normal':
      return nextWorkMorning(now, s)
    case 'low': {
      const d = new Date(now)
      d.setDate(d.getDate() + 2)
      d.setHours(s.workStart, 30, 0, 0)
      return clampToWorkWindow(d, s)
    }
  }
}

export interface SnoozePreset {
  label: string
  date: Date
}

export function snoozePresets(s: Settings, now = new Date()): SnoozePreset[] {
  return [
    { label: '+1 ч', date: clampToWorkWindow(new Date(now.getTime() + 3600_000), s) },
    { label: '+4 ч', date: clampToWorkWindow(new Date(now.getTime() + 4 * 3600_000), s) },
    { label: 'Завтра утром', date: nextWorkMorning(now, s) },
  ]
}

/** «висит 3 ч» / «висит 5 дн» */
export function hangLabel(createdAt: string, now = new Date()): string {
  const ms = now.getTime() - new Date(createdAt).getTime()
  const hours = Math.floor(ms / 3600_000)
  if (hours < 1) return 'только что'
  if (hours < 24) return `висит ${hours} ч`
  return `висит ${Math.floor(hours / 24)} дн`
}

export function fmtDateTime(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function fmtDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

import type { Question } from './types'

export interface ReportData {
  userName: string
  from: Date
  to: Date
  arrived: number
  closed: Question[]
  openAtEnd: Question[]
}

export const fmtDuration = (ms: number): string => {
  const h = ms / 3600_000
  if (h < 1) return `${Math.max(1, Math.round(ms / 60000))} мин`
  if (h < 24) return `${Math.round(h)} ч`
  return `${Math.round(h / 24)} дн`
}

export function reportStats(data: ReportData) {
  const closeTimes = data.closed
    .filter((q) => q.closed_at)
    .map((q) => new Date(q.closed_at!).getTime() - new Date(q.created_at).getTime())
  const avgClose =
    closeTimes.length > 0
      ? closeTimes.reduce((a, b) => a + b, 0) / closeTimes.length
      : null
  return {
    arrived: data.arrived,
    closed: data.closed.length,
    open: data.openAtEnd.length,
    avgCloseLabel: avgClose !== null ? fmtDuration(avgClose) : '—',
  }
}

import { createElement, useCallback, useEffect, useMemo, useState } from 'react'
import { DownloadSimple, ShareNetwork } from '@phosphor-icons/react'
import type { Question } from '../lib/types'
import { fetchQuestionsBetween } from '../lib/api'
import { reportStats, type ReportData } from '../lib/stats'

type Period = 'today' | 'week' | 'custom'

function periodRange(p: Period, customFrom: string, customTo: string): [Date, Date] {
  const now = new Date()
  if (p === 'today') {
    const from = new Date(now)
    from.setHours(0, 0, 0, 0)
    return [from, now]
  }
  if (p === 'week') {
    const from = new Date(now)
    const dow = from.getDay() === 0 ? 7 : from.getDay()
    from.setDate(from.getDate() - dow + 1)
    from.setHours(0, 0, 0, 0)
    return [from, now]
  }
  const from = customFrom ? new Date(customFrom) : new Date(now)
  const to = customTo ? new Date(customTo) : new Date(now)
  to.setHours(23, 59, 59, 999)
  return [from, to]
}

const isoDay = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

export default function ReportScreen() {
  const [period, setPeriod] = useState<Period>('week')
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return isoDay(d)
  })
  const [customTo, setCustomTo] = useState(() => isoDay(new Date()))
  const [data, setData] = useState<{
    arrived: Question[]
    closed: Question[]
    openAtEnd: Question[]
  } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const [from, to] = useMemo(
    () => periodRange(period, customFrom, customTo),
    [period, customFrom, customTo],
  )

  const load = useCallback(async () => {
    setData(null)
    try {
      setData(await fetchQuestionsBetween(from, to))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    }
  }, [from, to])

  useEffect(() => {
    load()
  }, [load])

  const reportData: ReportData | null = data
    ? {
        userName: '',
        from,
        to,
        arrived: data.arrived.length,
        closed: data.closed,
        openAtEnd: data.openAtEnd,
      }
    : null

  const stats = reportData ? reportStats(reportData) : null

  const topAuthors = useMemo(() => {
    if (!data) return []
    const counts = new Map<string, number>()
    for (const q of data.arrived) {
      if (!q.author) continue
      counts.set(q.author, (counts.get(q.author) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
  }, [data])

  const makePdf = async (): Promise<File> => {
    // react-pdf тяжёлый — грузим лениво, только когда просят PDF
    const [{ pdf }, { default: ReportPDF }] = await Promise.all([
      import('@react-pdf/renderer'),
      import('../pdf/ReportPDF'),
    ])
    const element = createElement(ReportPDF, { data: reportData! })
    const blob = await pdf(element as Parameters<typeof pdf>[0]).toBlob()
    const name = `kiko-report-${isoDay(from)}-${isoDay(to)}.pdf`
    return new File([blob], name, { type: 'application/pdf' })
  }

  const download = async () => {
    if (!reportData || busy) return
    setBusy(true)
    try {
      const file = await makePdf()
      const url = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось создать PDF')
    } finally {
      setBusy(false)
    }
  }

  const share = async () => {
    if (!reportData || busy) return
    setBusy(true)
    try {
      const file = await makePdf()
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Отчёт по обращениям' })
      } else {
        // fallback — просто скачиваем
        const url = URL.createObjectURL(file)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e) {
      // отмена шаринга пользователем — не ошибка
      if (e instanceof Error && e.name !== 'AbortError') setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-safe">
      <header className="pt-8 pb-4">
        <h1 className="text-2xl font-bold">Отчёт</h1>
      </header>

      <div className="flex gap-1.5 mb-4">
        {(
          [
            ['today', 'Сегодня'],
            ['week', 'Эта неделя'],
            ['custom', 'Период'],
          ] as [Period, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setPeriod(value)}
            className={`flex-1 rounded-full py-2.5 text-sm font-medium min-h-[44px]
              transition-colors duration-500 ease-koneko
              ${
                period === value
                  ? 'bg-sakura/15 text-ink ring-1 ring-sakura/40'
                  : 'bg-black/[0.03] text-muted'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div className="flex gap-2 mb-4">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="flex-1 rounded-full bg-black/[0.03] px-4 py-3 outline-none"
          />
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="flex-1 rounded-full bg-black/[0.03] px-4 py-3 outline-none"
          />
        </div>
      )}

      {error && <p className="text-sm text-terra mb-3">{error}</p>}

      {stats && (
        <div className="bezel mb-4">
          <div className="bezel-core p-5">
            <div className="grid grid-cols-2 gap-4">
              <Stat value={String(stats.arrived)} label="пришло" />
              <Stat value={String(stats.closed)} label="закрыто" />
              <Stat value={String(stats.open)} label="сейчас открыто" />
              <Stat value={stats.avgCloseLabel} label="среднее закрытие" />
            </div>
            {topAuthors.length > 0 && (
              <div className="mt-5 pt-4 border-t border-black/5">
                <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
                  Чаще всех спрашивали
                </p>
                {topAuthors.map(([name, count]) => (
                  <div key={name} className="flex justify-between text-sm py-0.5">
                    <span>{name}</span>
                    <span className="text-muted">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-8">
        <button
          onClick={download}
          disabled={!reportData || busy}
          className="flex-1 pill-primary py-2 pl-6 pr-2 min-h-[52px] disabled:opacity-40
            flex items-center justify-between"
        >
          <span>{busy ? 'Готовлю…' : 'Скачать PDF'}</span>
          <span className="grid place-items-center h-10 w-10 rounded-full bg-white/25">
            <DownloadSimple size={20} weight="light" />
          </span>
        </button>
        <button
          onClick={share}
          disabled={!reportData || busy}
          aria-label="Поделиться"
          className="grid place-items-center h-[52px] w-[52px] rounded-full
            bg-black/[0.03] disabled:opacity-40"
        >
          <ShareNetwork size={22} weight="light" />
        </button>
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-xs text-muted mt-0.5">{label}</div>
    </div>
  )
}

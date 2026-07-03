import { apiFetch } from './http'

export interface Settings {
  workStart: number // час начала рабочего окна
  workEnd: number // час конца
  workDays: number[] // 1 = пн … 7 = вс
  eveningCheck: boolean
  lunchEnabled: boolean // обед без пушей
  lunchStart: number
  lunchEnd: number
}

export const DEFAULT_SETTINGS: Settings = {
  workStart: 9,
  workEnd: 19,
  workDays: [1, 2, 3, 4, 5],
  eveningCheck: false,
  lunchEnabled: false,
  lunchStart: 13,
  lunchEnd: 14,
}

const KEY = 'kiko-settings'

/** Локальный кэш — для мгновенных расчётов remind_at на клиенте. */
export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function cacheSettings(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

/** Источник правды — сервер (по этим настройкам работают напоминания). */
export async function fetchSettings(): Promise<Settings> {
  const s = await apiFetch<Settings>('/settings')
  cacheSettings(s)
  return s
}

export async function saveSettings(s: Settings): Promise<void> {
  cacheSettings(s)
  await apiFetch('/settings', { method: 'PUT', body: JSON.stringify(s) })
}

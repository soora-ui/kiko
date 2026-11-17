const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

if (!API_URL) {
  console.warn('Кико: VITE_API_URL не задан — заполни .env.local (см. .env.example)')
}

const TOKEN_KEY = 'kiko-token'
const ME_KEY = 'kiko-me'

export interface Me {
  id: string
  login: string
  name: string
  is_admin: boolean
}

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ME_KEY)
}

/** Кто вошёл — для разделения «моё / чужое (только просмотр)». */
export function getMe(): Me | null {
  try {
    const raw = localStorage.getItem(ME_KEY)
    return raw ? (JSON.parse(raw) as Me) : null
  } catch {
    return null
  }
}

export const setMe = (me: Me) => localStorage.setItem(ME_KEY, JSON.stringify(me))

/** Просроченный/невалидный токен → событие, App покажет экран входа. */
export const UNAUTHORIZED_EVENT = 'kiko-unauthorized'

export class ApiError extends Error {
  status: number
  body: Record<string, unknown> | null

  constructor(status: number, body: Record<string, unknown> | null) {
    super((body?.error as string) ?? `Ошибка ${status}`)
    this.status = status
    this.body = body
  }
}

/**
 * fetch() не даёт HTTP-статус, если API недоступен, TLS сломан или
 * браузер заблокировал CORS. Не показываем пользователю техническое
 * `Failed to fetch`: даём понятную причину, но сохраняем original error для DevTools.
 */
export class ApiConnectionError extends Error {
  cause: unknown

  constructor(cause: unknown) {
    super('Нет связи с сервером. Проверь интернет или попробуй позже')
    this.name = 'ApiConnectionError'
    this.cause = cause
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getToken()
  let res: Response
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    })
  } catch (error) {
    throw new ApiConnectionError(error)
  }
  if (res.status === 401 && path !== '/login') {
    clearToken()
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    throw new ApiError(401, { error: 'Сессия истекла — войди заново' })
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, body)
  }
  return res.json() as Promise<T>
}

export async function login(loginName: string, password: string): Promise<void> {
  const { token, user } = await apiFetch<{ token: string; user: Me }>('/login', {
    method: 'POST',
    body: JSON.stringify({ login: loginName, password }),
  })
  setToken(token)
  setMe(user)
}

export async function register(name: string, loginName: string, password: string): Promise<void> {
  const { token, user } = await apiFetch<{ token: string; user: Me }>('/register', {
    method: 'POST',
    body: JSON.stringify({ name, login: loginName, password }),
  })
  setToken(token)
  setMe(user)
}

/** Освежить «кто я» (имя/права могли поменяться). */
export async function refreshMe(): Promise<Me> {
  const me = await apiFetch<Me>('/me')
  setMe(me)
  return me
}

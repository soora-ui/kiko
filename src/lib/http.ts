const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

if (!API_URL) {
  console.warn('Кико: VITE_API_URL не задан — заполни .env.local (см. .env.example)')
}

const TOKEN_KEY = 'kiko-token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

/** Просроченный/невалидный токен → событие, App покажет экран входа. */
export const UNAUTHORIZED_EVENT = 'kiko-unauthorized'

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_URL}/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
  if (res.status === 401 && path !== '/login') {
    clearToken()
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
    throw new Error('Сессия истекла — войди заново')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `Ошибка ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function login(password: string): Promise<void> {
  const { token } = await apiFetch<{ token: string }>('/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
  setToken(token)
}

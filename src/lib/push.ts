import { apiFetch } from './http'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // старый iOS-флаг
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export type PushState =
  | 'unsupported'
  | 'default'
  | 'denied'
  | 'subscribed'
  | 'granted-not-subscribed'

export async function getPushState(): Promise<PushState> {
  if (!('Notification' in window) || !('PushManager' in window)) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission === 'default') return 'default'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub ? 'subscribed' : 'granted-not-subscribed'
}

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(what)), ms),
    ),
  ])
}

/**
 * Ждём активный service worker. serviceWorker.ready может висеть вечно
 * (например, SW ещё качает precache на медленной сети) — поэтому таймаут.
 */
async function waitForServiceWorker(): Promise<ServiceWorkerRegistration> {
  return withTimeout(
    navigator.serviceWorker.ready,
    20_000,
    'Приложение ещё устанавливается (service worker не активен). Подожди полминуты и попробуй ещё раз.',
  )
}

/**
 * Вызывать ТОЛЬКО из обработчика явного тапа по кнопке —
 * иначе iOS молча откажет (раздел 2 ТЗ).
 * onStep — прогресс для UI, чтобы было видно, где застряло.
 */
export async function enablePush(
  onStep?: (step: string) => void,
): Promise<PushState> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Этот браузер не поддерживает service worker')
  }

  onStep?.('Запрашиваю разрешение…')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'default'

  onStep?.('Жду установки приложения…')
  const reg = await waitForServiceWorker()

  onStep?.('Создаю подписку…')
  let sub = await withTimeout(
    reg.pushManager.getSubscription(),
    10_000,
    'Не удалось проверить подписку — попробуй ещё раз',
  )
  if (!sub) {
    sub = await withTimeout(
      reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          import.meta.env.VITE_VAPID_PUBLIC_KEY,
        ),
      }),
      20_000,
      'Push-сервис Apple не ответил — проверь интернет и попробуй ещё раз',
    )
  }

  onStep?.('Сохраняю на сервере…')
  const json = sub.toJSON()
  await apiFetch('/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
      user_agent: navigator.userAgent,
    }),
  })
  return 'subscribed'
}

export async function sendTestPush(): Promise<void> {
  await apiFetch('/push/test', { method: 'POST' })
}

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
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  return sub ? 'subscribed' : 'granted-not-subscribed'
}

/**
 * Вызывать ТОЛЬКО из обработчика явного тапа по кнопке —
 * иначе iOS молча откажет (раздел 2 ТЗ).
 */
export async function enablePush(): Promise<PushState> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'default'

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        import.meta.env.VITE_VAPID_PUBLIC_KEY,
      ),
    })
  }

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

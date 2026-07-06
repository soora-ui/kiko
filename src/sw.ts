/// <reference lib="WebWorker" />
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
self.skipWaiting()
clientsClaim()

interface PushPayload {
  title: string
  body: string
  tag?: string
  url?: string
  // Кнопка «Помню, в работе» (показывается на Android/десктопе; iOS
  // кнопки в веб-пушах не отображает — там кнопка в приложении)
  actions?: { action: string; title: string }[]
  ackUrl?: string
}

self.addEventListener('push', (e) => {
  if (!e.data) return
  const data = e.data.json() as PushPayload
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag, // схлопывание дублей по question_id
      data: { url: data.url ?? '/', ackUrl: data.ackUrl },
      ...(data.actions ? { actions: data.actions } : {}),
    } as NotificationOptions),
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const { url = '/', ackUrl } = (e.notification.data ?? {}) as {
    url?: string
    ackUrl?: string
  }

  // Тап по кнопке «Помню» — гасим долбёжку, приложение не открываем
  if (e.action === 'ack' && ackUrl) {
    e.waitUntil(fetch(ackUrl, { method: 'POST' }).catch(() => {}))
    return
  }

  e.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      const existing = all[0]
      if (existing) {
        await existing.focus()
        existing.navigate(url)
      } else {
        await self.clients.openWindow(url)
      }
    })(),
  )
})

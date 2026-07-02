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
}

self.addEventListener('push', (e) => {
  if (!e.data) return
  const data = e.data.json() as PushPayload
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag, // схлопывание дублей по question_id
      data: { url: data.url ?? '/' },
    }),
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = (e.notification.data?.url as string) ?? '/'
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

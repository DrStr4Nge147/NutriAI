const CACHE_NAME = 'nutriai-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      await cache.addAll([
        '/',
        '/index.html',
        '/manifest.webmanifest',
        '/icons/icon-192.svg',
        '/icons/icon-512.svg',
      ])
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request

  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME)

      if (request.mode === 'navigate') {
        try {
          const network = await fetch('/index.html', { cache: 'no-store' })
          const copy = network.clone()
          if (network.ok && copy.type === 'basic') await cache.put('/index.html', copy)
          return network
        } catch {
          const cached = await cache.match('/index.html')
          if (cached) return cached
          throw new Error('Offline')
        }
      }

      const cached = await cache.match(request)
      if (cached) {
        void fetch(request)
          .then((resp) => {
            if (resp.ok && resp.type === 'basic') return cache.put(request, resp.clone())
          })
          .catch(() => {})
        return cached
      }

      try {
        const network = await fetch(request)
        if (network.ok && network.type === 'basic') await cache.put(request, network.clone())
        return network
      } catch {
        const fallback = await cache.match(request)
        if (fallback) return fallback
        return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
      }
    })(),
  )
})

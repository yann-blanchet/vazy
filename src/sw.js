/* eslint-disable no-restricted-globals */
import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'

// Precache all assets
precacheAndRoute(self.__WB_MANIFEST)

// Cache API calls with network first strategy
registerRoute(
  ({ url }) => url.origin === new URL(import.meta.env.VITE_SUPABASE_URL).origin,
  new NetworkFirst({
    cacheName: 'supabase-api-cache',
    plugins: []
  })
)

// Cache static assets with cache first
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache'
  })
)

// Skip waiting and activate immediately
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})


// A revisão é preenchida pelo build. HTML, Auth, RPCs e dados de usuários nunca entram no cache.
const CACHE_PREFIX = 'service-guide-pwa-'
const CACHE_NAME = CACHE_PREFIX + '__PWA_REVISION__'
const OFFLINE = '/offline'
const SHELL = [
  OFFLINE,
  '/app-icons/icon-192.png',
  '/app-icons/icon-512.png',
  '/app-icons/apple-touch-icon.png',
]
const MAX_ENTRIES = 64

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME) await caches.delete(name)
      }
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  if (request.mode === 'navigate') {
    // Sempre consulta o servidor: preserva sessão, nonce CSP e os dados comerciais atuais.
    event.respondWith(
      fetch(request).catch(async () => {
        const fallback = await (await caches.open(CACHE_NAME)).match(OFFLINE)
        if (!fallback) return Response.error()
        const headers = new Headers(fallback.headers)
        headers.set('Cache-Control', 'no-store')
        headers.set('X-Service-Guide-Offline', 'true')
        return new Response(fallback.body, { status: 200, headers })
      }),
    )
    return
  }
  const staticAsset =
    !url.search &&
    (/^\/assets\/[\w.-]+\.(js|css|woff2?|ttf|png|webp|avif|svg)$/.test(url.pathname) ||
      /^\/app-icons\/[\w-]+\.png$/.test(url.pathname) ||
      /^\/guide\/fonts\/[\w-]+\.(ttf|woff2?)$/.test(url.pathname))
  if (!staticAsset) return
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      const cached = await cache.match(request)
      if (cached) return cached
      const response = await fetch(request)
      if (
        response.status === 200 &&
        !response.redirected &&
        !/private|no-store/i.test(response.headers.get('cache-control') || '') &&
        /^(text\/(css|javascript)|application\/(javascript|x-javascript|font-woff)|font\/|image\/)/i.test(
          response.headers.get('content-type') || '',
        )
      ) {
        const copy = response.clone()
        event.waitUntil(
          (async () => {
            await cache.put(request, copy)
            const keys = await cache.keys()
            const removable = keys.filter((key) => !SHELL.includes(new URL(key.url).pathname))
            for (const key of removable.slice(0, Math.max(0, keys.length - MAX_ENTRIES)))
              await cache.delete(key)
          })().catch(() => {}),
        )
      }
      return response
    })(),
  )
})

const CACHE = 'pst-v1'
const ASSETS_PATH = new URL('./assets/', self.location.href).pathname

const cacheable = (res) => res && res.status === 200 && res.type === 'basic'

// Cache writes never throw and are kept alive with event.waitUntil.
const store = (event, key, res) => {
  const write = caches
    .open(CACHE)
    .then((cache) => cache.put(key, res))
    .catch(() => {})
  try {
    event.waitUntil(write)
  } catch {
    // The event is no longer extendable; the write still runs, it just isn't kept alive.
  }
}

// On weak wifi a page fetch can hang for a long time; past this we show the cached page.
const NAV_TIMEOUT_MS = 2500

// Install caches the page and the hashed assets it references. The worker
// registers after the first load has already fetched them, so without this an
// offline relaunch after one visit would find the page but not its JS/CSS.
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      const res = await fetch('./index.html', { cache: 'no-cache' })
      if (!cacheable(res)) throw new Error('index.html not cacheable')
      const html = await res.clone().text()
      await cache.put('./index.html', res.clone())
      await cache.put('./', res.clone())
      const assets = new Set()
      for (const m of html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/g)) {
        try {
          const u = new URL(m[1], self.location.href)
          if (u.origin === self.location.origin && u.pathname.startsWith(ASSETS_PATH)) {
            assets.add(u.href)
          }
        } catch {
          // ignore unparseable values
        }
      }
      await Promise.all(
        [...assets].map((href) =>
          fetch(href)
            .then((r) => (cacheable(r) ? cache.put(href, r) : undefined))
            .catch(() => {}),
        ),
      )
      await self.skipWaiting()
    })(),
  )
})

// Old cache versions are dropped. Hashed assets from past deploys stay in the
// current cache (accepted growth: tens of KB per deploy).
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Pages: network-first so a new deploy shows up on the next load, but the cached
  // page wins if the network is slow (2.5 s), fails, or answers with an error.
  if (req.mode === 'navigate') {
    const net = fetch(req, { cache: 'no-cache' }).then((res) => {
      if (cacheable(res)) store(event, './index.html', res.clone())
      return res
    })
    // Lets a slow response still refresh the cache after we've answered from it.
    event.waitUntil(net.catch(() => {}))
    event.respondWith(
      (async () => {
        let timer
        const timeout = new Promise((resolve) => {
          timer = setTimeout(() => resolve(null), NAV_TIMEOUT_MS)
        })
        let res = null
        try {
          res = await Promise.race([net, timeout])
        } catch {
          // offline: fall through to the cache
        }
        clearTimeout(timer)
        if (res && res.ok) return res
        const hit = await caches.match('./index.html', { ignoreSearch: true })
        if (hit) return hit
        // Nothing cached (first visit): wait for the network, whatever it says.
        return res || net.catch(() => Response.error())
      })(),
    )
    return
  }

  // Hashed build assets never change under the same name: cache-first.
  if (url.pathname.startsWith(ASSETS_PATH)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (cacheable(res)) store(event, req, res.clone())
            return res
          }),
      ),
    )
    return
  }

  // Everything else (manifest, icons): stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (cacheable(res)) store(event, req, res.clone())
          return res
        })
        .catch(() => undefined)
      event.waitUntil(net)
      return hit || net.then((res) => res || Response.error())
    }),
  )
})

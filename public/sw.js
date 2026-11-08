const CACHE = 'pst-v1'
const PRECACHE = ['./', './index.html']
const ASSETS_PATH = new URL('./assets/', self.location.href).pathname

const cacheable = (res) => res && res.status === 200 && res.type === 'basic'

// Cache writes never throw and are kept alive with event.waitUntil.
const store = (event, key, res) => {
  const write = caches
    .open(CACHE)
    .then((cache) => cache.put(key, res))
    .catch(() => {})
  event.waitUntil(write)
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()),
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

  // Pages: network-first so a new deploy shows up on the next load.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then((res) => {
          if (cacheable(res)) store(event, './index.html', res.clone())
          return res
        })
        .catch(() =>
          caches
            .match('./index.html', { ignoreSearch: true })
            .then((hit) => hit || Response.error()),
        ),
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

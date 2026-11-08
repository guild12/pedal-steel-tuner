import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'

type Res = { text(): Promise<string>; url: string; status: number; type: string; body: string; clone(): Res }
const BASE = 'https://x/app/'
const res = (body: string, status = 200, type = 'basic'): Res => ({
  url: '', status, type, body, clone() { return this }, text: async () => body,
})

function setup() {
  const cache = new Map<string, Res>()
  const state = { online: true, delay: 0, network: new Map<string, Res>() }
  const key = (r: string | { url: string }, ignoreSearch = false) => {
    const u = new URL(typeof r === 'string' ? r : r.url, BASE + 'sw.js')
    if (ignoreSearch) u.search = ''
    return u.href
  }
  const handlers: Record<string, (e: unknown) => void> = {}
  const caches = {
    open: async () => ({
      addAll: async (us: string[]) => us.forEach((u) => cache.set(key(u), state.network.get(key('./index.html')) ?? res('pre'))),
      put: async (r: string | { url: string }, v: Res) => {
        if (v.status === 206) throw new TypeError('206 not cacheable')
        cache.set(key(r), v)
      },
    }),
    match: async (r: string | { url: string }, o?: { ignoreSearch?: boolean }) => {
      const k = key(r, o?.ignoreSearch)
      for (const [ck, v] of cache) if ((o?.ignoreSearch ? key(ck, true) : ck) === k) return v
      return undefined
    },
    keys: async () => ['pst-v1'],
    delete: async () => true,
  }
  const g = {
    location: new URL(BASE + 'sw.js'),
    skipWaiting() {}, clients: { claim() {} },
    addEventListener: (t: string, f: (e: unknown) => void) => { handlers[t] = f },
  }
  const fetchFn = async (r: string | { url: string }) => {
    if (!state.online) throw new TypeError('offline')
    if (state.delay) await new Promise((r) => setTimeout(r, state.delay))
    const v = state.network.get(key(r))
    if (!v) return res('nf', 404)
    return v
  }
  const ResponseG = { error: () => ({ err: true }) }
  new Function('self', 'caches', 'fetch', 'Response', readFileSync('public/sw.js', 'utf8'))(g, caches, fetchFn, ResponseG)
  const pending: Promise<unknown>[] = []
  const send = async (url: string, mode = 'cors', settle = true) => {
    let out: unknown
    handlers.fetch({
      request: { method: 'GET', url, mode },
      respondWith: (p: Promise<unknown>) => { out = p },
      waitUntil: (p: Promise<unknown>) => { pending.push(p) },
    })
    const r = await out
    if (settle) await Promise.all(pending)
    return r as Res & { err?: boolean }
  }
  const install = async () => {
    const waits: Promise<unknown>[] = []
    handlers.install({ waitUntil: (p: Promise<unknown>) => waits.push(p) })
    await Promise.all(waits)
  }
  return { cache, state, send, key, install, pending }
}

describe('service worker', () => {
  const page = BASE
  afterEach(() => vi.useRealTimers())
  it('serves the network page online and refreshes the cache; new deploys show on next load', async () => {
    const t = setup()
    t.state.network.set(t.key(page), res('v1'))
    expect((await t.send(page, 'navigate')).body).toBe('v1')
    expect(t.cache.get(t.key('./index.html'))?.body).toBe('v1')
    t.state.network.set(t.key(page), res('v2'))
    expect((await t.send(page, 'navigate')).body).toBe('v2')
    t.state.online = false
    expect((await t.send(page, 'navigate')).body).toBe('v2')
  })
  it('install precaches the page and its hashed assets so the first offline launch works', async () => {
    const t = setup()
    const html = '<script type="module" crossorigin src="/app/assets/index-abc.js"></script><link rel="stylesheet" href="/app/assets/index-def.css"><link href="manifest.webmanifest">'
    t.state.network.set(t.key(page), res(html))
    t.state.network.set(t.key('./index.html'), res(html))
    t.state.network.set(t.key(BASE + 'assets/index-abc.js'), res('JS'))
    t.state.network.set(t.key(BASE + 'assets/index-def.css'), res('CSS'))
    await t.install()
    t.state.online = false
    expect((await t.send(BASE + 'assets/index-abc.js')).body).toBe('JS')
    expect((await t.send(BASE + 'assets/index-def.css')).body).toBe('CSS')
    expect((await t.send(page, 'navigate')).body).toBe(html)
  })
  it('install still finishes when the page references no assets', async () => {
    const t = setup()
    t.state.network.set(t.key('./index.html'), res('<p>hi</p>'))
    await t.install()
    expect(t.cache.has(t.key('./index.html'))).toBe(true)
  })
  it('serves cached index.html offline, including for query-string navigations', async () => {
    const t = setup()
    t.state.network.set(t.key(page), res('v1'))
    await t.send(page, 'navigate')
    t.state.online = false
    expect((await t.send(page + '?x=1', 'navigate')).body).toBe('v1')
    expect(t.cache.size).toBe(1)
  })
  it('does not cache 206 responses and does not throw', async () => {
    const t = setup()
    t.state.network.set(t.key(BASE + 'assets/a.js'), res('part', 206))
    expect((await t.send(BASE + 'assets/a.js')).status).toBe(206)
    expect(t.cache.has(t.key(BASE + 'assets/a.js'))).toBe(false)
  })
  it('assets are cache-first; other files stale-while-revalidate', async () => {
    const t = setup()
    t.state.network.set(t.key(BASE + 'assets/a.js'), res('A1'))
    t.state.network.set(t.key(BASE + 'icon-192.png'), res('I1'))
    await t.send(BASE + 'assets/a.js'); await t.send(BASE + 'icon-192.png')
    t.state.network.set(t.key(BASE + 'assets/a.js'), res('A2'))
    t.state.network.set(t.key(BASE + 'icon-192.png'), res('I2'))
    expect((await t.send(BASE + 'assets/a.js')).body).toBe('A1')
    expect((await t.send(BASE + 'icon-192.png')).body).toBe('I1')
    expect(t.cache.get(t.key(BASE + 'icon-192.png'))?.body).toBe('I2')
    t.state.online = false
    expect((await t.send(BASE + 'assets/a.js')).body).toBe('A1')
  })
  it('serves the cached page after 2.5 s when the network is slow, and still refreshes the cache', async () => {
    vi.useFakeTimers()
    const t = setup()
    t.cache.set(t.key('./index.html'), res('cached'))
    t.state.network.set(t.key(page), res('fresh'))
    t.state.delay = 5000
    const p = t.send(page, 'navigate', false)
    await vi.advanceTimersByTimeAsync(2400)
    let early = false
    void p.then(() => { early = true })
    await Promise.resolve()
    expect(early).toBe(false)
    await vi.advanceTimersByTimeAsync(100)
    expect((await p).body).toBe('cached')
    await vi.advanceTimersByTimeAsync(3000)
    await Promise.all(t.pending)
    expect(t.cache.get(t.key('./index.html'))?.body).toBe('fresh')
  })
  it('serves the cached page when navigation returns a 404', async () => {
    const t = setup()
    t.cache.set(t.key('./index.html'), res('cached'))
    t.state.network.set(t.key(page), res('gone', 404))
    expect((await t.send(page, 'navigate')).body).toBe('cached')
  })
})

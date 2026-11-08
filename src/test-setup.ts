import '@testing-library/jest-dom/vitest'

// jsdom has no canvas; Waterfall treats a null context as "nothing to draw".
HTMLCanvasElement.prototype.getContext = (() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(cleanup)

// Node 25 ships its own half-working global localStorage that shadows jsdom's; use an in-memory one.
if (typeof localStorage === 'undefined' || typeof localStorage.clear !== 'function') {
  const data = new Map<string, string>()
  const mem: Storage = {
    get length() { return data.size },
    clear: () => data.clear(),
    getItem: (k) => (data.has(k) ? data.get(k)! : null),
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  }
  Object.defineProperty(globalThis, 'localStorage', { value: mem, configurable: true })
}

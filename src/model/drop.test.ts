import { describe, expect, it } from 'vitest'
import { averageDrop, steadyCents } from './drop'

const series = (n: number, step: number, f: (i: number) => number) =>
  Array.from({ length: n }, (_, i) => ({ cents: f(i), timeMs: i * step }))

describe('steadyCents', () => {
  it('returns the median of a steady 800 ms reading', () => {
    const s = series(9, 100, (i) => 2.0 + (i % 2 ? 0.2 : -0.2))
    expect(steadyCents(s)).toBeCloseTo(2.0, 0)
  })
  it('returns null when one sample jumps by +3', () => {
    const s = series(9, 100, (i) => (i === 5 ? 5.0 : 2.0))
    expect(steadyCents(s)).toBeNull()
  })
  it('returns null with only 500 ms of data', () => {
    expect(steadyCents(series(6, 100, () => 2.0))).toBeNull()
  })
})

describe('steadyCents coverage', () => {
  it('returns null for two samples 800 ms apart', () => {
    expect(steadyCents([{ cents: 2, timeMs: 0 }, { cents: 2, timeMs: 800 }])).toBeNull()
  })
})

describe('averageDrop', () => {
  it('averages pairs, rounded to 0.1', () => {
    expect(averageDrop([{ up: 2, down: -4.1 }, { up: 1.8, down: -4.5 }])).toBe(6.2)
  })
})

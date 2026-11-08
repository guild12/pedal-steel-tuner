import { describe, expect, it } from 'vitest'
import { sierra14 } from '../model/seeds/sierra14'
import { lockResolves } from './lock'

describe('lockResolves', () => {
  it('accepts existing positions and rejects vanished ones', () => {
    expect(lockResolves(sierra14, { string: 5, change: 'P3', stop: 0 })).toBe(true)
    expect(lockResolves(sierra14, { string: 5, change: null, stop: 0 })).toBe(true)
    expect(lockResolves(sierra14, { string: 5, change: 'P3', stop: 1 })).toBe(false)
    expect(lockResolves(sierra14, { string: 5, change: 'P9', stop: 0 })).toBe(false)
    expect(lockResolves(sierra14, { string: 99, change: null, stop: 0 })).toBe(false)
  })
})

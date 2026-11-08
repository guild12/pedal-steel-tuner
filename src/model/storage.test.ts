import { beforeEach, describe, expect, it } from 'vitest'
import { exportProfile } from './exportProfile'
import { sierra14 } from './seeds/sierra14'
import { loadProfile, saveProfile, STORAGE_KEY } from './storage'

beforeEach(() => localStorage.clear())

describe('storage', () => {
  it('round-trips a profile', () => {
    const p = { ...sierra14, name: 'Mine', cabinetDrop: 6.3 }
    saveProfile(p)
    expect(loadProfile()).toEqual(p)
  })

  it('returns sierra14 when storage is empty', () => {
    expect(loadProfile()).toEqual(sierra14)
  })

  it('falls back to sierra14 on corrupt JSON and keeps a copy of the bad text', () => {
    localStorage.setItem(STORAGE_KEY, '{oops')
    expect(loadProfile()).toEqual(sierra14)
    expect(localStorage.getItem('pst-profiles-v1-corrupt')).toBe('{oops')
  })

  it('treats the wrong shape as corrupt', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, profile: sierra14 }))
    expect(loadProfile()).toEqual(sierra14)
    expect(localStorage.getItem('pst-profiles-v1-corrupt')).not.toBeNull()
  })
})

describe('exportProfile', () => {
  it('writes format, version and the 14 Sierra strings', () => {
    const j = JSON.parse(exportProfile(sierra14))
    expect(j.format).toBe('pedal-steel-tuner/profile')
    expect(j.version).toBe(1)
    expect(j.profile.strings).toHaveLength(14)
  })
})

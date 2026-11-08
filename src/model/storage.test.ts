import { beforeEach, describe, expect, it } from 'vitest'
import { exportProfile } from './exportProfile'
import { sierra14 } from './seeds/sierra14'
import { isValidProfile, loadProfile, resetSavedProfile, saveProfile, STORAGE_KEY } from './storage'

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

describe('deep validation', () => {
  const bad = (mutate: (p: any) => void) => {
    const p = structuredClone(sierra14) as any
    mutate(p)
    return p
  }
  it('rejects a partial open note and backs up the raw text', () => {
    const p = bad((x) => (x.strings[0].openNote = 'G#'))
    saveProfile(p)
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(loadProfile()).toEqual(sierra14)
    expect(localStorage.getItem('pst-profiles-v1-corrupt')).toBe(raw)
  })
  it('accepts sierra14 and rejects each kind of damage', () => {
    expect(isValidProfile(sierra14)).toBe(true)
    expect(isValidProfile(bad((x) => (x.strings[1].changes = null)))).toBe(false)
    expect(isValidProfile(bad((x) => (x.strings[1].changes[0].stops = {})))).toBe(false)
    expect(isValidProfile(bad((x) => (x.strings[1].changes[0].stops[0].semitones = 1.5)))).toBe(false)
    expect(isValidProfile(bad((x) => (x.strings[1].changes[0].stops[0].semitones = NaN)))).toBe(false)
    expect(isValidProfile(bad((x) => (x.strings[0].openTarget = { kind: 'sideways' })))).toBe(false)
    expect(isValidProfile(bad((x) => (x.strings[0].openTarget = { kind: 'cents' })))).toBe(false)
    expect(isValidProfile(bad((x) => delete x.noteTable.C))).toBe(false)
    expect(isValidProfile(bad((x) => (x.noteTable.C = 'a')))).toBe(false)
    expect(isValidProfile(bad((x) => (x.cabinetDrop = 31)))).toBe(false)
    expect(isValidProfile(bad((x) => (x.cabinetDrop = -1)))).toBe(false)
    expect(isValidProfile(bad((x) => (x.aRef = 4)))).toBe(false)
    expect(isValidProfile(bad((x) => (x.aRef = 451)))).toBe(false)
  })
  it('resetSavedProfile moves saved data to the corrupt key', () => {
    localStorage.setItem(STORAGE_KEY, 'xyz')
    resetSavedProfile()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem('pst-profiles-v1-corrupt')).toBe('xyz')
  })
})

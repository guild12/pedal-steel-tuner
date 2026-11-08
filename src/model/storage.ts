import { sierra14 } from './seeds/sierra14'
import type { Profile } from './types'

export const STORAGE_KEY = 'pst-profiles-v1'
const CORRUPT_KEY = `${STORAGE_KEY}-corrupt`

const NOTE_RE = /^([A-G]#?)(-?\d+)$/
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const fin = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)

function validRule(r: unknown): boolean {
  const x = r as { kind?: unknown; cents?: unknown } | null
  if (!x || typeof x !== 'object') return false
  if (x.kind === 'up' || x.kind === 'down') return true
  return x.kind === 'cents' && fin(x.cents)
}

/** Deep check: anything that would make the tuner screen throw counts as invalid. */
export function isValidProfile(p: unknown): p is Profile {
  const x = p as Partial<Profile> | null
  if (!x || typeof x !== 'object') return false
  if (typeof x.name !== 'string' || !Array.isArray(x.controls) || !Array.isArray(x.strings)) return false
  if (!fin(x.cabinetDrop) || x.cabinetDrop < 0 || x.cabinetDrop > 30) return false
  if (!fin(x.aRef) || x.aRef < 430 || x.aRef > 450) return false
  const t = x.noteTable as Record<string, unknown> | undefined
  if (!t || typeof t !== 'object' || !NAMES.every((n) => fin(t[n]))) return false
  return x.strings.every(
    (s) =>
      !!s &&
      fin(s.number) &&
      typeof s.openNote === 'string' &&
      NOTE_RE.test(s.openNote) &&
      validRule(s.openTarget) &&
      Array.isArray(s.changes) &&
      s.changes.every(
        (c) =>
          !!c &&
          typeof c.control === 'string' &&
          Array.isArray(c.stops) &&
          c.stops.every((st) => !!st && Number.isInteger(st.semitones) && validRule(st.target)),
      ),
  )
}

export function loadProfile(): Profile {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return sierra14
  }
  if (raw === null) return sierra14
  try {
    const data = JSON.parse(raw)
    if (data && data.version === 1 && isValidProfile(data.profile)) return data.profile
  } catch {
    // fall through to the corrupt path
  }
  try {
    localStorage.setItem(CORRUPT_KEY, raw)
  } catch {
    // nothing more we can do
  }
  return sierra14
}

export function saveProfile(p: Profile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, profile: p }))
  } catch {
    // storage full or blocked: the in-memory profile still works
  }
}

/** Moves whatever is saved to the corrupt key so the next load starts from the seed. */
export function resetSavedProfile(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw !== null) localStorage.setItem(CORRUPT_KEY, raw)
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

import { sierra14 } from './seeds/sierra14'
import type { Profile } from './types'

export const STORAGE_KEY = 'pst-profiles-v1'
const CORRUPT_KEY = `${STORAGE_KEY}-corrupt`

function looksLikeProfile(p: unknown): p is Profile {
  const x = p as Partial<Profile> | null
  return (
    !!x &&
    typeof x === 'object' &&
    typeof x.name === 'string' &&
    Array.isArray(x.strings) &&
    Array.isArray(x.controls) &&
    typeof x.cabinetDrop === 'number' &&
    typeof x.aRef === 'number' &&
    !!x.noteTable &&
    typeof x.noteTable === 'object'
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
    if (data && data.version === 1 && looksLikeProfile(data.profile)) return data.profile
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

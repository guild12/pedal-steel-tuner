import type { Profile } from '../model/types'
import type { Lock } from './TunerScreen'

/** True when the locked string, change and stop still exist in the profile. */
export function lockResolves(p: Profile, lock: Lock): boolean {
  const s = p.strings.find((x) => x.number === lock.string)
  if (!s) return false
  if (lock.change === null) return true
  return !!s.changes.find((c) => c.control === lock.change)?.stops[lock.stop]
}

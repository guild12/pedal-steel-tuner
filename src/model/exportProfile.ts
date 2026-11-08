import type { Profile } from './types'

export function exportProfile(p: Profile): string {
  return JSON.stringify({ format: 'pedal-steel-tuner/profile', version: 1, profile: p }, null, 2)
}

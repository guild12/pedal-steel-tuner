import type { NoteName } from '../pitch/notes'
import type { Profile, TargetRule } from './types'

export const T = 14.49

const NAMES: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export function frenchNoteTable(): Record<NoteName, number> {
  return {
    C: 0, 'C#': -T, D: 0, 'D#': -T, E: 0, F: -2 * T,
    'F#': 0, G: 0, 'G#': -T, A: 0, 'A#': 0, B: 0,
  }
}

export function ruleCents(rule: TargetRule, note: NoteName, p: Profile): number {
  if (rule.kind === 'cents') return rule.cents
  return p.noteTable[note] + (rule.kind === 'up' ? p.cabinetDrop : 0)
}

export function gaugeTargets(note: NoteName, p: Profile): { up: number; down: number } {
  return { up: ruleCents({ kind: 'up' }, note, p), down: ruleCents({ kind: 'down' }, note, p) }
}

function shiftNote(note: string, semitones: number): { name: NoteName; label: string } {
  const m = /^([A-G]#?)(-?\d+)$/.exec(note)
  if (!m) throw new Error(`Bad note: ${note}`)
  const midi = (Number(m[2]) + 1) * 12 + NAMES.indexOf(m[1] as NoteName) + semitones
  const name = NAMES[((midi % 12) + 12) % 12]
  return { name, label: `${name}${Math.floor(midi / 12) - 1}` }
}

export function positionTarget(
  p: Profile,
  stringNumber: number,
  change: string | null,
  stop = 0,
): { note: string; cents: number } {
  const s = p.strings.find((x) => x.number === stringNumber)
  if (!s) throw new Error(`No string ${stringNumber}`)
  if (change === null) {
    const { name, label } = shiftNote(s.openNote, 0)
    return { note: label, cents: ruleCents(s.openTarget, name, p) }
  }
  const c = s.changes.find((x) => x.control === change)
  const st = c?.stops[stop]
  if (!st) throw new Error(`No change ${change} stop ${stop} on string ${stringNumber}`)
  const { name, label } = shiftNote(s.openNote, st.semitones)
  return { note: label, cents: ruleCents(st.target, name, p) }
}

export function positionsForNote(
  p: Profile,
  note: NoteName,
): { string: number; change: string | null; stop: number; cents: number }[] {
  const out: { string: number; change: string | null; stop: number; cents: number }[] = []
  for (const s of p.strings) {
    const open = positionTarget(p, s.number, null)
    if (shiftNote(s.openNote, 0).name === note) out.push({ string: s.number, change: null, stop: 0, cents: open.cents })
    for (const c of s.changes) {
      c.stops.forEach((st, i) => {
        if (shiftNote(s.openNote, st.semitones).name === note) {
          out.push({ string: s.number, change: c.control, stop: i, cents: positionTarget(p, s.number, c.control, i).cents })
        }
      })
    }
  }
  return out
}

export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B'

export interface NoteReading {
  name: NoteName
  octave: number
  midi: number
  /** Offset from the nearest equal-tempered note, in [-50, 50). */
  cents: number
}

const NAMES: NoteName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export function centsBetween(hz: number, refHz: number): number {
  return 1200 * Math.log2(hz / refHz)
}

export function noteFromFrequency(hz: number, aRef = 440): NoteReading {
  const exact = 69 + centsBetween(hz, aRef) / 100
  const midi = Math.floor(exact + 0.5)
  const cents = (exact - midi) * 100
  return {
    name: NAMES[((midi % 12) + 12) % 12],
    octave: Math.floor(midi / 12) - 1,
    midi,
    cents,
  }
}

import type { NoteName } from '../pitch/notes'

export type TargetRule = { kind: 'up' } | { kind: 'down' } | { kind: 'cents'; cents: number }

/** Semitones are relative to the open note. A half-stop change has two stops, half first. */
export interface ChangeStop {
  semitones: number
  target: TargetRule
}

/** `requires` lists controls that must be held too (e.g. the B6 lock). */
export interface StringChange {
  control: string
  stops: ChangeStop[]
  requires?: string[]
}

/** `openNote` is like 'G#4'. */
export interface StringConfig {
  number: number
  openNote: string
  openTarget: TargetRule
  changes: StringChange[]
}

export interface Control {
  id: string
  kind: 'pedal' | 'lever'
  latching?: boolean
}

export interface Profile {
  id: string
  name: string
  controls: Control[]
  strings: StringConfig[]
  cabinetDrop: number
  aRef: number
  noteTable: Record<NoteName, number>
}

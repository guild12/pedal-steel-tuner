import type { ChangeStop, Profile, StringChange, StringConfig, TargetRule } from '../types'
import { T, frenchNoteTable } from '../targets'

const up: TargetRule = { kind: 'up' }
const down: TargetRule = { kind: 'down' }
const ch = (control: string, semitones: number, target: TargetRule): StringChange => ({
  control,
  stops: [{ semitones, target } as ChangeStop],
})
const str = (number: number, openNote: string, openTarget: TargetRule, changes: StringChange[] = []): StringConfig => ({
  number, openNote, openTarget, changes,
})

export const french10: Profile = {
  id: 'french10',
  name: 'French 10 (E9)',
  controls: [
    { id: 'A', kind: 'pedal' }, { id: 'B', kind: 'pedal' }, { id: 'C', kind: 'pedal' },
    { id: 'LKL', kind: 'lever' }, { id: 'LKR', kind: 'lever' }, { id: 'RKL', kind: 'lever' }, { id: 'RKR', kind: 'lever' },
  ],
  strings: [
    str(1, 'F#4', up, [ch('RKR', 2, up)]),
    str(2, 'D#4', up, [ch('LKR', -1, down), ch('RKR', 1, up)]),
    str(3, 'G#4', up, [ch('B', 1, down)]),
    str(4, 'E4', up, [ch('LKL', 1, down), ch('C', 2, { kind: 'cents', cents: -T }), ch('RKL', -1, up)]),
    str(5, 'B3', up, [ch('A', 2, down), ch('C', 2, down)]),
    str(6, 'G#3', up, [ch('B', 1, down)]),
    str(7, 'F#3', up, [ch('RKR', 1, up)]),
    str(8, 'E3', up, [ch('LKL', 1, down), ch('RKL', -1, up)]),
    str(9, 'D3', down),
    str(10, 'B2', up, [ch('A', 2, down)]),
  ],
  cabinetDrop: 0,
  aRef: 440,
  noteTable: frenchNoteTable(),
}

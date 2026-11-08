import type { Control, Profile, StringChange, StringConfig, TargetRule } from '../types'
import { T, frenchNoteTable } from '../targets'

const PEDALS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8']
const up: TargetRule = { kind: 'up' }
const down: TargetRule = { kind: 'down' }

/** Defaults: pedals down, levers up. `rule` overrides. */
function ch(control: string, semis: number[], opts: { rule?: TargetRule; requires?: string[] } = {}): StringChange {
  const rule = opts.rule ?? (PEDALS.includes(control) ? down : up)
  const c: StringChange = { control, stops: semis.map((semitones) => ({ semitones, target: rule })) }
  if (opts.requires) c.requires = opts.requires
  return c
}
const str = (number: number, openNote: string, changes: StringChange[] = []): StringConfig => ({
  number, openNote, openTarget: up, changes,
})

const controls: Control[] = [
  ...PEDALS.map((id): Control => ({ id, kind: 'pedal' })),
  { id: 'LKL', kind: 'lever' },
  { id: 'LV', kind: 'lever' },
  { id: 'LKR', kind: 'lever', latching: true },
  { id: 'ILKL', kind: 'lever' },
  { id: 'ILKR', kind: 'lever' },
  { id: 'RKL', kind: 'lever' },
  { id: 'RKR', kind: 'lever' },
]

export const sierra14: Profile = {
  id: 'sierra14',
  name: 'Sierra 14',
  controls,
  strings: [
    str(1, 'G#4'),
    str(2, 'F#4', [ch('P5', [1])]),
    str(3, 'D#4', [ch('RKR', [-1, -2], { rule: down })]),
    str(4, 'G#4', [ch('P2', [1]), ch('P7', [1])]),
    str(5, 'E4', [
      ch('LKL', [1], { rule: down }), ch('LV', [2]), ch('LKR', [-1]),
      ch('P3', [2], { rule: { kind: 'cents', cents: -T } }), ch('P6', [0], { requires: ['LKR'] }),
    ]),
    str(6, 'B3', [ch('P1', [2]), ch('P3', [2]), ch('ILKL', [2]), ch('RKL', [-1])]),
    str(7, 'G#3', [ch('P2', [1]), ch('ILKL', [2]), ch('P4', [2]), ch('P7', [1])]),
    str(8, 'F#3', [ch('ILKR', [1]), ch('P5', [-1])]),
    str(9, 'E3', [ch('LKL', [1], { rule: down }), ch('LKR', [-1]), ch('P6', [-2], { requires: ['LKR'] })]),
    str(10, 'B2', [ch('P1', [2]), ch('P8', [1]), ch('RKL', [-1]), ch('RKR', [3], { rule: down })]),
    str(11, 'G#2', [ch('P2', [1]), ch('P4', [2]), ch('P7', [1])]),
    str(12, 'E2', [ch('P5', [1]), ch('P8', [-1])]),
    str(13, 'B1', [ch('P1', [2]), ch('P5', [2]), ch('P8', [-3])]),
    str(14, 'E1'),
  ],
  cabinetDrop: 0,
  aRef: 440,
  noteTable: frenchNoteTable(),
}

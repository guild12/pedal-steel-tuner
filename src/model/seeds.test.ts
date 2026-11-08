import { expect, test } from 'vitest'
import { sierra14 } from './seeds/sierra14'
import { french10 } from './seeds/french10'

test('Sierra has 14 strings with the expected open notes', () => {
  expect(sierra14.strings.map((s) => s.openNote)).toEqual(
    'G#4 F#4 D#4 G#4 E4 B3 G#3 F#3 E3 B2 G#2 E2 B1 E1'.split(' '),
  )
})
test('Sierra has 15 controls with LKR latching', () => {
  expect(sierra14.controls.map((c) => c.id)).toEqual(
    ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'LKL', 'LV', 'LKR', 'ILKL', 'ILKR', 'RKL', 'RKR'],
  )
  expect(sierra14.controls.filter((c) => c.latching).map((c) => c.id)).toEqual(['LKR'])
})
test('every change names an existing control and every requires too', () => {
  for (const p of [sierra14, french10]) {
    const ids = new Set(p.controls.map((c) => c.id))
    for (const s of p.strings) for (const c of s.changes) {
      expect(ids.has(c.control)).toBe(true)
      for (const r of c.requires ?? []) expect(ids.has(r)).toBe(true)
    }
  }
})
test('P6 changes on strings 5 and 9 require LKR', () => {
  for (const n of [5, 9]) {
    const c = sierra14.strings.find((s) => s.number === n)!.changes.find((x) => x.control === 'P6')!
    expect(c.requires).toEqual(['LKR'])
  }
})

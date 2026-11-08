import { describe, expect, test } from 'vitest'
import { T, gaugeTargets, positionTarget, positionsForNote } from './targets'
import { french10 } from './seeds/french10'
import { sierra14 } from './seeds/sierra14'

describe('targets', () => {
  for (const c of [0, 5, 10.3]) {
    const p = { ...french10, cabinetDrop: c }
    const expected: [number, string | null, number][] = [
      [1, null, c], [1, 'RKR', c - T],
      [2, null, c - T], [2, 'LKR', 0], [2, 'RKR', c],
      [3, null, c - T], [3, 'B', 0],
      [4, null, c], [4, 'LKL', -2 * T], [4, 'C', -T], [4, 'RKL', c - T],
      [5, null, c], [5, 'A', -T], [5, 'C', -T],
      [6, null, c - T], [6, 'B', 0],
      [7, null, c], [7, 'RKR', c],
      [8, null, c], [8, 'LKL', -2 * T], [8, 'RKL', c - T],
      [9, null, 0],
      [10, null, c], [10, 'A', -T],
    ]
    test(`French chart reproduced at c=${c}`, () => {
      for (const [s, ch, cents] of expected) expect(positionTarget(p, s, ch).cents).toBeCloseTo(cents, 6)
    })
  }
  test('gauges: open E with c=5 → up 5, down 0', () =>
    expect(gaugeTargets('E', { ...french10, cabinetDrop: 5 })).toEqual({ up: 5, down: 0 }))
  test('gauges: C# → up c−T, down −T', () => {
    const g = gaugeTargets('C#', { ...french10, cabinetDrop: 5 })
    expect(g.up).toBeCloseTo(5 - T)
    expect(g.down).toBeCloseTo(-T)
  })
  test('positionsForNote finds F# from P3 on the Sierra with its override', () =>
    expect(positionsForNote(sierra14, 'F#')).toContainEqual({ string: 5, change: 'P3', stop: 0, cents: -14.49 }))
  test('half-stop: Sierra RKR on string 3 → D then C#', () => {
    expect(positionTarget(sierra14, 3, 'RKR', 0).note).toBe('D4')
    expect(positionTarget(sierra14, 3, 'RKR', 1).note).toBe('C#4')
  })
  test('octave rollover: B3 +2 → C#4', () => expect(positionTarget(sierra14, 6, 'P1').note).toBe('C#4'))
  test('open string position is reported for its own note', () =>
    expect(positionsForNote(sierra14, 'B')).toContainEqual({ string: 6, change: null, stop: 0, cents: 0 }))
})

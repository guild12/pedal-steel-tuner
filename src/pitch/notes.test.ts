import { expect, test } from 'vitest'
import { centsBetween, noteFromFrequency } from './notes'

test('A440 is A4, 0 cents', () =>
  expect(noteFromFrequency(440)).toEqual({ name: 'A', octave: 4, midi: 69, cents: 0 }))

test('low E1', () => {
  const r = noteFromFrequency(41.2034)
  expect([r.name, r.octave]).toEqual(['E', 1])
  expect(Math.abs(r.cents)).toBeLessThan(0.01)
})

test('high G#4', () => {
  const r = noteFromFrequency(415.3047)
  expect([r.name, r.octave]).toEqual(['G#', 4])
  expect(Math.abs(r.cents)).toBeLessThan(0.01)
})

test('442 Hz reads +7.85 at A440', () => expect(noteFromFrequency(442).cents).toBeCloseTo(7.85, 2))

test('442 Hz reads 0 at A442', () => expect(noteFromFrequency(442, 442).cents).toBeCloseTo(0, 6))

test('just past the quarter-tone reads the next note', () => {
  const r = noteFromFrequency(440 * 2 ** (51 / 1200))
  expect(r.name).toBe('A#')
  expect(r.cents).toBeCloseTo(-49, 6)
})

test('centsBetween', () => expect(centsBetween(446, 440)).toBeCloseTo(23.45, 2))

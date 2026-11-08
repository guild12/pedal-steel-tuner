import { expect, test } from 'vitest'
import { RollingStats, SteadinessTracker } from './stats'

test('mean and stdDev over window', () => {
  const s = new RollingStats(1000)
  ;[1, 2, 3].forEach((v, i) => s.push(v, i * 100))
  expect(s.mean).toBe(2)
  expect(s.stdDev).toBeCloseTo(0.8165, 3)
})

test('drops values older than window', () => {
  const s = new RollingStats(1000)
  s.push(10, 0)
  s.push(2, 1500)
  expect(s.mean).toBe(2)
})

test('empty is null', () => expect(new RollingStats(1000).stdDev).toBeNull())

// 60 frames per second.
const frame = (i: number) => i * (1000 / 60)

test('steadiness stays hidden until 30 readings of one note', () => {
  const t = new SteadinessTracker()
  for (let i = 0; i < 29; i++) t.pushNote(40, 0.2 * (i % 2), frame(i))
  expect(t.text).toBe('—')
  t.pushNote(40, 0, frame(29))
  expect(t.text).toBe('±0.1¢')
})

test('a reading flipping between octaves never shows a steadiness number, and counts jumps', () => {
  const t = new SteadinessTracker()
  for (let i = 0; i < 60; i++) t.pushNote(i % 2 === 0 ? 28 : 40, 0, frame(i))
  expect(t.text).toBe('—')
  expect(t.jumps).toBe(59)
})

test('jumps only count the last 2 seconds', () => {
  const t = new SteadinessTracker()
  t.pushNote(28, 0, 0)
  t.pushNote(40, 0, 100)
  t.pushNote(40, 0, 2500)
  expect(t.jumps).toBe(0)
})

test('10 silent frames in a row clear the steadiness; 9 do not', () => {
  const t = new SteadinessTracker()
  for (let i = 0; i < 30; i++) t.pushNote(40, 0, frame(i))
  for (let i = 30; i < 39; i++) t.pushSilence(frame(i))
  expect(t.text).toBe('±0.0¢')
  t.pushSilence(frame(39))
  expect(t.text).toBe('—')
})

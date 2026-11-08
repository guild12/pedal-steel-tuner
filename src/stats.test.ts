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

const at60 = (i: number) => i * (1000 / 60)
const at30 = (i: number) => i * (1000 / 30)

test('steadiness stays hidden until one note has held for half a second', () => {
  const t = new SteadinessTracker()
  for (let i = 0; i <= 14; i++) t.pushNote(40, 0.2 * (i % 2), at30(i)) // 0 → 467 ms
  expect(t.text).toBe('—')
  t.pushNote(40, 0, 500)
  expect(t.text).toMatch(/^±0\.1¢$/)
})

test('a phone drawing 30 frames a second still shows steadiness', () => {
  const t = new SteadinessTracker()
  for (let i = 0; i <= 45; i++) t.pushNote(40, 0, at30(i)) // 1.5 s
  expect(t.text).toBe('±0.0¢')
})

test('a reading flipping between octaves never shows a steadiness number, and counts jumps', () => {
  const t = new SteadinessTracker()
  for (let i = 0; i < 60; i++) t.pushNote(i % 2 === 0 ? 28 : 40, 0, at60(i))
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

test('a split-second dropout keeps steadiness; a quarter second of silence clears it', () => {
  const t = new SteadinessTracker()
  for (let i = 0; i <= 60; i++) t.pushNote(40, 0, at60(i)) // 0 → 1000 ms
  t.pushSilence(1100)
  t.pushSilence(1200)
  expect(t.text).toBe('±0.0¢')
  t.pushNote(40, 0, 1210)
  t.pushSilence(1300)
  t.pushSilence(1440) // 230 ms after the last reading
  expect(t.text).toBe('±0.0¢')
  t.pushSilence(1470) // 260 ms
  expect(t.text).toBe('—')
})

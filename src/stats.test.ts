import { expect, test } from 'vitest'
import { RollingStats } from './stats'

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

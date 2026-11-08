import { expect, test } from 'vitest'
import { centsToAngle, formatCents, labelToMidi } from './gaugeMath'

test('0 cents is top dead center', () => expect(centsToAngle(0)).toBe(0))
test('+20 cents is +150°', () => expect(centsToAngle(20)).toBe(150))
test('clamps past range', () => expect(centsToAngle(-35)).toBe(-150))

test('formatCents signs and rounds to one decimal', () => {
  expect(formatCents(1.24)).toBe('+1.2¢')
  expect(formatCents(-14.49)).toBe('−14.5¢')
  expect(formatCents(-0.03)).toBe('+0.0¢')
})

test('labelToMidi parses note labels', () => {
  expect(labelToMidi('A4')).toBe(69)
  expect(labelToMidi('C#3')).toBe(49)
})

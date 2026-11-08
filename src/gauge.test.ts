import { expect, test } from 'vitest'
import { centsToAngle } from './gauge'

test('0 cents is top dead center', () => expect(centsToAngle(0)).toBe(0))
test('+20 cents is +150°', () => expect(centsToAngle(20)).toBe(150))
test('clamps past range', () => expect(centsToAngle(-35)).toBe(-150))

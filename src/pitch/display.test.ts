import { describe, expect, it } from 'vitest'
import type { Frame } from '../audio/engine'
import { DisplayFilter } from './display'

const DT = 16.7

function hz(midi: number, cents: number): number {
  return 440 * 2 ** ((midi - 69 + cents / 100) / 12)
}

function frame(i: number, midi: number | null, cents = 0, rms = 0.1): Frame {
  return {
    frequency: midi === null ? null : hz(midi, cents),
    clarity: 0.95,
    rms,
    timeMs: i * DT,
  }
}

const E2 = 40
const A2 = 45

describe('DisplayFilter', () => {
  it('smooths a step toward the new value (about 1 - 1/e after tau)', () => {
    const f = new DisplayFilter()
    let i = 0
    for (; i < 30; i++) f.push(frame(i, E2, 0), 440)
    let shown = null
    const steps = Math.round(150 / DT)
    for (let k = 0; k < steps; k++, i++) shown = f.push(frame(i, E2, 6), 440)
    expect(shown).not.toBeNull()
    expect(shown!.held).toBe(false)
    expect(shown!.cents).toBeGreaterThan(3.5)
    expect(shown!.cents).toBeLessThan(4.2)
  })

  it('restarts smoothing when the note changes', () => {
    const f = new DisplayFilter()
    let i = 0
    for (; i < 30; i++) f.push(frame(i, E2, -3), 440)
    const shown = f.push(frame(i, A2, 4), 440)
    expect(shown!.note).toBe('A')
    expect(shown!.octave).toBe(2)
    expect(shown!.cents).toBeCloseTo(4, 1)
  })

  it('freezes on the last good value when the tail is weak', () => {
    const f = new DisplayFilter()
    let i = 0
    let good = null
    for (; i < 30; i++) good = f.push(frame(i, E2, 2, 0.1), 440)
    const wild = [37, 12, 25, 40, 6]
    for (const c of wild) {
      const shown = f.push(frame(i++, E2, c, 0.002), 440)
      expect(shown).not.toBeNull()
      expect(shown!.held).toBe(true)
      expect(shown!.note).toBe(good!.note)
      expect(shown!.cents).toBeCloseTo(good!.cents, 6)
    }
  })

  it('holds through null frames until holdMs, then clears', () => {
    const f = new DisplayFilter()
    let i = 0
    for (; i < 30; i++) f.push(frame(i, E2, 1), 440)
    const lastGood = (i - 1) * DT
    let shown = null
    while (i * DT - lastGood < 380) {
      shown = f.push(frame(i++, null), 440)
      expect(shown).not.toBeNull()
      expect(shown!.held).toBe(true)
    }
    while (i * DT - lastGood <= 420) i++
    shown = f.push(frame(i, null), 440)
    expect(shown).toBeNull()
  })

  it('settles a decaying +6c pluck glide within 0.3c in 600 ms', () => {
    const f = new DisplayFilter()
    const settled = -1
    let shown = null
    let i = 0
    const n = Math.round(600 / DT)
    for (; i <= n; i++) {
      const t = i * DT
      const cents = settled + 6 * Math.exp(-t / 80)
      shown = f.push(frame(i, E2, cents), 440)
    }
    expect(Math.abs(shown!.cents - settled)).toBeLessThan(0.3)
  })

  it('behaves the same at different frame rates', () => {
    const run = (dt: number) => {
      const f = new DisplayFilter()
      let t = 0
      for (; t < 500; t += dt) f.push({ frequency: hz(E2, 0), clarity: 1, rms: 0.1, timeMs: t }, 440)
      let s = null
      for (const end = t + 150; t < end; t += dt)
        s = f.push({ frequency: hz(E2, 6), clarity: 1, rms: 0.1, timeMs: t }, 440)
      return s!.cents
    }
    expect(Math.abs(run(8.3) - run(33.3))).toBeLessThan(0.8)
  })
})

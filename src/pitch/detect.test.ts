import { describe, expect, test } from 'vitest'
import { detectPitch, requiredSamples } from './detect'
import { centsBetween } from './notes'
import { tone } from './synth'

function errorCents(hz: number, sampleRate: number, harmonics?: number[], noiseDb?: number): number {
  const samples = tone({ hz, sampleRate, length: requiredSamples(sampleRate), harmonics, noiseDb, seed: 7 })
  const result = detectPitch(samples, sampleRate)
  expect(result).not.toBeNull()
  return Math.abs(centsBetween(result!.frequency, hz))
}

describe('pure sines across the steel range', () => {
  for (const hz of [41.2034, 61.735, 82.407, 164.81, 329.63, 415.3, 466.16]) {
    test(`${hz} Hz within 0.2 cents`, () => expect(errorCents(hz, 48000)).toBeLessThan(0.2))
  }
})

describe('off-pitch sines', () => {
  for (const offset of [3.7, -3.7, 14.49, -14.49]) {
    const hz = 329.63 * 2 ** (offset / 1200)
    test(`E4 ${offset > 0 ? '+' : ''}${offset} cents within 0.2 cents`, () =>
      expect(errorCents(hz, 48000)).toBeLessThan(0.2))
  }
})

describe('steel-like harmonic tones', () => {
  for (const hz of [82.407, 246.94]) {
    test(`${hz} Hz within 0.2 cents`, () =>
      expect(errorCents(hz, 48000, [1, 0.7, 0.5, 0.35, 0.25])).toBeLessThan(0.2))
  }
})

test('low E with a weak fundamental reads E1, not the octave above', () =>
  expect(errorCents(41.2034, 48000, [0.3, 1.0, 0.6, 0.4])).toBeLessThan(0.5))

describe('sample rates', () => {
  for (const sr of [44100, 48000, 96000]) {
    test(`${sr} Hz sample rate within 0.2 cents`, () => expect(errorCents(82.407, sr, [1, 0.5])).toBeLessThan(0.2))
  }
})

test('noisy room (20 dB SNR) within 1 cent', () => expect(errorCents(164.81, 48000, [1, 0.5], 20)).toBeLessThan(1))

test('silence returns null', () => expect(detectPitch(new Float32Array(requiredSamples(48000)), 48000)).toBeNull())

test('faint noise alone returns null', () => {
  const n = requiredSamples(48000)
  const noise = new Float32Array(n)
  let s = 12345
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) % 2147483648
    noise[i] = (s / 2147483648 - 0.5) * 2 * 0.002
  }
  expect(detectPitch(noise, 48000)).toBeNull()
})

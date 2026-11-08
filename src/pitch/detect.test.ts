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

test('noisy room (20 dB SNR) within 1 cent for every noise seed', () => {
  const sr = 48000
  let worst = 0
  for (let seed = 1; seed <= 50; seed++) {
    const samples = tone({ hz: 164.81, sampleRate: sr, length: requiredSamples(sr), harmonics: [1, 0.5], noiseDb: 20, seed })
    const result = detectPitch(samples, sr)
    expect(result).not.toBeNull()
    worst = Math.max(worst, Math.abs(centsBetween(result!.frequency, 164.81)))
  }
  expect(worst).toBeLessThan(1)
})

test('a quiet note (RMS 0.004) is still detected', () => {
  const sr = 48000
  const samples = tone({ hz: 82.407, sampleRate: sr, length: requiredSamples(sr), harmonics: [1, 0.5] })
  const rms = Math.sqrt(samples.reduce((s, v) => s + v * v, 0) / samples.length)
  const quiet = samples.map((v) => (v / rms) * 0.004)
  const result = detectPitch(quiet, sr)
  expect(result).not.toBeNull()
  expect(Math.abs(centsBetween(result!.frequency, 82.407))).toBeLessThan(0.2)
})

function scaledTo(samples: Float32Array, rms: number): Float32Array {
  const now = Math.sqrt(samples.reduce((s, v) => s + v * v, 0) / samples.length)
  return samples.map((v) => (v / now) * rms)
}

test('a fading note at -74 dB (RMS 0.0002) is still detected', () => {
  const sr = 48000
  const g = tone({ hz: 415.3, sampleRate: sr, length: requiredSamples(sr), harmonics: [1, 0.5, 0.3] })
  const result = detectPitch(scaledTo(g, 0.0002), sr)
  expect(result).not.toBeNull()
  expect(Math.abs(centsBetween(result!.frequency, 415.3))).toBeLessThan(0.2)
})

test('white noise above the silence cutoff is still rejected by YIN', () => {
  const sr = 48000
  const n = requiredSamples(sr)
  const noise = new Float32Array(n)
  let s = 987654
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) % 2147483648
    noise[i] = s / 2147483648 - 0.5
  }
  for (const rms of [0.0003, 0.003, 0.03]) expect(detectPitch(scaledTo(noise, rms), sr)).toBeNull()
})

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

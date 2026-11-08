// Test helper: synthesizes tones with known frequencies. Not used by the app.

export interface ToneOptions {
  hz: number
  sampleRate: number
  length: number
  /** Amplitude of each partial, fundamental first. Default [1]. */
  harmonics?: number[]
  /** Adds seeded white noise at this signal-to-noise ratio (dB). */
  noiseDb?: number
  seed?: number
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function tone({ hz, sampleRate, length, harmonics = [1], noiseDb, seed = 1 }: ToneOptions): Float32Array {
  const out = new Float32Array(length)
  let peak = 0
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    let v = 0
    for (let k = 0; k < harmonics.length; k++) v += harmonics[k] * Math.sin(2 * Math.PI * (k + 1) * hz * t)
    out[i] = v
    peak = Math.max(peak, Math.abs(v))
  }
  for (let i = 0; i < length; i++) out[i] = (out[i] / peak) * 0.8

  if (noiseDb !== undefined) {
    let sumSq = 0
    for (let i = 0; i < length; i++) sumSq += out[i] * out[i]
    const noiseRms = Math.sqrt(sumSq / length) / 10 ** (noiseDb / 20)
    const rand = mulberry32(seed)
    // Uniform noise on [-1, 1] has an RMS of 1/sqrt(3).
    const scale = noiseRms * Math.sqrt(3)
    for (let i = 0; i < length; i++) out[i] += (rand() * 2 - 1) * scale
  }
  return out
}

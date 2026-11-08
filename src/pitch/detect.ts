// YIN pitch detection (de Cheveigné & Kawahara, 2002).

export interface PitchResult {
  frequency: number
  /** 1 − the normalized difference at the chosen period; closer to 1 is cleaner. */
  clarity: number
}

/** Just below the steel's lowest string (E1 ≈ 41.2 Hz). */
export const MIN_HZ = 38
/** Just above the highest pulled note on the Sierra (A#4 ≈ 466 Hz). */
export const MAX_HZ = 520

// YIN's own threshold rejects noise, so this gate only skips true silence.
const SILENCE_RMS = 0.001
const THRESHOLD = 0.15
/** Low-pass cutoff applied before YIN; strips hiss far above the steel's range. */
export const LOWPASS_HZ = 1000

/** 2nd-order Butterworth low-pass (RBJ cookbook), applied front to back. */
export function lowPass(samples: Float32Array, sampleRate: number, cutoffHz: number): Float32Array {
  const w0 = (2 * Math.PI * cutoffHz) / sampleRate
  const cos = Math.cos(w0)
  const alpha = Math.sin(w0) / (2 * Math.SQRT1_2)
  const a0 = 1 + alpha
  const b0 = (1 - cos) / 2 / a0
  const b1 = (1 - cos) / a0
  const b2 = b0
  const a1 = (-2 * cos) / a0
  const a2 = (1 - alpha) / a0
  const out = new Float32Array(samples.length)
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i]
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
    out[i] = y
    x2 = x1; x1 = x
    y2 = y1; y1 = y
  }
  return out
}

/** Samples filtered and then discarded so the low-pass's start-up transient never reaches YIN. */
function warmupSamples(sampleRate: number): number {
  return Math.ceil(sampleRate * 0.005)
}

/** Buffer length detectPitch needs at this sample rate. */
export function requiredSamples(sampleRate: number): number {
  return 2 * Math.ceil(sampleRate / MIN_HZ) + warmupSamples(sampleRate)
}

export function detectPitch(raw: Float32Array, sampleRate: number): PitchResult | null {
  const maxTau = Math.ceil(sampleRate / MIN_HZ)
  const minTau = Math.floor(sampleRate / MAX_HZ)
  const window = maxTau
  if (raw.length < requiredSamples(sampleRate)) return null

  let sumSq = 0
  for (let i = 0; i < raw.length; i++) sumSq += raw[i] * raw[i]
  if (Math.sqrt(sumSq / raw.length) < SILENCE_RMS) return null

  const samples = lowPass(raw, sampleRate, LOWPASS_HZ).subarray(warmupSamples(sampleRate))

  // Difference function d(τ), then cumulative-mean-normalized d'(τ).
  const cmnd = new Float32Array(maxTau + 1)
  cmnd[0] = 1
  let running = 0
  for (let tau = 1; tau <= maxTau; tau++) {
    let d = 0
    for (let j = 0; j < window; j++) {
      const diff = samples[j] - samples[j + tau]
      d += diff * diff
    }
    running += d
    cmnd[tau] = running === 0 ? 1 : (d * tau) / running
  }

  // The first dip under the threshold (not the global minimum) avoids octave errors.
  let tau = -1
  for (let t = Math.max(minTau, 1); t < maxTau; t++) {
    if (cmnd[t] < THRESHOLD) {
      while (t + 1 < maxTau && cmnd[t + 1] < cmnd[t]) t++
      tau = t
      break
    }
  }
  if (tau < 0) return null

  const a = cmnd[tau - 1]
  const b = cmnd[tau]
  const c = cmnd[tau + 1]
  const denom = a - 2 * b + c
  const shift = denom === 0 ? 0 : (0.5 * (a - c)) / denom
  return { frequency: sampleRate / (tau + shift), clarity: 1 - b }
}

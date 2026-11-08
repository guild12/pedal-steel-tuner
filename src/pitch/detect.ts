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

const SILENCE_RMS = 0.005
const THRESHOLD = 0.15

/** Buffer length detectPitch needs at this sample rate. */
export function requiredSamples(sampleRate: number): number {
  return 2 * Math.ceil(sampleRate / MIN_HZ)
}

export function detectPitch(samples: Float32Array, sampleRate: number): PitchResult | null {
  const maxTau = Math.ceil(sampleRate / MIN_HZ)
  const minTau = Math.floor(sampleRate / MAX_HZ)
  const window = maxTau
  if (samples.length < window + maxTau) return null

  let sumSq = 0
  for (let i = 0; i < samples.length; i++) sumSq += samples[i] * samples[i]
  if (Math.sqrt(sumSq / samples.length) < SILENCE_RMS) return null

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

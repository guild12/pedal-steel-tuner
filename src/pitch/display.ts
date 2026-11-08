import type { Frame } from '../audio/engine'
import { noteFromFrequency, type NoteName } from './notes'

export interface Shown {
  note: NoteName
  octave: number
  cents: number
  /** True while the reading is frozen on the last good value. */
  held: boolean
}

export interface DisplayFilterOptions {
  /** Smoothing time constant for cents, in ms. */
  tauMs?: number
  /** How long a null or weak signal keeps the last value, in ms. */
  holdMs?: number
  /** A frame this many dB below the note's peak RMS counts as weak. */
  tailDb?: number
}

export class DisplayFilter {
  private readonly tauMs: number
  private readonly holdMs: number
  private readonly tailDb: number

  private midi: number | null = null
  private peakRms = 0
  private smoothed = 0
  private lastGood: Shown | null = null
  private lastGoodTimeMs = 0

  constructor(opts: DisplayFilterOptions = {}) {
    this.tauMs = opts.tauMs ?? 150
    this.holdMs = opts.holdMs ?? 400
    this.tailDb = opts.tailDb ?? 30
  }

  reset(): void {
    this.midi = null
    this.peakRms = 0
    this.smoothed = 0
    this.lastGood = null
    this.lastGoodTimeMs = 0
  }

  push(f: Frame, aRef: number): Shown | null {
    const weak =
      this.midi !== null && f.rms < this.peakRms * 10 ** (-this.tailDb / 20)
    if (f.frequency === null || weak) return this.hold(f.timeMs)

    const r = noteFromFrequency(f.frequency, aRef)
    if (r.midi !== this.midi) {
      // New note: restart smoothing and the peak tracker.
      this.midi = r.midi
      this.peakRms = f.rms
      this.smoothed = r.cents
    } else {
      this.peakRms = Math.max(this.peakRms, f.rms)
      const dt = Math.max(0, f.timeMs - this.lastGoodTimeMs)
      const alpha = 1 - Math.exp(-dt / this.tauMs)
      this.smoothed += alpha * (r.cents - this.smoothed)
    }

    this.lastGoodTimeMs = f.timeMs
    this.lastGood = { note: r.name, octave: r.octave, cents: this.smoothed, held: false }
    return this.lastGood
  }

  private hold(timeMs: number): Shown | null {
    if (this.lastGood === null) return null
    if (timeMs - this.lastGoodTimeMs > this.holdMs) {
      this.reset()
      return null
    }
    return { ...this.lastGood, held: true }
  }
}

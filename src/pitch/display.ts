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

const ONSET_DB = 6
const ONSET_WINDOW_MS = 100

export class DisplayFilter {
  private readonly tauMs: number
  private readonly holdMs: number
  private readonly tailDb: number

  private midi: number | null = null
  private peakRms = 0
  private smoothed = 0
  private lastGood: Shown | null = null
  private lastGoodTimeMs = 0
  /** Last frame that carried a frequency (good or weak). */
  private lastFreqTimeMs = 0
  private recent: Array<{ t: number; rms: number }> = []

  constructor(opts: DisplayFilterOptions = {}) {
    this.tauMs = opts.tauMs ?? 150
    this.holdMs = opts.holdMs ?? 400
    this.tailDb = opts.tailDb ?? 30
  }

  reset(): void {
    this.clearNote()
    this.recent = []
  }

  private clearNote(): void {
    this.midi = null
    this.peakRms = 0
    this.smoothed = 0
    this.lastGood = null
    this.lastGoodTimeMs = 0
    this.lastFreqTimeMs = 0
  }

  /** A new pluck: RMS at least ONSET_DB above the lowest RMS in the last ONSET_WINDOW_MS. */
  private isOnset(f: Frame): boolean {
    this.recent = this.recent.filter((r) => f.timeMs - r.t <= ONSET_WINDOW_MS)
    if (this.recent.length === 0) return false
    const min = Math.min(...this.recent.map((r) => r.rms))
    return f.rms >= min * 10 ** (ONSET_DB / 20)
  }

  push(f: Frame, aRef: number): Shown | null {
    const onset = f.frequency !== null && this.isOnset(f)
    this.recent.push({ t: f.timeMs, rms: f.rms })

    if (f.frequency === null) {
      if (f.timeMs - this.lastFreqTimeMs > this.holdMs) this.clearNote()
      return this.hold(f.timeMs)
    }

    const weak =
      !onset && this.midi !== null && f.rms < this.peakRms * 10 ** (-this.tailDb / 20)
    this.lastFreqTimeMs = f.timeMs
    if (weak) return this.hold(f.timeMs)

    const r = noteFromFrequency(f.frequency, aRef)
    if (onset) this.peakRms = f.rms
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

  /**
   * Freeze on the last good value for up to holdMs. Past that, show nothing but
   * keep midi and peakRms, so a weak tail stays suppressed for as long as it lasts.
   */
  private hold(timeMs: number): Shown | null {
    if (this.lastGood === null) return null
    if (timeMs - this.lastGoodTimeMs > this.holdMs) {
      this.lastGood = null
      return null
    }
    return { ...this.lastGood, held: true }
  }
}

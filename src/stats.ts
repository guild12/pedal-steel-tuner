/** Mean and population standard deviation of values pushed within the last `windowMs`. */
export class RollingStats {
  private entries: { value: number; time: number }[] = []

  constructor(private readonly windowMs: number) {}

  push(value: number, timeMs: number): void {
    this.entries.push({ value, time: timeMs })
    const cutoff = timeMs - this.windowMs
    while (this.entries.length > 0 && this.entries[0].time < cutoff) this.entries.shift()
  }

  get mean(): number | null {
    if (this.entries.length === 0) return null
    return this.entries.reduce((sum, e) => sum + e.value, 0) / this.entries.length
  }

  get stdDev(): number | null {
    const mean = this.mean
    if (mean === null) return null
    const variance = this.entries.reduce((sum, e) => sum + (e.value - mean) ** 2, 0) / this.entries.length
    return Math.sqrt(variance)
  }

  get count(): number {
    return this.entries.length
  }

  reset(): void {
    this.entries = []
  }
}

/**
 * The page's "Steadiness" readout: the wobble of one held note over the last second.
 * It stays hidden until there are enough readings to mean something, so a reading
 * that flips between notes (or keeps dropping out) can never look steady.
 */
export class SteadinessTracker {
  private stats = new RollingStats(1000)
  private lastMidi: number | null = null
  private runStart = 0
  private lastNoteTime = 0
  private changes: number[] = []
  private now = 0

  // Time-based, not frame-based: iPhones draw at 30, 60 or 120 frames a second.
  constructor(
    private readonly minHeldMs = 500,
    private readonly minSamples = 8,
    private readonly silenceMs = 250,
    private readonly jumpWindowMs = 2000,
  ) {}

  pushNote(midi: number, cents: number, timeMs: number): void {
    this.now = timeMs
    if (this.lastMidi !== null && midi !== this.lastMidi) {
      this.changes.push(timeMs)
      this.stats.reset()
    }
    if (this.lastMidi !== midi) this.runStart = timeMs
    this.lastMidi = midi
    this.lastNoteTime = timeMs
    this.stats.push(cents, timeMs)
  }

  pushSilence(timeMs: number): void {
    this.now = timeMs
    if (this.lastMidi !== null && timeMs - this.lastNoteTime >= this.silenceMs) {
      this.stats.reset()
      this.lastMidi = null
    }
  }

  /** Note changes in the last 2 seconds. */
  get jumps(): number {
    this.changes = this.changes.filter((t) => t >= this.now - this.jumpWindowMs)
    return this.changes.length
  }

  get text(): string {
    const sd = this.stats.stdDev
    const held = this.lastMidi !== null && this.lastNoteTime - this.runStart >= this.minHeldMs
    if (sd === null || !held || this.stats.count < this.minSamples) return '—'
    return `±${sd.toFixed(1)}¢`
  }
}

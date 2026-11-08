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
  private silentRun = 0
  private changes: number[] = []
  private now = 0

  constructor(
    private readonly minSamples = 30,
    private readonly silenceFrames = 10,
    private readonly jumpWindowMs = 2000,
  ) {}

  pushNote(midi: number, cents: number, timeMs: number): void {
    this.now = timeMs
    this.silentRun = 0
    if (this.lastMidi !== null && midi !== this.lastMidi) {
      this.changes.push(timeMs)
      this.stats.reset()
    }
    this.lastMidi = midi
    this.stats.push(cents, timeMs)
  }

  pushSilence(timeMs: number): void {
    this.now = timeMs
    this.silentRun++
    if (this.silentRun >= this.silenceFrames) {
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
    if (sd === null || this.stats.count < this.minSamples) return '—'
    return `±${sd.toFixed(1)}¢`
  }
}

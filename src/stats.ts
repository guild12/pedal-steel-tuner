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

  reset(): void {
    this.entries = []
  }
}

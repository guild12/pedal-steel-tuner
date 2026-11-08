export interface CentsSample {
  cents: number
  timeMs: number
}

/**
 * Median cents of the last `minMs` window, if the samples cover that whole
 * window and their max-min is within `maxSpread`. Otherwise null.
 */
export function steadyCents(samples: CentsSample[], minMs = 700, maxSpread = 1.0): number | null {
  if (samples.length === 0) return null
  const last = samples[samples.length - 1].timeMs
  if (last - samples[0].timeMs < minMs) return null
  const win = samples.filter((s) => s.timeMs >= last - minMs).map((s) => s.cents)
  if (Math.max(...win) - Math.min(...win) > maxSpread) return null
  const sorted = [...win].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const round1 = (x: number) => Math.round(x * 10) / 10

export function averageDrop(pairs: { up: number; down: number }[]): number {
  if (pairs.length === 0) return 0
  const sum = pairs.reduce((a, p) => a + (p.up - p.down), 0)
  return round1(sum / pairs.length)
}

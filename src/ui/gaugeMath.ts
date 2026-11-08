/** Maps cents to degrees from top dead center, clamped to ±sweep. */
export function centsToAngle(cents: number, range = 20, sweep = 150): number {
  const angle = (cents / range) * sweep
  return Math.max(-sweep, Math.min(sweep, angle))
}

/** Point on a circle, with 0° at top dead center and positive clockwise. */
export function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}

/** Signed, one decimal place, e.g. "+1.2¢" or "−14.5¢". Rounds first so -0.03 reads "+0.0¢". */
export function formatCents(v: number): string {
  const r = Math.round(v * 10) / 10
  return `${r >= 0 ? '+' : '−'}${Math.abs(r).toFixed(1)}¢`
}

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

/** MIDI number of a label like "C#3". */
export function labelToMidi(label: string): number {
  const m = /^([A-G]#?)(-?\d+)$/.exec(label)
  if (!m) throw new Error(`Bad note: ${label}`)
  return (Number(m[2]) + 1) * 12 + NAMES.indexOf(m[1])
}

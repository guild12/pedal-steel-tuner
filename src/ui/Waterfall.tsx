import { useEffect, useRef } from 'react'

const SIZE = 240
const SPAN_MS = 3000
const RANGE = 20
const BG = '#05070a'

/**
 * Scrolling history of the deviation (cents), newest row at the top, clipped to a circle.
 * Scrolls by elapsed time so the dial always holds about the last 3 s.
 */
export function Waterfall({ deviation }: { deviation: number | null }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const latest = useRef(deviation)
  latest.current = deviation

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, SIZE, SIZE)
    let last: number | null = null
    let carry = 0
    let raf = requestAnimationFrame(function draw(t: number) {
      if (last !== null) carry += ((t - last) * SIZE) / SPAN_MS
      last = t
      // After backgrounding the gap can exceed the whole canvas; never ask for an empty source.
      const rows = Math.min(Math.floor(carry), SIZE)
      if (rows > 0) {
        carry = rows === SIZE ? 0 : carry - rows
        if (rows < SIZE) ctx.drawImage(ctx.canvas, 0, 0, SIZE, SIZE - rows, 0, rows, SIZE, SIZE - rows)
        ctx.fillStyle = BG
        ctx.fillRect(0, 0, SIZE, rows)
        const h = rows === SIZE ? 1 : rows // a full clear keeps just the newest row
        const dev = latest.current
        if (dev !== null) {
          const x = SIZE / 2 + Math.max(-RANGE, Math.min(RANGE, dev)) * (SIZE / 2 / RANGE) * 2.2
          const spread = SIZE * 0.05
          const g = ctx.createLinearGradient(x - spread, 0, x + spread, 0)
          g.addColorStop(0, 'rgba(255,190,70,0)')
          g.addColorStop(0.5, 'rgba(255,225,130,1)')
          g.addColorStop(1, 'rgba(255,190,70,0)')
          ctx.fillStyle = g
          ctx.fillRect(x - spread, 0, spread * 2, h)
        }
        ctx.fillStyle = 'rgba(255,255,255,.28)'
        ctx.fillRect(SIZE / 2 - 0.5, 0, 1, h)
      }
      raf = requestAnimationFrame(draw)
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <canvas
      ref={canvas}
      width={SIZE}
      height={SIZE}
      aria-hidden="true"
      className="absolute rounded-full bg-[#05070a]"
      style={{ left: '10.5%', top: '10.5%', width: '79%', height: '79%' }}
    />
  )
}

const SVG_NS = 'http://www.w3.org/2000/svg'

/** Maps cents to degrees from top dead center, clamped to ±sweep. */
export function centsToAngle(cents: number, range = 20, sweep = 150): number {
  const angle = (cents / range) * sweep
  return Math.max(-sweep, Math.min(sweep, angle))
}

export interface Gauge {
  update(cents: number | null): void
}

function point(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}

/** Circle gauge: top dead center = 0¢, ticks every 2¢ out to ±20¢. */
export function createGauge(container: HTMLElement, size = 260): Gauge {
  const c = size / 2
  const r = c - 10
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`)
  svg.setAttribute('width', String(size))
  svg.setAttribute('height', String(size))

  const face = document.createElementNS(SVG_NS, 'circle')
  face.setAttribute('cx', String(c))
  face.setAttribute('cy', String(c))
  face.setAttribute('r', String(r - 14))
  face.setAttribute('fill', '#05070a')
  svg.appendChild(face)

  for (let t = -20; t <= 20; t += 2) {
    const long = t % 10 === 0
    const [x1, y1] = point(c, c, r, centsToAngle(t))
    const [x2, y2] = point(c, c, r - (long ? 12 : 6), centsToAngle(t))
    const line = document.createElementNS(SVG_NS, 'line')
    line.setAttribute('x1', String(x1))
    line.setAttribute('y1', String(y1))
    line.setAttribute('x2', String(x2))
    line.setAttribute('y2', String(y2))
    line.setAttribute('stroke', t === 0 ? '#ffffff' : '#3a444f')
    line.setAttribute('stroke-width', t === 0 ? '3' : '1.5')
    svg.appendChild(line)
  }

  const pointer = document.createElementNS(SVG_NS, 'circle')
  pointer.setAttribute('r', '8')
  pointer.setAttribute('fill', '#ffd166')
  pointer.setAttribute('stroke', '#0f1216')
  pointer.setAttribute('stroke-width', '2')
  pointer.style.display = 'none'
  svg.appendChild(pointer)

  container.appendChild(svg)

  return {
    update(cents) {
      if (cents === null) {
        pointer.style.display = 'none'
        return
      }
      const [x, y] = point(c, c, r + 1, centsToAngle(cents))
      pointer.setAttribute('cx', String(x))
      pointer.setAttribute('cy', String(y))
      pointer.setAttribute('fill', Math.abs(cents) <= 1 ? '#35c46f' : '#ffd166')
      pointer.style.display = ''
    },
  }
}

import { centsToAngle, formatCents, polar } from './gaugeMath'
import { Waterfall } from './Waterfall'

const VB = 200
const C = VB / 2
const R = 93
const MUTED = '#3a444f'

interface GaugeProps {
  title: string
  /** Colour of the target mark at top dead center. */
  color?: string
  /** Cents from this gauge's target, or null when nothing is playing. */
  deviation: number | null
  held?: boolean
  /** Text size class for the reading. */
  large?: boolean
}

export function Gauge({ title, color = '#35c46f', deviation, held = false, large = false }: GaugeProps) {
  const ticks = []
  for (let t = -20; t <= 20; t += 2) {
    const long = t % 10 === 0
    const [x1, y1] = polar(C, C, R, centsToAngle(t))
    const [x2, y2] = polar(C, C, R - (long ? 10 : 5), centsToAngle(t))
    ticks.push(
      <line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke={t === 0 ? '#fff' : MUTED} strokeWidth={t === 0 ? 3 : 1.4} />,
    )
  }
  const [mx, my] = polar(C, C, R + 2, 0)
  const ptr = deviation === null ? null : polar(C, C, R + 1, centsToAngle(deviation))

  return (
    <section aria-label={title} className="min-w-0 flex-1" style={{ opacity: held ? 0.5 : 1 }}>
      <div className="mb-1 text-center text-sm font-semibold" style={{ color }}>
        {title}
      </div>
      <div className="relative mx-auto aspect-square w-full">
        <Waterfall deviation={deviation} />
        <svg viewBox={`0 0 ${VB} ${VB}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          {ticks}
          <circle cx={mx} cy={my} r={6} fill={color} />
          {ptr && <circle cx={ptr[0]} cy={ptr[1]} r={7} fill="#ffd166" stroke="#0f1216" strokeWidth={2.5} />}
        </svg>
      </div>
      <div
        data-testid="readout"
        className={`mt-1 text-center font-bold tabular-nums ${large ? 'text-4xl' : 'text-2xl'}`}
      >
        {deviation === null ? '—' : formatCents(deviation)}
      </div>
    </section>
  )
}

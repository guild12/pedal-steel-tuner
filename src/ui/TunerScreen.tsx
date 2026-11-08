import type { EngineStatus } from '../audio/engine'
import { gaugeTargets, positionsForNote, positionTarget } from '../model/targets'
import type { Profile } from '../model/types'
import type { Shown } from '../pitch/display'
import { Gauge } from './Gauge'
import { formatCents, labelToMidi } from './gaugeMath'
import { StringStrip } from './StringStrip'

export interface Lock {
  string: number
  change: string | null
  stop: number
}

interface Props {
  profile: Profile
  shown: Shown | null
  status: EngineStatus
  lock: Lock | null
  onLock: (lock: Lock | null) => void
  onOpenSettings: () => void
  onMeasureDrop?: () => void
}

export function TunerScreen({ profile, shown, status, lock, onLock, onOpenSettings, onMeasureDrop }: Props) {
  const header = (
    <div className="mb-2 flex items-center justify-between text-xs text-[#94a0ad]">
      <span>
        {profile.name} · A={profile.aRef}
      </span>
      <button onClick={onOpenSettings} aria-label="Settings" className="px-2 py-1 text-base">
        ⚙
      </button>
    </div>
  )
  const noteText = shown ? `${shown.note}${shown.octave}` : status === 'running' ? '…' : '—'
  const note = (
    <div data-testid="note" className="text-center text-7xl leading-none font-extrabold" style={{ opacity: shown?.held ? 0.5 : 1 }}>
      {noteText}
    </div>
  )
  const strip = <StringStrip profile={profile} lock={lock} onLock={onLock} />

  if (lock) {
    const target = positionTarget(profile, lock.string, lock.change, lock.stop)
    // Cents from the target note, even if the played note is a different one.
    const dev = shown
      ? (labelToMidi(`${shown.note}${shown.octave}`) - labelToMidi(target.note)) * 100 + shown.cents - target.cents
      : null
    return (
      <div className="flex flex-col gap-3">
        {header}
        {note}
        <Gauge
          title={`String ${lock.string} · ${lock.change ?? 'Open'} → ${target.note}`}
          deviation={dev}
          held={shown?.held}
          large
        />
        <button onClick={() => onLock(null)} className="rounded-xl bg-[#1d232a] p-3 font-bold">
          Unlock
        </button>
        {strip}
      </div>
    )
  }

  const targets = shown ? gaugeTargets(shown.note, profile) : null
  const chips =
    shown && targets
      ? positionsForNote(profile, shown.note).filter(
          (p) => Math.abs(p.cents - targets.up) > 0.05 && Math.abs(p.cents - targets.down) > 0.05,
        )
      : []

  return (
    <div className="flex flex-col gap-3">
      {header}
      {note}
      <div className="flex gap-2">
        <Gauge
          title="Pedals up"
          color="#35c46f"
          deviation={shown && targets ? shown.cents - targets.up : null}
          held={shown?.held}
        />
        <Gauge
          title="A+B down"
          color="#58a6ff"
          deviation={shown && targets ? shown.cents - targets.down : null}
          held={shown?.held}
        />
      </div>
      {profile.cabinetDrop === 0 && (
        <p className="rounded-lg bg-[#1d232a] px-3 py-2 text-center text-xs text-[#94a0ad]">
          Cabinet drop not set — both gauges show the same target.
          {onMeasureDrop && (
            <button onClick={onMeasureDrop} className="mt-2 block w-full rounded-lg bg-[#2a323b] p-2 font-bold text-white">
              Measure cabinet drop
            </button>
          )}
        </p>
      )}
      {chips.length > 0 && shown && (
        <div className="flex flex-wrap justify-center gap-2">
          {chips.map((p) => (
            <button
              key={`${p.string}-${p.change}-${p.stop}`}
              data-testid="override-chip"
              onClick={() => onLock({ string: p.string, change: p.change, stop: p.stop })}
              className="rounded-full bg-[#1d232a] px-3 py-2 text-sm"
            >
              {shown.note} · string {p.string} · {p.change ?? 'Open'} → {formatCents(p.cents)}
            </button>
          ))}
        </div>
      )}
      {strip}
    </div>
  )
}

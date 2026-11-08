import { useEffect, useRef, useState } from 'react'
import { averageDrop, steadyCents, type CentsSample } from '../model/drop'
import type { Profile } from '../model/types'
import type { Shown } from '../pitch/display'

interface Props {
  profile: Profile
  /** Latest smoothed reading, or null. */
  shown: Shown | null
  /** Timestamp of that reading in ms. Defaults to performance.now(). */
  nowMs?: number
  onSave: (cabinetDrop: number) => void
  onCancel: () => void
}

type Step = 'up' | 'down' | 'result'
const MIN_MS = 700
const RE_ARM_JUMP = 1.0

export function DropWizard({ shown, nowMs, onSave, onCancel }: Props) {
  const [step, setStep] = useState<Step>('up')
  const [pairs, setPairs] = useState<{ up: number; down: number }[]>([])
  const [up, setUp] = useState<number | null>(null)
  const [down, setDown] = useState<number | null>(null)
  const [unsteady, setUnsteady] = useState(false)
  const [typed, setTyped] = useState('')
  const samples = useRef<CentsSample[]>([])
  // After a step completes the old note is still ringing; wait for a gap or a clear change.
  const armed = useRef(true)
  const prevValue = useRef<number | null>(null)

  useEffect(() => {
    if (step === 'result') return
    const t = nowMs ?? performance.now()
    const usable = shown && !shown.held && shown.note === 'E' && shown.octave === 4
    if (!usable) {
      armed.current = true
      return
    }
    if (!armed.current) {
      if (prevValue.current !== null && Math.abs(shown.cents - prevValue.current) <= RE_ARM_JUMP) return
      armed.current = true
    }
    samples.current.push({ cents: shown.cents, timeMs: t })
    const v = steadyCents(samples.current, MIN_MS)
    if (v !== null) {
      samples.current = []
      armed.current = false
      prevValue.current = v
      setUnsteady(false)
      if (step === 'up') {
        setUp(v)
        setStep('down')
      } else {
        setDown(v)
        setStep('result')
      }
    } else {
      const s = samples.current
      setUnsteady(s[s.length - 1].timeMs - s[0].timeMs >= MIN_MS)
      // Keep only recent history so an early wobble doesn't block a later steady stretch.
      const cut = s[s.length - 1].timeMs - MIN_MS * 2
      samples.current = s.filter((x) => x.timeMs >= cut)
    }
  }, [shown, nowMs, step])

  const typedNum = typed === '' ? null : Number(typed)
  const typedValid = typedNum !== null && Number.isFinite(typedNum) && typedNum >= 0 && typedNum <= 30
  const current = up !== null && down !== null ? [...pairs, { up, down }] : pairs
  const measured = step === 'result' && current.length > 0 ? averageDrop(current) : null

  const again = () => {
    if (up !== null && down !== null) setPairs((p) => [...p, { up, down }])
    setUp(null)
    setDown(null)
    samples.current = []
    armed.current = false
    setStep('up')
  }

  const saveValue = typedValid ? Math.round(typedNum * 10) / 10 : measured
  const prompt =
    step === 'up'
      ? 'Pluck your high E (string 5) with no pedals and let it ring.'
      : 'Now hold A and B and pluck it again.'

  return (
    <div role="dialog" aria-label="Measure cabinet drop" className="flex flex-col gap-3 rounded-xl bg-[#1d232a] p-4">
      <h2 className="text-lg font-bold">Cabinet drop</h2>
      {step !== 'result' ? (
        <>
          <p>{prompt}</p>
          {pairs.length > 0 && <p className="text-sm text-[#94a0ad]">Average so far: {averageDrop(pairs)}¢</p>}
          {unsteady && <p role="status" className="text-amber-300">Pluck again — the reading wasn't steady</p>}
        </>
      ) : (
        <>
          <p className="text-2xl font-bold">Drop: {up !== null && down !== null ? Math.round((up - down) * 10) / 10 : 0}¢</p>
          {current.length > 1 && <p className="text-sm text-[#94a0ad]">Average of {current.length}: {measured}¢</p>}
          <button onClick={again} className="rounded-xl bg-[#2a323b] p-3 font-bold">Again</button>
        </>
      )}
      <label className="flex flex-col gap-1 text-sm text-[#94a0ad]">
        Or type it in instead (0–30¢)
        <input
          type="number"
          min={0}
          max={30}
          step={0.1}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className="rounded-lg bg-[#0e1114] p-2 text-white"
        />
      </label>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 rounded-xl bg-[#2a323b] p-3 font-bold">Cancel</button>
        <button
          disabled={saveValue === null}
          onClick={() => saveValue !== null && onSave(saveValue)}
          className="flex-1 rounded-xl bg-green-500 p-3 font-bold text-black disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  )
}

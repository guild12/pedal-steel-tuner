import { useCallback, useEffect, useRef, useState } from 'react'
import { TunerEngine, type EngineStatus } from '../audio/engine'
import type { Profile } from '../model/types'
import { DisplayFilter, type Shown } from '../pitch/display'

export interface TunerState {
  shown: Shown | null
  status: EngineStatus
  /** Error detail when status is 'error'. */
  detail?: string
  start(deviceId?: string): void
  inputs: { id: string; label: string }[]
  inputLabel: string
  sampleRate: number | null
  /** True while a start() is in flight (disable the Start button). */
  starting: boolean
  /** True when the screen can't be kept awake, so the UI should hint at Auto-Lock. */
  wakeLockMissing: boolean
}

export function useTuner(profile: Profile): TunerState {
  const [shown, setShown] = useState<Shown | null>(null)
  const [status, setStatus] = useState<EngineStatus>('idle')
  const [detail, setDetail] = useState<string>()
  const [inputs, setInputs] = useState<{ id: string; label: string }[]>([])
  const [inputLabel, setInputLabel] = useState('')
  const [sampleRate, setSampleRate] = useState<number | null>(null)
  const [starting, setStarting] = useState(false)
  const [wakeLockMissing, setWakeLockMissing] = useState(false)

  const engine = useRef<TunerEngine | null>(null)
  const filter = useRef(new DisplayFilter())
  const aRef = useRef(profile.aRef)
  aRef.current = profile.aRef
  const lastARef = useRef(profile.aRef)

  const start = useCallback((deviceId?: string) => {
    engine.current ??= new TunerEngine(
      (f) => {
        // A new reference pitch re-reads immediately instead of easing from the old reading.
        if (aRef.current !== lastARef.current) {
          lastARef.current = aRef.current
          filter.current.reset()
        }
        setShown(filter.current.push(f, aRef.current))
      },
      (s, d) => {
        setStatus(s)
        setDetail(d)
        if (s === 'running') {
          // Also fires on device changes, so the input list stays current.
          const e = engine.current
          setInputLabel(e?.inputLabel ?? '')
          setSampleRate(e?.sampleRate ?? null)
          setWakeLockMissing(e?.wakeLockMissing ?? false)
          void e?.inputs().then(setInputs, () => {})
        } else {
          filter.current.reset()
          setShown(null)
        }
      },
    )
    setStarting(true)
    void Promise.resolve(engine.current.start(deviceId)).finally(() => setStarting(false))
  }, [])

  useEffect(
    () => () => {
      engine.current?.stop()
      engine.current = null
    },
    [],
  )

  return { shown, status, detail, start, inputs, inputLabel, sampleRate, starting, wakeLockMissing }
}

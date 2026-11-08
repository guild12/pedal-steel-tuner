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
}

export function useTuner(profile: Profile): TunerState {
  const [shown, setShown] = useState<Shown | null>(null)
  const [status, setStatus] = useState<EngineStatus>('idle')
  const [detail, setDetail] = useState<string>()
  const [inputs, setInputs] = useState<{ id: string; label: string }[]>([])
  const [inputLabel, setInputLabel] = useState('')
  const [sampleRate, setSampleRate] = useState<number | null>(null)

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
          void e?.inputs().then(setInputs, () => {})
        } else {
          filter.current.reset()
          setShown(null)
        }
      },
    )
    void engine.current.start(deviceId)
  }, [])

  useEffect(
    () => () => {
      engine.current?.stop()
      engine.current = null
    },
    [],
  )

  return { shown, status, detail, start, inputs, inputLabel, sampleRate }
}

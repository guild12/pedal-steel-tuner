import { useRef, useState } from 'react'
import { TunerEngine, type EngineStatus } from '../audio/engine'
import { noteFromFrequency } from '../pitch/notes'

const MESSAGES: Partial<Record<EngineStatus, string>> = {
  insecure: 'This page must be opened over https.',
  blocked: 'Microphone access was blocked. Allow it in Settings → Safari → Microphone, then reload.',
  interrupted: 'Listening stopped (the phone locked or another app took the audio). Tap to resume.',
}

// Placeholder UI; replaced by the real tuner in later tasks.
export function App() {
  const [status, setStatus] = useState<EngineStatus>('idle')
  const [detail, setDetail] = useState<string>()
  const [text, setText] = useState('—')
  const engine = useRef<TunerEngine | null>(null)

  function start() {
    engine.current ??= new TunerEngine(
      (f) => {
        if (f.frequency === null) return setText('—')
        const n = noteFromFrequency(f.frequency)
        setText(`${n.name}${n.octave}`)
      },
      (s, d) => {
        setStatus(s)
        setDetail(d)
      },
    )
    void engine.current.start()
  }

  return (
    <main className="mx-auto max-w-105 p-4 text-center">
      {status !== 'running' && (
        <button className="w-full rounded-xl bg-green-500 p-3 font-bold text-black" onClick={start}>
          {status === 'interrupted' ? 'Tap to resume' : 'Start'}
        </button>
      )}
      {(MESSAGES[status] || detail) && (
        <p role="alert" className="mt-3 rounded-xl bg-red-950 p-3 text-left text-red-200">
          {MESSAGES[status] ?? `Couldn't start the input: ${detail}`}
        </p>
      )}
      <div data-testid="note" className="mt-4 text-6xl font-extrabold">{text}</div>
    </main>
  )
}

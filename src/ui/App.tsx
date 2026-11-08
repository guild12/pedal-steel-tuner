import { useState } from 'react'
import type { EngineStatus } from '../audio/engine'
import { sierra14 } from '../model/seeds/sierra14'
import { TunerScreen, type Lock } from './TunerScreen'
import { useTuner } from './useTuner'

const MESSAGES: Partial<Record<EngineStatus, string>> = {
  insecure: 'This page must be opened over https.',
  blocked: 'Microphone access was blocked. Allow it in Settings → Safari → Microphone, then reload.',
  interrupted: 'Listening stopped (the phone locked or another app took the audio). Tap to resume.',
}

export function App() {
  const profile = sierra14
  const { shown, status, detail, start } = useTuner(profile)
  const [lock, setLock] = useState<Lock | null>(null)

  const message =
    status === 'error' ? `Couldn't start the input${detail ? `: ${detail}` : ''}` : MESSAGES[status]

  return (
    <main className="mx-auto max-w-105 p-4">
      {status !== 'running' && (
        <button className="mb-3 w-full rounded-xl bg-green-500 p-3 font-bold text-black" onClick={() => start()}>
          {status === 'interrupted' ? 'Tap to resume' : 'Start'}
        </button>
      )}
      {message && (
        <p role="alert" className="mb-3 rounded-xl bg-red-950 p-3 text-left text-red-200">
          {message}
        </p>
      )}
      <TunerScreen
        profile={profile}
        shown={shown}
        status={status}
        lock={lock}
        onLock={setLock}
        onOpenSettings={() => {}}
      />
    </main>
  )
}

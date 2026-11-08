import { useState } from 'react'
import type { EngineStatus } from '../audio/engine'
import { loadProfile, saveProfile } from '../model/storage'
import type { Profile } from '../model/types'
import { DropWizard } from './DropWizard'
import { lockResolves } from './lock'
import { Settings } from './Settings'
import { TunerScreen, type Lock } from './TunerScreen'
import { useTuner } from './useTuner'

const MESSAGES: Partial<Record<EngineStatus, string>> = {
  insecure: 'This page must be opened over https.',
  blocked: 'Microphone access was blocked. Allow it in Settings → Safari → Microphone, then reload.',
  interrupted: 'Listening stopped (the phone locked or another app took the audio). Tap to resume.',
}

export function App() {
  const [profile, setProfile] = useState<Profile>(loadProfile)
  const [measuring, setMeasuring] = useState(false)
  const { shown, status, detail, start, inputs, inputLabel, starting, wakeLockMissing } = useTuner(profile)
  const [lock, setLock] = useState<Lock | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  // A lock whose string, change or stop was edited away is ignored (and would crash positionTarget).
  const activeLock = lock && lockResolves(profile, lock) ? lock : null

  const update = (p: Profile) => {
    setProfile(p)
    saveProfile(p)
  }

  const message =
    status === 'error' ? `Couldn't start the input${detail ? `: ${detail}` : ''}` : MESSAGES[status]

  return (
    <main className="mx-auto max-w-105 p-4">
      {status !== 'running' && (
        <button
          disabled={starting}
          className="mb-3 w-full rounded-xl bg-green-500 p-3 font-bold text-black disabled:opacity-50"
          onClick={() => start()}
        >
          {status === 'interrupted' ? 'Tap to resume' : 'Start'}
        </button>
      )}
      {status === 'running' && inputLabel && (
        <div className="mb-3 flex items-center justify-between gap-2 text-sm text-[#94a0ad]">
          <span>Input: {inputLabel}</span>
          {inputs.length > 1 && (
            <select
              aria-label="Audio input"
              disabled={starting}
              value={inputs.find((i) => i.label === inputLabel)?.id ?? ''}
              onChange={(e) => start(e.target.value)}
              className="min-w-0 rounded-lg bg-[#0e1114] p-2 text-base text-white"
            >
              {inputs.map((i) => (
                <option key={i.id} value={i.id}>{i.label}</option>
              ))}
            </select>
          )}
        </div>
      )}
      {status === 'running' && wakeLockMissing && (
        <p className="mb-3 text-left text-sm text-amber-300">
          Set Auto-Lock to Never while tuning (Settings → Display &amp; Brightness).
        </p>
      )}
      {message && (
        <p role="alert" className="mb-3 rounded-xl bg-red-950 p-3 text-left text-red-200">
          {message}
        </p>
      )}
      {measuring && (
        <div className="mb-3">
          <DropWizard
            profile={profile}
            shown={shown}
            onSave={(cabinetDrop) => {
              update({ ...profile, cabinetDrop })
              setMeasuring(false)
            }}
            onCancel={() => setMeasuring(false)}
          />
        </div>
      )}
      {settingsOpen ? (
        <Settings profile={profile} shown={shown} onChange={update} onClose={() => setSettingsOpen(false)} />
      ) : (
      <TunerScreen
        profile={profile}
        shown={shown}
        status={status}
        lock={activeLock}
        onLock={setLock}
        onOpenSettings={() => setSettingsOpen(true)}
        onMeasureDrop={() => setMeasuring(true)}
      />
      )}
    </main>
  )
}
